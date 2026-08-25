import { Models } from 'appwrite'

/**
 * Type Definitions for Inventory Lite Multi-Tenant SaaS
 * 
 * Centralized type definitions corresponding to Appwrite database entities.
 */

// ==================== Core Enum Types ====================

export type UserRole = 'owner' | 'admin' | 'staff' | 'auditor'

export type Currency = 'NPR' | 'USD' | 'EUR' | 'INR'

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'credit' | 'eSewa' | 'Khalti' | 'other'

export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded'

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

export interface Invoice extends Models.Document {
  $id: string
  businessId: string
  saleId: string
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  pdfUrl?: string
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
  totalAmount: number
  reason: string
  refundMethod: 'cash' | 'credit_adjustment' | 'bank_transfer' | 'digital_wallet' | 'other'
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
  paymentMethod?: string
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


