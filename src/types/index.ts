import { Models } from 'appwrite'

/**
 * Type Definitions for Inventory Lite Multi-Tenant SaaS
 * 
 * Centralized type definitions corresponding to Appwrite database entities.
 */

// ==================== Core Enum Types ====================

export type UserRole = 'owner' | 'admin' | 'staff' | 'auditor'

export type Currency = 'NPR' | 'USD' | 'EUR' | 'INR'

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'credit' | 'full_udhaar' | 'eSewa' | 'Khalti' | 'other'

export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded' | 'returned' | 'partial_return'

export type CreditStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'

export type StockMovementType = 'stock_in' | 'stock_out' | 'adjustment'

export type AuthStatus =
  | 'INITIALIZING'
  | 'ONLINE_AUTHENTICATING'
  | 'ONLINE_AUTHENTICATED'
  | 'OFFLINE_AUTHORIZED'
  | 'OFFLINE_NOT_AUTHORIZED'
  | 'SYNCING'
  | 'SYNC_FAILED'
  | 'SESSION_EXPIRED'
  | 'AUTHENTICATED'
  | 'UNAUTHENTICATED'
  | 'TIMEOUT'
  | 'ERROR'
  | 'OFFLINE'

// ==================== Appwrite Document Base ====================

export interface AppwriteDocument extends Models.Document {
  $id: string
  $createdAt: string
  $updatedAt: string
  $collectionId: string
  $databaseId: string
  $permissions: string[]
}

// ==================== 1. User Entity ====================

export type AccountStatus = 'ACTIVE' | 'BLOCKED'

export interface UserPreferences {
  activeBusinessId?: string
  onboardingCompleted?: boolean
  accountStatus?: AccountStatus
  isBlocked?: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: {
    email: boolean
    push: boolean
  }
}

export interface AppUser extends Models.Document {
  $id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  accountStatus?: AccountStatus
  isBlocked?: boolean
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

export type TaxRegistrationType = 'NONE' | 'PAN' | 'VAT'

// ==================== 2. Business Entity ====================

export interface Business extends Models.Document {
  $id: string
  name: string
  ownerId: string
  phone?: string
  email?: string
  address?: string
  panNumber?: string
  vatNumber?: string
  taxRegistrationType?: TaxRegistrationType
  taxRegistrationNumber?: string
  logoUrl?: string
  currency: Currency
  timezone: string
  dateFormat?: string
  createdAt: string
  updatedAt: string
}

// ==================== 3. Business Member Entity ====================

export interface BusinessMember extends Models.Document {
  $id: string
  businessId: string
  userId: string
  role: UserRole
  createdAt: string
}

// ==================== 4. Category Entity ====================

export interface Category extends Models.Document {
  $id: string
  businessId: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

// ==================== 5. Product Entity ====================

export interface Product extends Models.Document {
  $id: string
  businessId: string
  categoryId?: string
  name: string
  sku: string
  barcode?: string
  unit: string
  purchasePrice: number
  sellingPrice: number
  stockQuantity: number
  lowStockThreshold?: number
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ==================== 6. Stock Movement Entity ====================

export interface StockMovement extends Models.Document {
  $id: string
  businessId: string
  productId: string
  type: StockMovementType
  quantity: number
  previousQuantity: number
  newQuantity: number
  reason?: string
  referenceId?: string
  createdBy: string
  createdAt: string
}

// ==================== 7. Customer Entity ====================

export interface Customer extends Models.Document {
  $id: string
  businessId: string
  name: string
  phone?: string
  email?: string
  address?: string
  totalDue: number
  createdAt: string
  updatedAt: string
}

// ==================== 8. Sale Entity ====================

export interface Sale extends Models.Document {
  $id: string
  businessId: string
  customerId?: string
  invoiceId?: string
  saleNumber?: string
  idempotencyKey?: string
  requestHash?: string
  notes?: string
  subtotal: number
  discount: number
  discountType?: 'percentage' | 'fixed' | 'amount'
  discountValue?: number
  taxableAmount?: number
  tax: number
  vatAmount: number
  vatEnabled?: boolean
  vatRate?: number
  taxRate?: number
  total: number
  paidAmount: number
  dueAmount: number
  changeAmount?: number
  paymentMethod: PaymentMethod
  status: SaleStatus
  dueDate?: string
  createdBy: string
  createdAt: string
}

// ==================== 9. Sale Item Entity ====================

export interface SaleItem extends Models.Document {
  $id: string
  businessId: string
  saleId: string
  productId: string
  productNameSnapshot: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

// ==================== 10. Invoice Entity ====================

export type InvoiceStatus = 'DRAFT' | 'VALIDATED' | 'ISSUED' | 'LOCKED' | 'VOIDED'

export interface Invoice extends Models.Document {
  $id: string
  businessId: string
  saleId: string
  invoiceNumber: string
  status: InvoiceStatus
  issueDate: string
  dueDate?: string
  pdfUrl?: string
  validatedAt?: string
  issuedAt?: string
  lockedAt?: string
  voidedAt?: string
  voidedBy?: string
  voidReason?: string
  cbmsSubmissionId?: string
  createdAt: string
}

export type PaymentStatus = 'POSTED' | 'VOIDED' | 'REVERSED' | 'REFUNDED'

// ==================== 11. Payment Entity ====================

export interface Payment extends Models.Document {
  $id: string
  businessId: string
  customerId?: string
  saleId: string
  invoiceId?: string
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string
  referenceNumber?: string
  notes?: string
  status?: PaymentStatus
  createdBy?: string
  createdAt: string
  updatedAt?: string
}

// ==================== 12. Expense Entity ====================

export interface Expense extends Models.Document {
  $id: string
  businessId: string
  title?: string
  category: string
  description: string
  amount: number
  date: string
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt?: string
}

// ==================== UI State & API Types ====================

export interface ApiError {
  message: string
  code?: string
  details?: any
}

export interface PaginatedResponse<T> {
  documents: T[]
  total: number
  limit: number
  offset: number
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface TableColumn<T> {
  key: keyof T
  header: string
  sortable?: boolean
  width?: string
  render?: (value: any, row: T) => React.ReactNode
}

// ==================== Form Types ====================

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox'
  placeholder?: string
  required?: boolean
  validation?: any
  options?: SelectOption[]
}

export interface FormConfig {
  fields: FormField[]
  submitLabel: string
  onSubmit: (data: any) => Promise<void>
}

// ==================== Financial Year Sequence Entity ====================

export type DocumentType = 'SALE' | 'INVOICE' | 'PURCHASE' | 'SALES_RETURN'

export interface FinancialSequence extends AppwriteDocument {
  businessId: string
  documentType: DocumentType
  financialYear: string // e.g. "2083/84"
  nextNumber: number
  createdAt: string
  updatedAt: string
}

// ==================== Supplier Entity ====================

export type SupplierStatus = 'active' | 'archived'

export interface Supplier extends Models.Document {
  $id: string
  businessId: string
  name: string
  phone?: string
  email?: string
  address?: string
  panVatNumber?: string
  notes?: string
  status: SupplierStatus
  totalPurchases: number
  totalPaid: number
  outstandingPayable: number
  createdAt: string
  updatedAt: string
}

// ==================== Purchase Entity ====================

export type PurchaseStatus = 'completed' | 'cancelled' | 'pending'

export interface Purchase extends Models.Document {
  $id: string
  businessId: string
  supplierId: string
  purchaseNumber: string
  supplierInvoiceNumber?: string
  purchaseDate: string
  subtotal: number
  discount: number
  tax: number
  vatAmount: number
  total: number
  paidAmount: number
  dueAmount: number
  paymentMethod: PaymentMethod
  status: PurchaseStatus
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt?: string
}

// ==================== Purchase Item Entity ====================

export interface PurchaseItem extends Models.Document {
  $id: string
  businessId: string
  purchaseId: string
  productId: string
  productNameSnapshot: string
  quantity: number
  purchasePrice: number
  discount: number
  tax: number
  total: number
}

// ==================== Supplier Payment Entity ====================

export interface SupplierPayment extends Models.Document {
  $id: string
  businessId: string
  supplierId: string
  purchaseId?: string
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string
  referenceNumber?: string
  notes?: string
  createdBy: string
  createdAt: string
}

// ==================== Sales Return Entity ====================

export interface SalesReturn extends Models.Document {
  $id: string
  businessId: string
  returnNumber: string
  saleId: string
  saleNumber?: string
  customerId?: string
  subtotal: number
  discount: number
  tax: number
  totalRefund: number
  totalAmount?: number
  reason: string
  refundMethod: 'cash' | 'credit_adjustment' | 'bank_transfer' | 'digital_wallet' | 'other'
  returnDate?: string
  createdBy: string
  createdAt: string
}

// ==================== Sales Return Item Entity ====================

export interface SalesReturnItem extends Models.Document {
  $id: string
  businessId: string
  salesReturnId: string
  saleItemId: string
  productId: string
  productNameSnapshot: string
  quantity: number
  unitPrice: number
  total: number
}

// ==================== Credit Note Entity ====================

export interface CreditNote extends Models.Document {
  $id: string
  businessId: string
  creditNoteNumber: string
  saleId?: string
  invoiceId?: string
  invoiceNumber?: string
  customerId?: string
  customerName?: string
  reason: string
  taxableAmount: number
  vatAmount: number
  totalAmount: number
  issuedDate: string
  createdBy: string
  createdAt: string
}

// ==================== Debit Note Entity ====================

export interface DebitNote extends Models.Document {
  $id: string
  businessId: string
  debitNoteNumber: string
  purchaseId?: string
  supplierId?: string
  supplierName?: string
  reason: string
  taxableAmount: number
  vatAmount: number
  totalAmount: number
  issuedDate: string
  createdBy: string
  createdAt: string
}

// ==================== Store Asset Entity ====================

export type AssetStatus = 'ACTIVE' | 'MAINTENANCE' | 'DISPOSED'

export interface StoreAsset extends Models.Document {
  $id: string
  businessId: string
  name: string
  serialNumber?: string
  category?: string
  cost: number
  purchaseDate?: string
  status: AssetStatus
  notes?: string
  createdBy: string
  createdAt: string
}

export interface AssetInput {
  name: string
  serialNumber?: string
  category?: string
  cost: number
  purchaseDate?: string
  status?: AssetStatus
  notes?: string
}

// ==================== Audit & Compliance Center Entities ====================

export type IrdSubmissionStatus =
  | 'NOT_CONFIGURED'
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'SUBMITTING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'FAILED'
  | 'RETRYING'

export interface AuditFilterParams {
  fiscalYear?: string
  dateFrom?: string
  dateTo?: string
  month?: string
  quarter?: string
  customerId?: string
  supplierId?: string
  productId?: string
  paymentMethod?: PaymentMethod
  documentStatus?: string
}

export interface IrdReadinessStatus {
  businessId: string
  businessName: string
  panNumber: string
  vatNumber: string
  vatRegistrationStatus: 'REGISTERED' | 'EXEMPT' | 'NOT_REGISTERED'
  currentFiscalYear: string
  electronicBillingStatus: 'Not Configured' | 'Technical Readiness' | 'Connected'
  cbmsIntegrationStatus: IrdSubmissionStatus
  cbmsSubmissionCount: number
  cbmsAcceptedCount: number
  cbmsPendingCount: number
  cbmsFailedCount: number
  lastAttemptAt?: string
  lastSuccessfulSubmissionAt?: string
  approvalVerified: boolean
  approvalReference?: string
}

export interface IrdReconciliationItem {
  id: string
  invoiceNumber: string
  invoiceDate: string
  customerName?: string
  totalAmount: number
  localStatus: string
  irdStatus: 'MATCHED' | 'PENDING' | 'FAILED' | 'REJECTED' | 'MISMATCH' | 'NOT_CONFIGURED'
  submissionDate?: string
  externalReference?: string
  resultMessage?: string
}

export interface InvoiceSequenceAudit {
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

// ==================== Accounting Engine Entities ====================

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
export type AccountSubType =
  | 'current_asset' | 'fixed_asset' | 'non_current_asset'
  | 'current_liability' | 'non_current_liability'
  | 'equity'
  | 'revenue' | 'other_income'
  | 'cost_of_goods_sold' | 'operating_expense' | 'non_operating_expense' | 'tax_expense'

export interface Account extends Models.Document {
  $id: string
  businessId: string
  code: string
  name: string
  type: AccountType
  subType: AccountSubType
  description?: string
  parentId?: string
  isActive: boolean
  isSystem: boolean
  openingBalance: number
  createdAt: string
  updatedAt: string
}

export interface AccountInput {
  code: string
  name: string
  type: AccountType
  subType: AccountSubType
  description?: string
  parentId?: string
  isActive?: boolean
  isSystem?: boolean
  openingBalance?: number
}

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'VOIDED' | 'REVERSED'
export type JournalEntryType = 'standard' | 'auto' | 'adjusting' | 'closing' | 'reversing'

export interface JournalEntry extends Models.Document {
  $id: string
  businessId: string
  entryNumber: string
  date: string
  type: JournalEntryType
  status: JournalEntryStatus
  description: string
  referenceType?: string
  referenceId?: string
  fiscalYear: string
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
  postedAt?: string
  voidedAt?: string
  voidedBy?: string
  voidReason?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface JournalEntryLine extends Models.Document {
  $id: string
  businessId: string
  journalEntryId: string
  accountId: string
  accountCode: string
  accountName: string
  debit: number
  credit: number
  description?: string
  createdAt: string
}

export interface JournalEntryLineInput {
  accountId: string
  accountCode: string
  accountName: string
  debit: number
  credit: number
  description?: string
}

export interface JournalEntryInput {
  date: string
  type?: JournalEntryType
  description: string
  referenceType?: string
  referenceId?: string
  lines: JournalEntryLineInput[]
}

// ==================== Fiscal Year & Accounting Period Entities ====================

export type FiscalYearStatus = 'OPEN' | 'CLOSED' | 'LOCKED'
export type AccountingPeriodStatus = 'OPEN' | 'CLOSED' | 'LOCKED'

export interface FiscalYear extends Models.Document {
  $id: string
  businessId: string
  name: string
  bsStartYear: number
  bsEndYear: number
  isoStartDate: string
  isoEndDate: string
  status: FiscalYearStatus
  closedAt?: string
  closedBy?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface AccountingPeriod extends Models.Document {
  $id: string
  businessId: string
  fiscalYearId: string
  name: string
  monthNumber: number
  isoStartDate: string
  isoEndDate: string
  status: AccountingPeriodStatus
  closedAt?: string
  closedBy?: string
  createdAt: string
  updatedAt: string
}

// ==================== Tax Engine Entities ====================

export type TaxCategoryType = 'output_vat' | 'input_vat' | 'withholding_tax' | 'excise' | 'other'
export type TaxRateStatus = 'ACTIVE' | 'INACTIVE'

export interface TaxCategory extends Models.Document {
  $id: string
  businessId: string
  name: string
  type: TaxCategoryType
  description?: string
  createdAt: string
  updatedAt: string
}

export interface TaxRate extends Models.Document {
  $id: string
  businessId: string
  taxCategoryId?: string
  name: string
  rate: number
  type: TaxCategoryType
  effectiveFrom: string
  effectiveTo?: string
  status: TaxRateStatus
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface TaxTransaction extends Models.Document {
  $id: string
  businessId: string
  taxRateId: string
  taxRateName: string
  taxRateValue: number
  taxType: TaxCategoryType
  referenceType: string
  referenceId: string
  taxableAmount: number
  taxAmount: number
  createdAt: string
}

// ==================== CBMS / IRD Integration Entities ====================

export type CbmsSubmissionStatus = 'DRAFT' | 'QUEUED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'FAILED' | 'RETRYING'

export interface CbmsSubmission extends Models.Document {
  $id: string
  businessId: string
  invoiceId: string
  invoiceNumber: string
  invoiceDate: string
  totalAmount: number
  taxAmount: number
  customerPan?: string
  status: CbmsSubmissionStatus
  externalReference?: string
  responseCode?: string
  responseMessage?: string
  submittedAt?: string
  acceptedAt?: string
  rejectedAt?: string
  retryCount: number
  lastRetryAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ==================== Audit Trail Entities ====================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VOID' | 'REVERSE' | 'APPROVE' | 'REJECT' | 'EXPORT'

export interface AuditLog extends Models.Document {
  $id: string
  businessId: string
  entityType: string
  entityId: string
  entityNumber?: string
  action: AuditAction
  changes?: string
  performedBy: string
  performedByName?: string
  ipAddress?: string
  createdAt: string
}

// ==================== Enhanced Financial Reports ====================

export interface TrialBalanceRow {
  accountCode: string
  accountName: string
  accountType: AccountType
  debit: number
  credit: number
}

export interface ProfitLossRow {
  accountCode: string
  accountName: string
  amount: number
  category: 'revenue' | 'expense' | 'cogs' | 'gross_profit' | 'net_profit'
}

export interface BalanceSheetRow {
  accountCode: string
  accountName: string
  amount: number
  category: 'current_asset' | 'fixed_asset' | 'current_liability' | 'non_current_liability' | 'equity'
}


