/**
 * Mega Business Report — shared data contract.
 *
 * A single source of truth consumed by BOTH the Mega PDF and Mega Excel
 * generators so every exported value is identical across formats.
 *
 * The data is assembled by `getMegaReportData()` in
 * `src/services/mega-report.service.ts`, which reuses the business-scoped
 * audit-center aggregations plus direct list services for the detail sections.
 */

import type { AuditFilterParams } from './index'
import type {
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
} from '@/services/audit-center.service'
import type { AuditLogEntry } from '@/services/audit-log.service'
import type { IrdReconciliationItem } from './index'


/** Business identity block shown on the cover / metadata. */
export interface MegaReportBusinessInfo {
  id: string
  name: string
  panNumber?: string
  vatNumber?: string
  taxRegistrationType?: string
  taxRegistrationNumber?: string
  phone?: string
  email?: string
  address?: string
  logoUrl?: string
  currency: string
}

/** Report scope / period context. */
export interface MegaReportMeta {
  business: MegaReportBusinessInfo
  fiscalYear: string
  dateFrom?: string
  dateTo?: string
  periodLabel: string
  generatedAt: string
  generatedBy?: string
  generatedByEmail?: string
}

/** Product register row (business-scoped, no internal DB ids). */
export interface MegaProductRow {
  name: string
  sku: string
  unit: string
  categoryName: string
  stockQuantity: number
  purchasePrice: number
  sellingPrice: number
  lowStockThreshold?: number
  isActive: boolean
}

/** Category register row. */
export interface MegaCategoryRow {
  name: string
  description: string
  productCount: number
}

/** Expense register row. */
export interface MegaExpenseRow {
  title: string
  category: string
  description: string
  amount: number
  date: string
}

/** Stock movement register row. */
export interface MegaStockMovementRow {
  productName: string
  sku: string
  type: string
  quantity: number
  previousQuantity: number
  newQuantity: number
  reason: string
  date: string
}

/** Credit note register row. */
export interface MegaCreditNoteRow {
  creditNoteNumber: string
  customerName: string
  invoiceNumber: string
  issuedDate: string
  taxableAmount: number
  vatAmount: number
  totalAmount: number
  reason: string
}

/** Debit note register row. */
export interface MegaDebitNoteRow {
  debitNoteNumber: string
  supplierName: string
  issuedDate: string
  taxableAmount: number
  vatAmount: number
  totalAmount: number
  reason: string
}

/** Payments register row (customer + supplier). */
export interface MegaPaymentRow {
  date: string
  entityType: 'customer' | 'supplier'
  entityName: string
  reference: string
  amount: number
  method: string
  referenceNo: string
  createdBy: string
  status: string
}

/** Invoices register row (from sales). */
export interface MegaInvoiceRow {
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
}

/**
 * The complete Mega Business Report dataset. Every field is a plain value
 * (never NaN / Infinity / undefined / null) and derived from the same
 * authoritative app calculations.
 */
export interface MegaReportData {
  meta: MegaReportMeta
  filters: AuditFilterParams

  kpis: AuditOverviewKPIs
  salesRegister: {
    rows: MegaInvoiceRow[]
    summary: {
      totalInvoices: number
      totalSales: number
      totalDiscount: number
      totalTaxableAmount: number
      totalVat: number
      totalCancelled: number
    }
  }
  purchaseRegister: {
    rows: Array<{
      purchaseReference: string
      date: string
      supplierName: string
      supplierPan: string
      taxableAmount: number
      discount: number
      vatAmount: number
      total: number
      paidAmount: number
      outstanding: number
      paymentStatus: string
      returnStatus: string
      createdBy: string
      createdAt: string
    }>
    summary: {
      totalPurchases: number
      taxablePurchases: number
      inputVat: number
    }
  }
  vatSummary: {
    taxableSales: number
    nonTaxableSales: number
    outputVat: number
    taxablePurchases: number
    nonTaxablePurchases: number
    inputVat: number
    netVatPosition: number
    vatRate: number
    status: 'PAYABLE' | 'REFUNDABLE_CREDIT'
  }
  customerLedgers: CustomerLedgerEntry[]
  supplierLedgers: SupplierLedgerEntry[]
  payments: PaymentAuditRecord[]
  inventory: {
    products: ProductValuationEntry[]
    movements: MegaStockMovementRow[]
    summary: InventoryCogsAuditSummary
  }
  profitability: ProfitabilityAuditSummary
  returnsAdjustments: ReturnsAdjustmentsRecord[]
  cancelledDocuments: CancelledDocumentRecord[]
  auditTrail: AuditLogEntry[]
  invoiceSequence: {
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
  ird: {
    businessId: string
    businessName: string
    panNumber: string
    vatNumber: string
    vatRegistrationStatus: string
    currentFiscalYear: string
    electronicBillingStatus: string
    cbmsIntegrationStatus: string
    cbmsSubmissionCount: number
    cbmsAcceptedCount: number
    cbmsPendingCount: number
    cbmsFailedCount: number
    lastAttemptAt?: string
    lastSuccessfulSubmissionAt?: string
    approvalVerified: boolean
    approvalReference?: string
  }
  irdReconciliation: IrdReconciliationItem[]
  reconciliation: ReconciliationCheckResult[]

  categories: MegaCategoryRow[]
  products: MegaProductRow[]
  expenses: MegaExpenseRow[]
  creditNotes: MegaCreditNoteRow[]
  debitNotes: MegaDebitNoteRow[]
  paymentsDetail: MegaPaymentRow[]

  integrity: {
    hasIssues: boolean
    issues: string[]
    costDataMissingCount: number
    reconciliationCount: number
  }
}
