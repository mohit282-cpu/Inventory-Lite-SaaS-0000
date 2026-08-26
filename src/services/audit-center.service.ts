import { saleService } from './sale.service'
import { saleItemService } from './sale-item.service'
import { purchaseService } from './purchase.service'
import { customerService } from './customer.service'
import { supplierService } from './supplier.service'
import { productService } from './product.service'
import { stockMovementService } from './stock-movement.service'
import { salesReturnService } from './sales-return.service'
import { auditLogService, AuditLogEntry } from './audit-log.service'
import { expenseService } from './expense.service'
import { businessService } from './business.service'
import {
  AuditFilterParams,
  IrdReadinessStatus,
  IrdReconciliationItem,
  InvoiceSequenceAudit,
} from '@/types'
import { getCurrentFiscalYear, bsToAD } from '@/lib/date/bs-date'
import { calculateNetVatPosition } from '@/lib/vat-engine'
import { toMinorUnits, fromMinorUnits } from '@/lib/money'
import { formatHumanInvoiceNumber, formatHumanPurchaseNumber } from '@/lib/utils'
import { calendarService } from './calendar.service'

/**
 * Convert a BS fiscal year label like "2079/80" into AD ISO date bounds.
 * Nepal FY: Shrawan 1 (BS Month 4, Day 1) → Ashadh last day (BS Month 3) of next year.
 * Returns { dateFrom, dateTo } as "YYYY-MM-DD" strings (AD Gregorian).
 */
function resolveFiscalYearDateRange(fiscalYear: string): { dateFrom: string; dateTo: string } | null {
  if (!fiscalYear) return null
  // Expect format "2079/80" or "79/80"
  const parts = fiscalYear.split('/')
  if (parts.length !== 2) return null

  // Handle both "2079/80" and "79/80"
  let bsStart = parseInt(parts[0], 10)
  if (isNaN(bsStart)) return null
  // If short year (e.g. 79), prefix with 20
  if (bsStart < 100) bsStart = 2000 + bsStart
  const bsEnd = bsStart + 1

  try {
    // Shrawan 1 of bsStart = FY start
    const adStart = bsToAD(bsStart, 4, 1)
    adStart.setHours(0, 0, 0, 0)

    // Ashadh last day of bsEnd = FY end
    const ashadhDays = calendarService.getBSMonthDays(bsEnd, 3)
    const adEnd = bsToAD(bsEnd, 3, ashadhDays)
    adEnd.setHours(23, 59, 59, 999)

    const toISO = (d: Date) => d.toISOString().slice(0, 10) // "YYYY-MM-DD"
    return { dateFrom: toISO(adStart), dateTo: toISO(adEnd) }
  } catch {
    return null
  }
}

/**
 * Merge fiscal year date bounds into filters.
 * If user also picked explicit dateFrom/dateTo, those take precedence (they narrow inside the FY).
 */
function resolveFilters(filters?: AuditFilterParams): AuditFilterParams {
  if (!filters) return {}
  if (!filters.fiscalYear) return filters

  const fyRange = resolveFiscalYearDateRange(filters.fiscalYear)
  if (!fyRange) return filters

  return {
    ...filters,
    // Use explicit dates if provided (they narrow within FY), else use FY bounds
    dateFrom: filters.dateFrom || fyRange.dateFrom,
    dateTo: filters.dateTo || fyRange.dateTo,
  }
}

export interface AuditOverviewKPIs {
  totalSales: number
  totalSalesCount: number
  totalBills: number
  totalPurchases: number
  totalPurchaseCount: number
  purchaseReturns: number
  salesReturns: number
  outputVat: number
  inputVat: number
  netVatPosition: number
  outstandingCustomerCredit: number
  customerOverpayments: number
  supplierPayables: number
  supplierOverpayments: number
  stockValue: number
  cogs: number
  grossProfit: number
  expenses: number
  netProfit: number
  costDataMissingCount: number
}

export interface CustomerLedgerEntry {
  customerId: string
  customerName: string
  panNumber?: string
  phone?: string
  openingBalance: number
  invoicesTotal: number
  paymentsTotal: number
  creditNotesTotal: number
  returnsTotal: number
  closingBalance: number
  overpaymentCredit: number
  outstandingAmount: number
  creditLimit: number
  availableCredit: number
  reconciliationStatus: 'BALANCED' | 'OVERPAID' | 'OUTSTANDING_DUE'
  aging: {
    days0To30: number
    days31To60: number
    days61To90: number
    days90Plus: number
  }
}

export interface SupplierLedgerEntry {
  supplierId: string
  supplierName: string
  panNumber?: string
  phone?: string
  openingPayable: number
  purchasesTotal: number
  paymentsTotal: number
  purchaseReturnsTotal: number
  adjustmentsTotal: number
  closingPayable: number
  overpaymentCredit: number
  reconciliationStatus: 'BALANCED' | 'OVERPAID' | 'OUTSTANDING_PAYABLE'
  aging: {
    days0To30: number
    days31To60: number
    days61To90: number
    days90Plus: number
  }
}

export interface PaymentAuditRecord {
  id: string
  date: string
  entityType: 'customer' | 'supplier'
  entityId?: string
  entityName: string
  reference: string
  amount: number
  method: string
  transactionReference?: string
  createdBy?: string
  status: 'COMPLETED' | 'PARTIAL' | 'REVERSED' | 'CANCELLED' | 'UNALLOCATED PAYMENT'
  notes?: string
}

export interface ProductValuationEntry {
  productId: string
  name: string
  sku: string
  categoryName?: string
  stockQuantity: number
  unitCost: number
  closingInventoryValue: number
  sellingPrice: number
  retailValue: number
  potentialGrossMargin: number
  potentialGrossMarginPercent: number
  isCostMissing: boolean
}

export interface InventoryCogsAuditSummary {
  openingStockValue: number
  stockInValue: number
  positiveAdjustmentsValue: number
  returnsValue: number
  salesValue: number
  stockOutValue: number
  damagedValue: number
  closingStockValue: number
  totalRetailValue: number
  totalPotentialMargin: number
  potentialGrossMarginPercent: number
  totalCogs: number
  lowStockCount: number
  outOfStockCount: number
  costDataMissingCount: number
  movementsCount: number
}

export interface ProfitabilityAuditSummary {
  grossSales: number
  discounts: number
  salesReturns: number
  netSales: number
  cogs: number
  costDataMissingCount: number
  grossProfit: number
  grossMarginPercent: number
  expenses: number
  netProfit: number
  netMarginPercent: number
}

export interface ReturnsAdjustmentsRecord {
  id: string
  originalDocumentNumber: string
  date: string
  type: 'SALES_RETURN' | 'PURCHASE_RETURN' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'INVENTORY_ADJUSTMENT' | 'PAYMENT_REVERSAL'
  amount: number
  reason: string
  user: string
  timestamp: string
  stockImpact: string
  ledgerImpact: string
}

export interface CancelledDocumentRecord {
  id: string
  documentType: 'INVOICE' | 'PAYMENT' | 'SALE' | 'PURCHASE'
  originalNumber: string
  date: string
  amount: number
  partyName: string
  reason: string
  cancelledBy: string
  cancelledAt: string
}

export interface ReconciliationCheckResult {
  id: string
  checkName: string
  category: 'SALES' | 'VAT' | 'INVENTORY' | 'CUSTOMER_LEDGER' | 'SUPPLIER_LEDGER' | 'PAYMENT' | 'GENERAL_LEDGER'
  expected: number
  actual: number
  difference: number
  status: 'BALANCED' | 'MISMATCH' | 'WARNING'
  message: string
}

export class AuditCenterService {
  /**
   * Filter items by date range / parameters
   */
  private applyFilters<T extends {
    createdAt?: string
    date?: string
    issuedDate?: string
    purchaseDate?: string
    fiscalYear?: string
    customerId?: string
    supplierId?: string
    status?: string
    paymentMethod?: string
    paymentStatus?: string
  }>(
    items: T[],
    filters?: AuditFilterParams
  ): T[] {
    if (!filters) return items

    return items.filter((item) => {
      const dateStr = item.purchaseDate || item.issuedDate || item.date || item.createdAt

      // Date range filter
      if (dateStr) {
        const datePart = dateStr.slice(0, 10)
        if (filters.dateFrom && datePart < filters.dateFrom) return false
        if (filters.dateTo && datePart > filters.dateTo) return false
      }

      // Month filter
      if (filters.month && dateStr) {
        const itemMonth = dateStr.slice(0, 7)
        if (itemMonth !== filters.month) return false
      }

      // Fiscal Year filter
      if (filters.fiscalYear && item.fiscalYear && item.fiscalYear !== filters.fiscalYear) return false

      // Customer filter
      if (filters.customerId && item.customerId !== undefined && item.customerId !== filters.customerId) return false

      // Supplier filter
      if (filters.supplierId && item.supplierId !== undefined && item.supplierId !== filters.supplierId) return false

      // Document status filter
      if (filters.documentStatus && filters.documentStatus !== 'all') {
        const itemStatus = (item.status || '').toLowerCase()
        if (filters.documentStatus === 'completed' && itemStatus !== 'completed' && itemStatus !== 'issued' && itemStatus !== 'active') return false
        if (filters.documentStatus === 'cancelled' && itemStatus !== 'cancelled' && itemStatus !== 'voided') return false
        if (filters.documentStatus === 'pending' && itemStatus !== 'pending' && itemStatus !== 'draft') return false
      }

      // Payment method filter
      if (filters.paymentMethod && item.paymentMethod !== undefined && item.paymentMethod !== filters.paymentMethod) return false

      return true
    })
  }

  /**
   * 1. Overview KPIs (Single Source of Truth)
   */
  async getAuditOverviewKPIs(businessId: string, filters?: AuditFilterParams): Promise<AuditOverviewKPIs> {
    const f = resolveFilters(filters)
    const [sales, purchases, salesReturns, customers, suppliers, products, expenses] = await Promise.all([
      saleService.listAllSales(businessId, { dateFrom: f.dateFrom, dateTo: f.dateTo, customerId: f.customerId }),
      purchaseService.listAllPurchases(businessId),
      salesReturnService.listAllSalesReturns(businessId),
      customerService.listAllCustomers(businessId),
      supplierService.listAllSuppliers(businessId),
      productService.listAllProducts(businessId),
      expenseService.listAllExpenses(businessId, { dateFrom: f.dateFrom, dateTo: f.dateTo }),
    ])

    const filteredSales = this.applyFilters(sales, f)
    const filteredPurchases = this.applyFilters(purchases, f)
    const filteredReturns = this.applyFilters(salesReturns, f)
    const filteredExpenses = this.applyFilters(expenses, f)

    // Scope customers/suppliers to filter if selected
    const scopedCustomers = f.customerId
      ? customers.filter((c) => c.$id === f.customerId)
      : customers
    const scopedSuppliers = f.supplierId
      ? suppliers.filter((s) => s.$id === f.supplierId)
      : suppliers

    let totalSales = 0
    let outputVat = 0
    let cogs = 0
    let totalSalesCount = 0
    let costDataMissingCount = 0

    // Map products for WAC cost lookup
    const productCostMap = new Map<string, number>()
    for (const p of products) {
      productCostMap.set(p.$id, p.costPrice || p.purchasePrice || 0)
    }

    // Fetch all sale items in batch for COGS computation
    const nonCancelledSales = filteredSales.filter((s) => s.status !== 'cancelled')
    const allSaleItems: any[] = []
    await Promise.all(
      nonCancelledSales.map(async (s) => {
        try {
          const items = await saleItemService.listSaleItems(s.$id, businessId)
          for (const item of items) {
            allSaleItems.push({ ...item, _saleId: s.$id })
          }
        } catch {}
      })
    )
    const saleItemsBySale = new Map<string, any[]>()
    for (const item of allSaleItems) {
      const existing = saleItemsBySale.get(item._saleId) || []
      existing.push(item)
      saleItemsBySale.set(item._saleId, existing)
    }

    for (const sale of filteredSales) {
      if (sale.status === 'cancelled') continue
      totalSalesCount += 1
      totalSales += sale.total || 0

      // Output VAT: use stored tax field on sale record (computed at sale creation)
      outputVat += sale.tax || 0

      // WAC COGS computation from sale items
      const items = saleItemsBySale.get(sale.$id) || []
      for (const item of items) {
        const wac = productCostMap.get(item.productId) || 0
        if (wac <= 0) {
          costDataMissingCount += 1
        }
        cogs += wac * (item.quantity || 0)
      }
    }

    let totalPurchases = 0
    let inputVat = 0
    let totalPurchaseCount = 0

    for (const purch of filteredPurchases) {
      if ((purch as any).status === 'cancelled') continue
      totalPurchaseCount += 1
      totalPurchases += purch.total || 0
      inputVat += purch.tax || 0
    }

    let salesReturnsAmount = 0
    for (const ret of filteredReturns) {
      salesReturnsAmount += ret.totalAmount || 0
    }

    const purchaseReturns = 0
    const netVatCalc = calculateNetVatPosition(outputVat, inputVat)

    // Customer Receivables & Overpayments
    let outstandingCustomerCredit = 0
    let customerOverpayments = 0
    for (const c of scopedCustomers) {
      const custSales = filteredSales.filter((s) => s.customerId === c.$id && s.status !== 'cancelled')
      const totalInv = custSales.reduce((sum, s) => sum + (s.total || 0), 0)
      const totalPaid = custSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0)
      const balance = c.dueAmount ?? Math.max(0, totalInv - totalPaid)

      if (totalPaid > totalInv) {
        customerOverpayments += totalPaid - totalInv
      } else {
        outstandingCustomerCredit += balance
      }
    }

    // Supplier Payables & Overpayments
    let supplierPayables = 0
    let supplierOverpayments = 0
    for (const s of scopedSuppliers) {
      const suppPurchases = filteredPurchases.filter((p) => p.supplierId === s.$id)
      const totalPurch = suppPurchases.reduce((sum, p) => sum + (p.total || 0), 0)
      const totalPaid = suppPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0)
      const balance = s.totalPayable ?? Math.max(0, totalPurch - totalPaid)

      if (totalPaid > totalPurch) {
        supplierOverpayments += totalPaid - totalPurch
      } else {
        supplierPayables += balance
      }
    }

    // Inventory Valuation using WAC
    const stockValue = products.reduce((sum, p) => sum + (p.stockQuantity || 0) * (p.costPrice || p.purchasePrice || 0), 0)
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const netSales = Math.max(0, totalSales - salesReturnsAmount)
    const grossProfit = netSales - cogs
    const netProfit = grossProfit - totalExpenses

    return {
      totalSales,
      totalSalesCount,
      totalBills: totalSalesCount,
      totalPurchases,
      totalPurchaseCount,
      purchaseReturns,
      salesReturns: salesReturnsAmount,
      outputVat: netVatCalc.outputVat,
      inputVat: netVatCalc.inputVat,
      netVatPosition: netVatCalc.netVatPosition,
      outstandingCustomerCredit,
      customerOverpayments,
      supplierPayables,
      supplierOverpayments,
      stockValue,
      cogs,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      costDataMissingCount,
    }
  }

  /**
   * 2. Sales Register (Human-Readable Invoice Numbers)
   */
  async getSalesRegister(businessId: string, filters?: AuditFilterParams) {
    const f = resolveFilters(filters)
    const [sales, allCustomers] = await Promise.all([
      saleService.listAllSales(businessId, { dateFrom: f.dateFrom, dateTo: f.dateTo, customerId: f.customerId }),
      customerService.listAllCustomers(businessId),
    ])
    const filtered = this.applyFilters(sales, f)
      .filter((s) => !f.customerId || s.customerId === f.customerId)

    const customerMap = new Map<string, any>()
    for (const c of allCustomers) {
      customerMap.set(c.$id, c)
    }

    let totalInvoices = 0
    let totalSales = 0
    let totalDiscount = 0
    let totalTaxable = 0
    let totalVat = 0
    let totalCancelled = 0

    const rows = filtered.map((s) => {
      const formattedInvoiceNumber = formatHumanInvoiceNumber(s)
      const cust = s.customerId ? customerMap.get(s.customerId) : null
      const customerName = cust?.name || 'Walk-in Customer'
      const customerPan = cust?.panNumber || 'N/A'

      const discount = s.discount || 0
      const taxableAmount = s.taxableAmount || Math.max(0, (s.subtotal || 0) - discount)
      const vat = s.tax || 0

      let paymentStatus = 'UNPAID'
      if (s.status === 'cancelled') {
        paymentStatus = 'CANCELLED'
      } else if ((s.dueAmount || 0) <= 0) {
        paymentStatus = 'PAID'
      } else if ((s.paidAmount || 0) > 0) {
        paymentStatus = 'PARTIAL'
      }

      if (s.status === 'cancelled') {
        totalCancelled += 1
      } else {
        totalInvoices += 1
        totalSales += s.total || 0
        totalDiscount += discount
        totalTaxable += taxableAmount
        totalVat += vat
      }

      return {
        id: s.$id,
        invoiceNumber: formattedInvoiceNumber,
        date: s.createdAt ? s.createdAt.slice(0, 10) : '',
        customerName,
        customerPan,
        taxableAmount,
        discount,
        vat,
        total: s.total || 0,
        paidAmount: s.paidAmount || 0,
        outstanding: s.dueAmount || 0,
        paymentStatus,
        invoiceStatus: s.status || 'completed',
        createdBy: s.createdBy || 'System',
        createdAt: s.createdAt || new Date().toISOString(),
        cbmsStatus: 'NOT_CONFIGURED',
      }
    })

    return {
      rows,
      summary: {
        totalInvoices,
        totalSales,
        totalDiscount,
        totalTaxableAmount: totalTaxable,
        totalVat,
        totalCancelled,
      },
    }
  }

  /**
   * 3. Purchase Register (Human-Readable Purchase Numbers)
   */
  async getPurchaseRegister(businessId: string, filters?: AuditFilterParams) {
    const f = resolveFilters(filters)
    const [purchases, allSuppliers] = await Promise.all([
      purchaseService.listAllPurchases(businessId, {
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
        supplierId: f.supplierId,
      }),
      supplierService.listAllSuppliers(businessId),
    ])
    const filtered = this.applyFilters(purchases, f)
      .filter((p) => !f.supplierId || p.supplierId === f.supplierId)

    const supplierMap = new Map<string, any>()
    for (const s of allSuppliers) {
      supplierMap.set(s.$id, s)
    }

    let totalPurchases = 0
    let taxablePurchases = 0
    let inputVat = 0

    const rows = filtered.map((p) => {
      const supp = supplierMap.get(p.supplierId)
      const supplierName = supp?.name || 'Unknown Supplier'
      const supplierPan = supp?.panVatNumber || 'N/A'

      const discount = p.discount || 0
      const taxableAmount = p.subtotal ? Math.max(0, p.subtotal - discount) : 0
      const vat = p.tax || 0

      let paymentStatus = 'UNPAID'
      if (p.status === 'cancelled') {
        paymentStatus = 'CANCELLED'
      } else if ((p.dueAmount || 0) <= 0) {
        paymentStatus = 'PAID'
      } else if ((p.paidAmount || 0) > 0) {
        paymentStatus = 'PARTIAL'
      }

      totalPurchases += p.total || 0
      taxablePurchases += taxableAmount
      inputVat += vat

      return {
        id: p.$id,
        purchaseReference: formatHumanPurchaseNumber(p),
        date: p.purchaseDate || (p.createdAt ? p.createdAt.slice(0, 10) : ''),
        supplierName,
        supplierPan,
        taxableAmount,
        discount,
        vatAmount: vat,
        total: p.total || 0,
        paidAmount: p.paidAmount || 0,
        outstanding: p.dueAmount || 0,
        paymentStatus,
        returnStatus: 'NONE',
        createdBy: p.createdBy || 'System',
        createdAt: p.createdAt || new Date().toISOString(),
      }
    })

    return {
      rows,
      summary: {
        totalPurchases,
        taxablePurchases,
        inputVat,
      },
    }
  }

  /**
   * 4. VAT Summary Statement (Centralized Tax Engine)
   */
  async getVatSummary(businessId: string, filters?: AuditFilterParams) {
    const f = resolveFilters(filters)
    const kpis = await this.getAuditOverviewKPIs(businessId, f)

    return {
      taxableSales: kpis.totalSales - kpis.outputVat,
      nonTaxableSales: 0,
      outputVat: kpis.outputVat,
      taxablePurchases: kpis.totalPurchases - kpis.inputVat,
      nonTaxablePurchases: 0,
      inputVat: kpis.inputVat,
      netVatPosition: kpis.netVatPosition,
      vatRate: 13,
      status: kpis.outputVat >= kpis.inputVat ? ('PAYABLE' as const) : ('REFUNDABLE_CREDIT' as const),
    }
  }

  /**
   * 5. Customer Ledger & Aging (Handles Customer Overpayments / Credits)
   */
  async getCustomerLedgers(businessId: string, filters?: AuditFilterParams): Promise<CustomerLedgerEntry[]> {
    const f = resolveFilters(filters)
    const [allCustomers, sales, salesReturns] = await Promise.all([
      customerService.listAllCustomers(businessId),
      saleService.listAllSales(businessId, { dateFrom: f.dateFrom, dateTo: f.dateTo }),
      salesReturnService.listAllSalesReturns(businessId),
    ])

    // Filter to selected customer if specified
    const customers = f.customerId
      ? allCustomers.filter((c) => c.$id === f.customerId)
      : allCustomers

    // Apply date/fiscal year filters to sales
    const filteredSales = this.applyFilters(sales, { ...f, customerId: undefined, supplierId: undefined, documentStatus: undefined })

    return customers.map((c) => {
      const custSales = filteredSales.filter((s) => s.customerId === c.$id && s.status !== 'cancelled')
      const custReturns = salesReturns.filter((r) => r.customerId === c.$id)

      const invoicesTotal = custSales.reduce((sum, s) => sum + (s.total || 0), 0)
      const paymentsTotal = custSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0)
      const returnsTotal = custReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0)

      const netReceivableP = toMinorUnits(invoicesTotal) - toMinorUnits(paymentsTotal) - toMinorUnits(returnsTotal)
      let closingBalance = 0
      let overpaymentCredit = 0
      let reconciliationStatus: 'BALANCED' | 'OVERPAID' | 'OUTSTANDING_DUE' = 'BALANCED'

      if (netReceivableP > 0) {
        closingBalance = fromMinorUnits(netReceivableP)
        reconciliationStatus = 'OUTSTANDING_DUE'
      } else if (netReceivableP < 0) {
        overpaymentCredit = fromMinorUnits(Math.abs(netReceivableP))
        reconciliationStatus = 'OVERPAID'
      }

      const now = new Date().getTime()
      let days0To30 = 0
      let days31To60 = 0
      let days61To90 = 0
      let days90Plus = 0

      for (const s of custSales) {
        const due = (s.total || 0) - (s.paidAmount || 0)
        if (due <= 0) continue
        const dateMs = new Date(s.createdAt).getTime()
        const diffDays = Math.floor((now - dateMs) / (1000 * 60 * 60 * 24))

        if (diffDays <= 30) days0To30 += due
        else if (diffDays <= 60) days31To60 += due
        else if (diffDays <= 90) days61To90 += due
        else days90Plus += due
      }

      const creditLimit = c.creditLimit || 0

      return {
        customerId: c.$id,
        customerName: c.name,
        panNumber: c.panNumber,
        phone: c.phone,
        openingBalance: 0,
        invoicesTotal,
        paymentsTotal,
        creditNotesTotal: 0,
        returnsTotal,
        closingBalance,
        overpaymentCredit,
        outstandingAmount: closingBalance,
        creditLimit,
        availableCredit: Math.max(0, creditLimit - closingBalance),
        reconciliationStatus,
        aging: {
          days0To30,
          days31To60,
          days61To90,
          days90Plus,
        },
      }
    })
  }

  /**
   * 6. Supplier Ledger & Aging (Handles Supplier Overpayments / Credits)
   */
  async getSupplierLedgers(businessId: string, filters?: AuditFilterParams): Promise<SupplierLedgerEntry[]> {
    const f = resolveFilters(filters)
    const [allSuppliers, purchases] = await Promise.all([
      supplierService.listAllSuppliers(businessId),
      purchaseService.listAllPurchases(businessId, {
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
        supplierId: f.supplierId,
      }),
    ])

    // Filter to selected supplier if specified
    const suppliers = f.supplierId
      ? allSuppliers.filter((s) => s.$id === f.supplierId)
      : allSuppliers

    // Apply date/fiscal year filters to purchases
    const filteredPurchases = this.applyFilters(purchases, { ...f, customerId: undefined, supplierId: undefined, documentStatus: undefined })

    return suppliers.map((s) => {
      const suppPurchases = filteredPurchases.filter((p) => p.supplierId === s.$id)
      const purchasesTotal = suppPurchases.reduce((sum, p) => sum + (p.total || 0), 0)
      const paymentsTotal = suppPurchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0)

      const netPayableP = toMinorUnits(purchasesTotal) - toMinorUnits(paymentsTotal)
      let closingPayable = 0
      let overpaymentCredit = 0
      let reconciliationStatus: 'BALANCED' | 'OVERPAID' | 'OUTSTANDING_PAYABLE' = 'BALANCED'

      if (netPayableP > 0) {
        closingPayable = fromMinorUnits(netPayableP)
        reconciliationStatus = 'OUTSTANDING_PAYABLE'
      } else if (netPayableP < 0) {
        overpaymentCredit = fromMinorUnits(Math.abs(netPayableP))
        reconciliationStatus = 'OVERPAID'
      }

      const now = new Date().getTime()
      let days0To30 = 0
      let days31To60 = 0
      let days61To90 = 0
      let days90Plus = 0

      for (const p of suppPurchases) {
        const due = (p.total || 0) - (p.paidAmount || 0)
        if (due <= 0) continue
        const dateMs = new Date(p.createdAt).getTime()
        const diffDays = Math.floor((now - dateMs) / (1000 * 60 * 60 * 24))

        if (diffDays <= 30) days0To30 += due
        else if (diffDays <= 60) days31To60 += due
        else if (diffDays <= 90) days61To90 += due
        else days90Plus += due
      }

      return {
        supplierId: s.$id,
        supplierName: s.name,
        panNumber: s.panNumber,
        phone: s.phone,
        openingPayable: 0,
        purchasesTotal,
        paymentsTotal,
        purchaseReturnsTotal: 0,
        adjustmentsTotal: 0,
        closingPayable,
        overpaymentCredit,
        reconciliationStatus,
        aging: {
          days0To30,
          days31To60,
          days61To90,
          days90Plus,
        },
      }
    })
  }

  /**
   * 7. Payment Audit & Human-Readable References
   */
  async getPaymentAudit(businessId: string, filters?: AuditFilterParams): Promise<PaymentAuditRecord[]> {
    const f = resolveFilters(filters)
    const [sales, purchases, allCustomers, allSuppliers] = await Promise.all([
      saleService.listAllSales(businessId, { dateFrom: f.dateFrom, dateTo: f.dateTo, customerId: f.customerId }),
      purchaseService.listAllPurchases(businessId, {
        dateFrom: f.dateFrom,
        dateTo: f.dateTo,
        supplierId: f.supplierId,
      }),
      customerService.listAllCustomers(businessId),
      supplierService.listAllSuppliers(businessId),
    ])

    const customerMap = new Map<string, any>()
    for (const c of allCustomers) customerMap.set(c.$id, c)
    const supplierMap = new Map<string, any>()
    for (const s of allSuppliers) supplierMap.set(s.$id, s)

    const filteredSales = this.applyFilters(sales, f)
      .filter((s) => !f.customerId || s.customerId === f.customerId)
    const filteredPurchases = this.applyFilters(purchases, { ...f, customerId: undefined })
      .filter((p) => !f.supplierId || p.supplierId === f.supplierId)

    const records: PaymentAuditRecord[] = []

    for (const s of filteredSales) {
      if (s.paidAmount && s.paidAmount > 0) {
        const cust = s.customerId ? customerMap.get(s.customerId) : null
        let paymentStatus: PaymentAuditRecord['status'] = 'COMPLETED'
        if (s.status === 'cancelled') {
          paymentStatus = 'CANCELLED'
        } else if ((s.dueAmount || 0) > 0 && (s.paidAmount || 0) < (s.total || 0)) {
          paymentStatus = 'PARTIAL'
        }
        records.push({
          id: `pay_sale_${s.$id}`,
          date: s.createdAt ? s.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
          entityType: 'customer',
          entityId: s.customerId,
          entityName: cust?.name || 'Walk-in Customer',
          reference: formatHumanInvoiceNumber(s),
          amount: s.paidAmount,
          method: s.paymentMethod || 'cash',
          createdBy: s.createdBy || 'System',
          status: paymentStatus,
        })
      }
    }

    for (const p of filteredPurchases) {
      if (p.paidAmount && p.paidAmount > 0) {
        const supp = supplierMap.get(p.supplierId)
        records.push({
          id: `pay_purch_${p.$id}`,
          date: p.purchaseDate || (p.createdAt ? p.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
          entityType: 'supplier',
          entityId: p.supplierId,
          entityName: supp?.name || 'Supplier',
          reference: formatHumanPurchaseNumber(p),
          amount: p.paidAmount,
          method: p.paymentMethod || 'bank_transfer',
          createdBy: p.createdBy || 'System',
          status: 'COMPLETED',
        })
      }
    }

    // Filter by payment method if specified
    const methodFiltered = f.paymentMethod
      ? records.filter((r) => r.method === f.paymentMethod)
      : records

    return methodFiltered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * 8. Inventory Valuation, Retail Value & WAC COGS Audit
   */
  async getInventoryCogsAudit(businessId: string, _filters?: AuditFilterParams): Promise<{
    products: ProductValuationEntry[]
    movements: any[]
    summary: InventoryCogsAuditSummary
  }> {
    const [products, stockMovements] = await Promise.all([
      productService.listAllProducts(businessId),
      stockMovementService.getMovementHistory(businessId),
    ])

    let closingStockValue = 0
    let totalRetailValue = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let costDataMissingCount = 0

    const productValuationList: ProductValuationEntry[] = products.map((p) => {
      const unitCost = p.costPrice || p.purchasePrice || 0
      const isCostMissing = unitCost <= 0
      if (isCostMissing) {
        costDataMissingCount += 1
      }
      const qty = Math.max(0, p.stockQuantity || 0)
      const closingVal = qty * unitCost
      const sellingPrice = p.sellingPrice || 0
      const retailVal = qty * sellingPrice
      const potMargin = Math.max(0, retailVal - closingVal)
      const potMarginPct = retailVal > 0 ? (potMargin / retailVal) * 100 : 0

      closingStockValue += closingVal
      totalRetailValue += retailVal

      if (qty <= 0) {
        outOfStockCount += 1
      } else if (qty <= (p.lowStockThreshold || 5)) {
        lowStockCount += 1
      }

      return {
        productId: p.$id,
        name: p.name,
        sku: p.sku || 'N/A',
        stockQuantity: qty,
        unitCost,
        closingInventoryValue: closingVal,
        sellingPrice,
        retailValue: retailVal,
        potentialGrossMargin: potMargin,
        potentialGrossMarginPercent: potMarginPct,
        isCostMissing,
      }
    })

    const totalPotentialMargin = Math.max(0, totalRetailValue - closingStockValue)
    const potentialGrossMarginPercent = totalRetailValue > 0 ? (totalPotentialMargin / totalRetailValue) * 100 : 0

    // Compute inventory movement summary from actual stock movements
    let stockInValue = 0
    let stockOutValue = 0
    let positiveAdjustmentsValue = 0
    let returnsValue = 0
    let damagedValue = 0

    for (const m of stockMovements) {
      const product = products.find((p) => p.$id === m.productId)
      const unitCost = product?.costPrice || product?.purchasePrice || 0
      const movementValue = (m.quantity || 0) * unitCost

      if (m.type === 'stock_in') {
        if (m.reason && (m.reason.toLowerCase().includes('return') || m.reason.toLowerCase().includes('restock'))) {
          returnsValue += movementValue
        } else {
          stockInValue += movementValue
        }
      } else if (m.type === 'stock_out') {
        if (m.reason && (m.reason.toLowerCase().includes('damage') || m.reason.toLowerCase().includes('expired'))) {
          damagedValue += movementValue
        } else {
          stockOutValue += movementValue
        }
      } else if (m.type === 'adjustment') {
        const delta = (m.newQuantity || 0) - (m.previousQuantity || 0)
        if (delta > 0) {
          positiveAdjustmentsValue += delta * unitCost
        }
      }
    }

    return {
      products: productValuationList,
      movements: stockMovements,
      summary: {
        openingStockValue: closingStockValue + stockOutValue - stockInValue - returnsValue,
        stockInValue,
        positiveAdjustmentsValue,
        returnsValue,
        salesValue: stockOutValue,
        stockOutValue,
        damagedValue,
        closingStockValue,
        totalRetailValue,
        totalPotentialMargin,
        potentialGrossMarginPercent,
        totalCogs: stockOutValue,
        lowStockCount,
        outOfStockCount,
        costDataMissingCount,
        movementsCount: stockMovements.length,
      },
    }
  }

  /**
   * 9. Profitability Audit (P&L Waterfall)
   */
  async getProfitabilityAudit(businessId: string, filters?: AuditFilterParams): Promise<ProfitabilityAuditSummary> {
    const f = resolveFilters(filters)
    const kpis = await this.getAuditOverviewKPIs(businessId, f)

    const grossSales = kpis.totalSales
    const netSales = Math.max(0, kpis.totalSales - kpis.salesReturns)
    const grossProfit = kpis.grossProfit
    const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0
    const netProfit = kpis.netProfit
    const netMarginPercent = netSales > 0 ? (netProfit / netSales) * 100 : 0

    return {
      grossSales,
      discounts: 0,
      salesReturns: kpis.salesReturns,
      netSales,
      cogs: kpis.cogs,
      costDataMissingCount: kpis.costDataMissingCount,
      grossProfit,
      grossMarginPercent,
      expenses: kpis.expenses,
      netProfit,
      netMarginPercent,
    }
  }

  /**
   * 10. Returns & Adjustments Audit
   */
  async getReturnsAdjustmentsAudit(businessId: string, filters?: AuditFilterParams): Promise<ReturnsAdjustmentsRecord[]> {
    const f = resolveFilters(filters)
    const returns = await salesReturnService.listAllSalesReturns(businessId)
    const filtered = this.applyFilters(returns, f)
      .filter((r) => !f.customerId || (r as any).customerId === f.customerId)

    return filtered.map((r) => ({
      id: r.$id,
      originalDocumentNumber: r.returnNumber || formatHumanInvoiceNumber(r.saleId || r.$id),
      date: r.createdAt ? r.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      type: 'SALES_RETURN' as const,
      amount: r.totalAmount || 0,
      reason: r.reason || 'Customer Return',
      user: r.createdBy || 'System',
      timestamp: r.createdAt || new Date().toISOString(),
      stockImpact: 'Stock Restocked',
      ledgerImpact: 'Customer Credit Issued',
    }))
  }


  /**
   * 11. Cancelled Documents Audit (Preserves Human-Readable Numbers)
   */
  async getCancelledDocuments(businessId: string, filters?: AuditFilterParams): Promise<CancelledDocumentRecord[]> {
    const f = resolveFilters(filters)
    const [sales, allCustomers] = await Promise.all([
      saleService.listAllSales(businessId, { dateFrom: f.dateFrom, dateTo: f.dateTo }),
      customerService.listAllCustomers(businessId),
    ])
    const cancelled = this.applyFilters(sales, f).filter((s) => s.status === 'cancelled')

    const customerMap = new Map<string, any>()
    for (const c of allCustomers) customerMap.set(c.$id, c)

    return cancelled.map((s) => {
      const cust = s.customerId ? customerMap.get(s.customerId) : null
      return {
        id: s.$id,
        documentType: 'INVOICE' as const,
        originalNumber: formatHumanInvoiceNumber(s),
        date: s.createdAt ? s.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        amount: s.total || 0,
        partyName: cust?.name || 'Walk-in Customer',
        reason: s.cancellationReason || 'User requested cancellation',
        cancelledBy: s.cancelledBy || s.createdBy || 'System',
        cancelledAt: s.cancelledAt || s.updatedAt || s.createdAt || new Date().toISOString(),
      }
    })
  }

  /**
   * 12. Audit Trail
   */
  async getAuditTrail(businessId: string, filters?: AuditFilterParams): Promise<AuditLogEntry[]> {
    const f = resolveFilters(filters)
    return await auditLogService.getBusinessAuditLogs(businessId, {
      dateFrom: f.dateFrom,
      dateTo: f.dateTo,
    })
  }

  /**
   * 13. Invoice Sequence Audit derived from actual Appwrite sales documents
   */
  async getInvoiceSequenceAudit(businessId: string, fiscalYear?: string): Promise<InvoiceSequenceAudit> {
    const sales = await saleService.listAllSales(businessId)
    const fy = fiscalYear || getCurrentFiscalYear()

    const fySales = sales.filter((s) => (s.fiscalYear || fy) === fy)
    const invoiceNumbers = fySales
      .map((s) => formatHumanInvoiceNumber(s))
      .filter((n) => n.trim() !== '')
      .sort()

    const firstInvoiceNumber = invoiceNumbers.length > 0 ? invoiceNumbers[0] : null
    const lastInvoiceNumber = invoiceNumbers.length > 0 ? invoiceNumbers[invoiceNumbers.length - 1] : null

    const numCounts = new Map<string, number>()
    const duplicatesDetected: string[] = []
    const seqNumbers: number[] = []

    for (const num of invoiceNumbers) {
      const count = (numCounts.get(num) || 0) + 1
      numCounts.set(num, count)
      if (count === 2) {
        duplicatesDetected.push(num)
      }

      // Extract sequence digits e.g. INV-83/84-000005 -> 5
      const parts = num.split('-')
      const lastPart = parts[parts.length - 1]
      const seqVal = parseInt(lastPart, 10)
      if (!isNaN(seqVal)) {
        seqNumbers.push(seqVal)
      }
    }

    // Detect sequence gaps
    const gapsDetected: string[] = []
    if (seqNumbers.length > 1) {
      seqNumbers.sort((a, b) => a - b)
      for (let i = 0; i < seqNumbers.length - 1; i++) {
        const curr = seqNumbers[i]
        const next = seqNumbers[i + 1]
        if (next > curr + 1) {
          for (let gap = curr + 1; gap < next; gap++) {
            gapsDetected.push(`INV-${fy}-${String(gap).padStart(6, '0')}`)
          }
        }
      }
    }

    const totalIssued = invoiceNumbers.length
    const totalCancelled = fySales.filter((s) => s.status === 'cancelled').length

    return {
      fiscalYear: fy,
      prefix: 'INV',
      firstInvoiceNumber,
      lastInvoiceNumber,
      totalIssued,
      totalCancelled,
      gapsDetected,
      duplicatesDetected,
      isSequenceIntact: duplicatesDetected.length === 0 && gapsDetected.length === 0,
    }
  }

  /**
   * 14. IRD Readiness Page Status
   */
  async getIrdReadinessStatus(businessId: string): Promise<IrdReadinessStatus> {
    let bizName = 'My Business'
    let panNumber = 'N/A'
    let vatNumber = 'N/A'

    try {
      const biz = await businessService.getBusiness(businessId)
      if (biz) {
        bizName = biz.name
        panNumber = biz.panNumber || biz.taxRegistrationNumber || 'N/A'
        vatNumber = biz.vatNumber || (biz.taxRegistrationType === 'VAT' ? biz.taxRegistrationNumber || 'N/A' : 'N/A')
      }
    } catch {
      // Non-fatal lookup fallback
    }

    return {
      businessId,
      businessName: bizName,
      panNumber,
      vatNumber,
      vatRegistrationStatus: vatNumber !== 'N/A' ? 'REGISTERED' : 'NOT_REGISTERED',
      currentFiscalYear: getCurrentFiscalYear(),
      electronicBillingStatus: 'Technical Readiness',
      cbmsIntegrationStatus: 'NOT_CONFIGURED',
      cbmsSubmissionCount: 0,
      cbmsAcceptedCount: 0,
      cbmsPendingCount: 0,
      cbmsFailedCount: 0,
      approvalVerified: false,
      approvalReference: undefined,
    }
  }

  /**
   * 15. Reconciliation Data (Human-Readable Invoice Numbers)
   */
  async getIrdReconciliation(businessId: string, filters?: AuditFilterParams): Promise<IrdReconciliationItem[]> {
    const f = resolveFilters(filters)
    const [sales, allCustomers] = await Promise.all([
      saleService.listAllSales(businessId, { dateFrom: f.dateFrom, dateTo: f.dateTo }),
      customerService.listAllCustomers(businessId),
    ])
    const filtered = this.applyFilters(sales, f)

    const customerMap = new Map<string, any>()
    for (const c of allCustomers) customerMap.set(c.$id, c)

    return filtered.map((s) => {
      const cust = s.customerId ? customerMap.get(s.customerId) : null
      return {
        id: s.$id,
        invoiceNumber: formatHumanInvoiceNumber(s),
        invoiceDate: s.createdAt ? s.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
        customerName: cust?.name || 'Walk-in Customer',
        totalAmount: s.total || 0,
        localStatus: s.status || 'completed',
        irdStatus: 'NOT_CONFIGURED' as const,
        resultMessage: 'CBMS Integration is not configured for this environment.',
      }
    })
  }

  /**
   * 16. Automated Cross-Report Reconciliation Engine
   * Validates integrity across Sales, VAT, Inventory, Customer/Supplier Ledgers, and Double-Entry GL.
   */
  async runFullSystemReconciliation(
    businessId: string,
    filters?: AuditFilterParams
  ): Promise<ReconciliationCheckResult[]> {
    const f = resolveFilters(filters)
    const results: ReconciliationCheckResult[] = []

    const [kpis, salesRegister, vatSummary, customerLedgers, supplierLedgers] = await Promise.all([
      this.getAuditOverviewKPIs(businessId, f),
      this.getSalesRegister(businessId, f),
      this.getVatSummary(businessId, f),
      this.getCustomerLedgers(businessId, f),
      this.getSupplierLedgers(businessId, f),
    ])

    // Check 1: Sales Register Total vs Overview KPI Total Sales
    const salesRegDiff = Math.abs(salesRegister.summary.totalSales - kpis.totalSales)
    results.push({
      id: 'rec_sales_register',
      checkName: 'Sales Register vs Financial Engine Sales',
      category: 'SALES',
      expected: kpis.totalSales,
      actual: salesRegister.summary.totalSales,
      difference: salesRegDiff,
      status: salesRegDiff === 0 ? 'BALANCED' : 'MISMATCH',
      message: salesRegDiff === 0
        ? 'Sales Register and Sales Engine totals match perfectly.'
        : `Sales mismatch of Rs. ${salesRegDiff} detected between register and sales engine.`,
    })

    // Check 2: Output VAT Reconciliation
    const vatDiff = Math.abs(vatSummary.outputVat - kpis.outputVat)
    results.push({
      id: 'rec_output_vat',
      checkName: 'VAT Summary vs Central Tax Engine Output VAT',
      category: 'VAT',
      expected: kpis.outputVat,
      actual: vatSummary.outputVat,
      difference: vatDiff,
      status: vatDiff === 0 ? 'BALANCED' : 'MISMATCH',
      message: vatDiff === 0
        ? 'Output VAT reconciles 100% with centralized tax engine.'
        : `Output VAT discrepancy of Rs. ${vatDiff} detected.`,
    })

    // Check 3: Customer Receivables Reconciliation
    const custLedgerTotal = customerLedgers.reduce((sum, c) => sum + c.closingBalance, 0)
    const custDiff = Math.abs(custLedgerTotal - kpis.outstandingCustomerCredit)
    results.push({
      id: 'rec_customer_receivables',
      checkName: 'Customer Ledger Dues vs Overview Receivables',
      category: 'CUSTOMER_LEDGER',
      expected: kpis.outstandingCustomerCredit,
      actual: custLedgerTotal,
      difference: custDiff,
      status: custDiff === 0 ? 'BALANCED' : 'MISMATCH',
      message: custDiff === 0
        ? 'Customer Ledger receivables reconcile 100% across all customer accounts.'
        : `Customer dues discrepancy of Rs. ${custDiff} detected.`,
    })

    // Check 4: Supplier Payables Reconciliation
    const suppLedgerTotal = supplierLedgers.reduce((sum, s) => sum + s.closingPayable, 0)
    const suppDiff = Math.abs(suppLedgerTotal - kpis.supplierPayables)
    results.push({
      id: 'rec_supplier_payables',
      checkName: 'Supplier Ledger Payables vs Overview Payables',
      category: 'SUPPLIER_LEDGER',
      expected: kpis.supplierPayables,
      actual: suppLedgerTotal,
      difference: suppDiff,
      status: suppDiff === 0 ? 'BALANCED' : 'MISMATCH',
      message: suppDiff === 0
        ? 'Supplier Ledger payables reconcile 100% across all supplier accounts.'
        : `Supplier payables discrepancy of Rs. ${suppDiff} detected.`,
    })

    // Check 5: General Ledger Double-Entry Balance (Total Debits == Total Credits)
    const totalDebits = kpis.outstandingCustomerCredit + kpis.stockValue + kpis.expenses + kpis.inputVat
    const totalCredits = kpis.supplierPayables + (kpis.totalSales - kpis.salesReturns) + kpis.outputVat
    const glDiff = Math.abs(totalDebits - totalCredits)

    results.push({
      id: 'rec_double_entry_gl',
      checkName: 'Double-Entry General Ledger Balance (Sum Debits = Sum Credits)',
      category: 'GENERAL_LEDGER',
      expected: totalDebits,
      actual: totalCredits,
      difference: glDiff,
      status: glDiff < 1 ? 'BALANCED' : 'WARNING',
      message: glDiff < 1
        ? 'General Ledger is in balance (Total Debits = Total Credits).'
        : `General Ledger trial balance variance of Rs. ${glDiff} detected.`,
    })

    return results
  }
}

export const auditCenterService = new AuditCenterService()
