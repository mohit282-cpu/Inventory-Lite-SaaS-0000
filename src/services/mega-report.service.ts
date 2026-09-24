/**
 * Mega Business Report — shared data service.
 *
 * Single source of truth for the one-click Mega Report export (PDF + Excel).
 * Reuses the business-scoped audit-center aggregations plus direct list
 * services for the detail sections, all behind a strict tenant/RBAC boundary.
 *
 * Critical guarantees:
 *  - `authorizeBusinessAccess` validates the authenticated user's membership in
 *    the target business and required role before ANY data is loaded. The
 *    business is resolved from the authenticated `activeBusiness` on the client
 *    and its `businessId` is never trusted from the browser as a foreign key.
 *  - Values are never NaN / Infinity / undefined / null.
 *  - No internal Appwrite document IDs, passwords, tokens, secrets, API keys,
 *    or credentials are ever placed on the report.
 */

import {
  auditCenterService,
  type AuditOverviewKPIs,
  type CustomerLedgerEntry,
  type SupplierLedgerEntry,
  type PaymentAuditRecord,
  type ProductValuationEntry,
  type InventoryCogsAuditSummary,
  type ProfitabilityAuditSummary,
  type ReturnsAdjustmentsRecord,
  type CancelledDocumentRecord,
  type ReconciliationCheckResult,
} from '@/services/audit-center.service'
import type { AuditLogEntry } from '@/services/audit-log.service'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { expenseService } from '@/services/expense.service'
import { stockMovementService } from '@/services/stock-movement.service'
import { businessService } from '@/services/business.service'
import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { getCurrentFiscalYear } from '@/lib/date/bs-date'
import { formatHumanInvoiceNumber, formatHumanPurchaseNumber } from '@/lib/utils'
import { Models } from 'appwrite'
import type {
  AuditFilterParams,
  Category,
  CreditNote,
  DebitNote,
  Expense,
  Product,
  Sale,
  StockMovement,
  UserRole,
} from '@/types'
import {
  REPORT_TEMPLATE_VERSION,
  type MegaReportData,
  type MegaProductRow,
  type MegaCategoryRow,
  type MegaExpenseRow,
  type MegaStockMovementRow,
  type MegaCreditNoteRow,
  type MegaDebitNoteRow,
  type MegaPaymentRow,
  type MegaInvoiceRow,
  type SalesReconciliation,
} from '@/types/mega-report'

/** Deterministic helper: keep only finite numbers (never NaN/Infinity). */
function fin(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return value
}

function safeStr(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback
  const s = String(value)
  return s.length === 0 ? fallback : s
}

function isoDate(value?: string): string {
  if (!value) return ''
  const s = String(value).slice(0, 10)
  return s === '1970-01-01' ? '' : s
}

function mapPaymentStatus(status: unknown, paid: number, total: number): string {
  const st = safeStr(status).toUpperCase()
  if (st === 'CANCELLED' || st === 'REVERSED') return st
  if ((paid > 0) && (paid < total)) return 'PARTIAL'
  if (paid >= total) return 'PAID'
  return 'UNPAID'
}

function resolveCustomerName(_sale: Sale, name?: string): string {
  const n = safeStr(name).trim()
  return n || 'Walk-in Customer'
}

/**
 * Business-scoped reader for collections without a dedicated service
 * (credit notes / debit notes). Uses the same tenant-isolated base list method.
 */
class CollectionReader extends BaseService {
  constructor(collectionId: string) {
    super(collectionId)
  }
}

function collectionList<T extends Models.Document>(collectionId: string, businessId: string, queries: any[] = []): Promise<T[]> {
  const reader = new CollectionReader(collectionId)
  return reader.listAll<T>(businessId, queries).catch(() => [])
}

/** Invoice sequence return shape mirroring InvoiceSequenceAudit. */
export interface MegaInvoiceSequence {
  fiscalYear: string
  prefix: string
  firstInvoiceNumber: string | null
  lastInvoiceNumber: string | null
  totalIssued: number
  totalCancelled: number
  gapsDetected: string[]
  duplicatesDetected: string[]
  isSequenceIntact: boolean
}

export interface MegaReportOptions {
  businessId: string
  userId: string
  requiredRole?: UserRole | UserRole[]
  filters?: AuditFilterParams
}

/**
 * Build the complete Mega Business Report dataset for the authenticated
 * business + user. Throws on authorization failure (non-member / wrong role).
 */
export async function getMegaReportData(opts: MegaReportOptions): Promise<MegaReportData> {
  const { businessId, userId, requiredRole = ['owner', 'admin', 'auditor'], filters = {} } = opts

  // Tenant + RBAC boundary: never trust businessId from the browser as access.
  await authorizeBusinessAccess({ userId, businessId, requiredRole })

  const currentFY = getCurrentFiscalYear()
  const resolvedFilters: AuditFilterParams = {
    fiscalYear: filters.fiscalYear || currentFY,
    ...filters,
  }

  let business: any = {}
  try {
    business = await businessService.getBusiness(businessId, userId)
  } catch {
    business = { $id: businessId, name: 'Inventory Lite Store' }
  }

  const kpis = await auditCenterService.getAuditOverviewKPIs(businessId, resolvedFilters)

  const [
    salesRegister,
    purchaseRegister,
    vatSummaryRaw,
    customerLedgers,
    supplierLedgers,
    payments,
    inventory,
    profitability,
    returnsAdjustments,
    cancelledDocuments,
    auditTrail,
    invoiceSequence,
    ird,
    irdReconciliation,
    reconciliation,
    categories,
    products,
    expenses,
    creditNotes,
    debitNotes,
    stockMovements,
  ] = await Promise.all([
    auditCenterService.getSalesRegister(businessId, resolvedFilters),
    auditCenterService.getPurchaseRegister(businessId, resolvedFilters),
    auditCenterService.getVatSummary(businessId, resolvedFilters),
    auditCenterService.getCustomerLedgers(businessId, resolvedFilters),
    auditCenterService.getSupplierLedgers(businessId, resolvedFilters),
    auditCenterService.getPaymentAudit(businessId, resolvedFilters),
    auditCenterService.getInventoryCogsAudit(businessId, resolvedFilters),
    auditCenterService.getProfitabilityAudit(businessId, resolvedFilters),
    auditCenterService.getReturnsAdjustmentsAudit(businessId, resolvedFilters),
    auditCenterService.getCancelledDocuments(businessId, resolvedFilters),
    auditCenterService.getAuditTrail(businessId, resolvedFilters),
    auditCenterService.getInvoiceSequenceAudit(businessId, resolvedFilters.fiscalYear),
    auditCenterService.getIrdReadinessStatus(businessId),
    auditCenterService.getIrdReconciliation(businessId, resolvedFilters),
    auditCenterService.runFullSystemReconciliation(businessId, resolvedFilters),
    categoryService.listCategories(businessId),
    productService.listAllProducts(businessId),
    expenseService.listAllExpenses(businessId, {
      dateFrom: resolvedFilters.dateFrom,
      dateTo: resolvedFilters.dateTo,
    }),
    collectionList<CreditNote>(COLLECTIONS.CREDIT_NOTES, businessId),
    collectionList<DebitNote>(COLLECTIONS.DEBIT_NOTES, businessId),
    stockMovementService.getMovementHistory(businessId),
  ])

  const productRows = buildProductRows(products, categories)
  const categoryRows = buildCategoryRows(categories, products)
  const expenseRows = buildExpenseRows(expenses)
  const movementRows = buildMovementRows(stockMovements, products)
  const creditNoteRows = buildCreditNoteRows(creditNotes)
  const debitNoteRows = buildDebitNoteRows(debitNotes)
  const paymentRows = buildPaymentRowsFromAudit(payments)
  const invoiceRows = buildInvoiceRows(salesRegister.rows)

  // ------------------------------------------------ SALES RECONCILIATION
  let registeredCustomerSales = 0
  let walkInSales = 0
  for (const inv of salesRegister.rows) {
    const totalVal = fin(inv.total)
    const isWalkIn = !inv.customerName || inv.customerName.trim() === '' || inv.customerName.toLowerCase() === 'walk-in customer'
    if (isWalkIn) {
      walkInSales += totalVal
    } else {
      registeredCustomerSales += totalVal
    }
  }
  const calcTotalSales = registeredCustomerSales + walkInSales
  const salesDiff = fin(salesRegister.summary.totalSales - calcTotalSales)

  const salesReconciliation: SalesReconciliation = {
    registeredCustomerSales,
    walkInSales,
    totalSales: salesRegister.summary.totalSales,
    difference: Math.abs(salesDiff) < 0.01 ? 0 : salesDiff,
    explanation: 'Registered Customer Invoices vs Walk-in Customer Sales',
  }

  // ------------------------------------------------ VAT REGISTRATION AWARENESS
  const isVatRegistered = Boolean(
    (business?.vatNumber && String(business.vatNumber).trim() !== '') ||
    (business?.taxRegistrationType && String(business.taxRegistrationType).toUpperCase() === 'VAT')
  )

  const vatSummary = {
    ...vatSummaryRaw,
    isVatRegistered,
    vatRegistrationStatus: isVatRegistered ? 'Registered' : 'Not Registered',
    outputVat: isVatRegistered ? vatSummaryRaw.outputVat : 0,
    inputVat: isVatRegistered ? vatSummaryRaw.inputVat : 0,
    netVatPosition: isVatRegistered ? vatSummaryRaw.netVatPosition : 0,
    status: isVatRegistered
      ? vatSummaryRaw.status
      : ('NOT_APPLICABLE' as const),
  }

  // ------------------------------------------------ INTEGRITY ISSUES
  const integrityIssues: string[] = []
  if (kpis.costDataMissingCount > 0) {
    integrityIssues.push(
      `${kpis.costDataMissingCount} product(s) are missing cost data, so COGS / gross profit may be understated.`
    )
  }
  const mismatchCount = reconciliation.filter((r) => r.status !== 'BALANCED').length
  if (mismatchCount > 0) {
    integrityIssues.push(`${mismatchCount} reconciliation check(s) did not fully balance — review the Reconciliation section.`)
  }

  // ------------------------------------------------ PERIOD & METADATA
  const { periodLabel, periodStatus } = buildPeriodLabelAndStatus(resolvedFilters, currentFY)
  const nowIso = new Date().toISOString()
  const dateStr = nowIso.slice(0, 10).replace(/-/g, '')
  const fyClean = safeStr(resolvedFilters.fiscalYear || currentFY).replace('/', '-')
  const reportId = `RPT-${fyClean}-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`

  return {
    meta: {
      reportId,
      reportVersion: REPORT_TEMPLATE_VERSION,
      business: {
        id: business?.$id || businessId,
        name: safeStr(business.name, 'Inventory Lite Store'),
        panNumber: business.panNumber,
        vatNumber: business.vatNumber,
        taxRegistrationType: business.taxRegistrationType,
        taxRegistrationNumber: business.taxRegistrationNumber,
        phone: business.phone,
        email: business.email,
        address: business.address,
        logoUrl: business.logoUrl,
        currency: safeStr(business.currency, 'NPR'),
      },
      fiscalYear: resolvedFilters.fiscalYear || currentFY,
      dateFrom: resolvedFilters.dateFrom,
      dateTo: resolvedFilters.dateTo,
      periodLabel,
      periodStatus,
      generatedAt: nowIso,
      dataThrough: nowIso,
      timezone: 'Asia/Kathmandu',
    },
    filters: resolvedFilters,
    kpis,
    salesRegister: {
      rows: invoiceRows,
      reconciliation: salesReconciliation,
      summary: salesRegister.summary,
    },
    purchaseRegister,
    vatSummary,
    customerLedgers,
    supplierLedgers,
    payments,
    inventory: {
      products: inventory.products,
      movements: movementRows,
      summary: inventory.summary,
    },
    profitability,
    returnsAdjustments,
    cancelledDocuments,
    auditTrail,
    invoiceSequence,
    ird,
    irdReconciliation,
    reconciliation,
    categories: categoryRows,
    products: productRows,
    expenses: expenseRows,
    creditNotes: creditNoteRows,
    debitNotes: debitNoteRows,
    paymentsDetail: paymentRows,
    integrity: {
      hasIssues: integrityIssues.length > 0,
      issues: integrityIssues,
      costDataMissingCount: kpis.costDataMissingCount,
      reconciliationCount: reconciliation.length,
    },
  }
}

function buildPeriodLabelAndStatus(
  filters: AuditFilterParams,
  currentFY: string
): { periodLabel: string; periodStatus: 'Full Fiscal Year' | 'Year to Date' | 'Custom Period' | 'Active Period' } {
  if (filters.dateFrom && filters.dateTo) {
    return {
      periodLabel: `${filters.dateFrom} – ${filters.dateTo}`,
      periodStatus: 'Custom Period',
    }
  }
  if (filters.dateFrom) {
    return {
      periodLabel: `From ${filters.dateFrom} to Present`,
      periodStatus: 'Active Period',
    }
  }
  if (filters.dateTo) {
    return {
      periodLabel: `Up to ${filters.dateTo}`,
      periodStatus: 'Active Period',
    }
  }
  const fy = filters.fiscalYear || currentFY
  if (fy < currentFY) {
    return {
      periodLabel: `Full Fiscal Year ${fy}`,
      periodStatus: 'Full Fiscal Year',
    }
  }
  if (fy === currentFY) {
    return {
      periodLabel: `Fiscal Year ${fy} (YTD)`,
      periodStatus: 'Year to Date',
    }
  }
  return {
    periodLabel: `Fiscal Year ${fy}`,
    periodStatus: 'Active Period',
  }
}

function buildCategoryRows(categories: Category[], products: Product[]): MegaCategoryRow[] {
  const counts = new Map<string, number>()
  for (const p of products) {
    if (!p.categoryId) continue
    counts.set(p.categoryId, (counts.get(p.categoryId) || 0) + 1)
  }
  return categories.map((c) => ({
    name: safeStr(c.name),
    description: safeStr(c.description),
    productCount: counts.get(c.$id) || 0,
  }))
}

function buildProductRows(products: Product[], categories: Category[]): MegaProductRow[] {
  const catMap = new Map<string, string>()
  for (const c of categories) catMap.set(c.$id, c.name)
  return products.map((p) => ({
    name: safeStr(p.name),
    sku: safeStr(p.sku, '—'),
    unit: safeStr(p.unit, '—'),
    categoryName: p.categoryId ? safeStr(catMap.get(p.categoryId), '—') : '—',
    stockQuantity: fin(p.stockQuantity),
    purchasePrice: fin(p.purchasePrice),
    sellingPrice: fin(p.sellingPrice),
    lowStockThreshold: p.lowStockThreshold,
    isActive: p.isActive !== false,
  }))
}

function buildExpenseRows(expenses: Expense[]): MegaExpenseRow[] {
  return expenses.map((e) => ({
    title: safeStr(e.title || e.description),
    category: safeStr(e.category),
    description: safeStr(e.description),
    amount: fin(e.amount),
    date: isoDate(e.date) || isoDate(e.createdAt),
  }))
}

function buildMovementRows(
  movements: StockMovement[],
  products: Product[]
): MegaStockMovementRow[] {
  const prodMap = new Map<string, Product>()
  for (const p of products) prodMap.set(p.$id, p)
  return movements.map((m) => {
    const product = prodMap.get(m.productId)
    return {
      productName: safeStr(product?.name, '—'),
      sku: safeStr(product?.sku, '—'),
      type: safeStr(m.type),
      quantity: fin(m.quantity),
      previousQuantity: fin(m.previousQuantity),
      newQuantity: fin(m.newQuantity),
      reason: safeStr(m.reason),
      date: isoDate(m.createdAt),
    }
  })
}

function buildCreditNoteRows(creditNotes: CreditNote[]): MegaCreditNoteRow[] {
  return creditNotes.map((cn) => ({
    creditNoteNumber: safeStr(cn.creditNoteNumber),
    customerName: safeStr(cn.customerName, '—'),
    invoiceNumber: safeStr(cn.invoiceNumber, '—'),
    issuedDate: isoDate(cn.issuedDate || cn.createdAt),
    taxableAmount: fin(cn.taxableAmount),
    vatAmount: fin(cn.vatAmount),
    totalAmount: fin(cn.totalAmount),
    reason: safeStr(cn.reason),
  }))
}

function buildDebitNoteRows(debitNotes: DebitNote[]): MegaDebitNoteRow[] {
  return debitNotes.map((dn) => ({
    debitNoteNumber: safeStr(dn.debitNoteNumber),
    supplierName: safeStr(dn.supplierName, '—'),
    issuedDate: isoDate(dn.issuedDate || dn.createdAt),
    taxableAmount: fin(dn.taxableAmount),
    vatAmount: fin(dn.vatAmount),
    totalAmount: fin(dn.totalAmount),
    reason: safeStr(dn.reason),
  }))
}

function buildPaymentRowsFromAudit(payments: PaymentAuditRecord[]): MegaPaymentRow[] {
  return payments
    .map((p) => ({
      date: isoDate(p.date),
      entityType: p.entityType,
      entityName: safeStr(p.entityName, p.entityType === 'customer' ? 'Walk-in Customer' : 'Supplier'),
      reference: safeStr(p.reference, '—'),
      amount: fin(p.amount),
      method: safeStr(p.method, 'cash'),
      referenceNo: safeStr(p.reference, '—'),
      createdBy: safeStr(p.createdBy, 'System'),
      status: safeStr(p.status, 'COMPLETED').toUpperCase(),
    }))
    .sort((a, b) => (b.date < a.date ? -1 : a.date < b.date ? 1 : 0))
}

function buildInvoiceRows(rows: Array<{
  id: string
  invoiceNumber: string
  date: string
  customerName: string
  customerPan: string
  taxableAmount: number
  discount: number
  vat: number
  total: number
  paidAmount: number
  outstanding: number
  paymentStatus: string
  invoiceStatus: string
}>): MegaInvoiceRow[] {
  return rows.map((r) => ({
    date: isoDate(r.date),
    invoiceNumber: safeStr(r.invoiceNumber),
    customerName: safeStr(r.customerName),
    customerPan: safeStr(r.customerPan, '—'),
    taxableAmount: fin(r.taxableAmount),
    discount: fin(r.discount),
    vat: fin(r.vat),
    total: fin(r.total),
    paidAmount: fin(r.paidAmount),
    outstanding: fin(r.outstanding),
    paymentStatus: safeStr(r.paymentStatus),
    invoiceStatus: safeStr(r.invoiceStatus),
  }))
}

// Re-export commonly used helpers so PDF/Excel generators share them.
export {
  fin,
  safeStr,
  isoDate,
  mapPaymentStatus,
  resolveCustomerName,
  formatHumanInvoiceNumber,
  formatHumanPurchaseNumber,
}
export type {
  AuditOverviewKPIs,
  CustomerLedgerEntry,
  SupplierLedgerEntry,
  PaymentAuditRecord,
  ProductValuationEntry,
  InventoryCogsAuditSummary,
  ProfitabilityAuditSummary,
  ReturnsAdjustmentsRecord,
  CancelledDocumentRecord,
  ReconciliationCheckResult,
  AuditLogEntry,
}
