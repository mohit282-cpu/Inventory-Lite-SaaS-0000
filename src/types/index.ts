import { Models } from 'appwrite'

/**
 * Type Definitions for Inventory Lite Multi-Tenant SaaS
 * 
 * Centralized type definitions corresponding to Appwrite database entities.
 */

// ==================== Core Enum Types ====================

export type UserRole = 'owner' | 'admin' | 'staff'

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

export interface UserPreferences {
  activeBusinessId?: string
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
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

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
  logoUrl?: string
  currency: Currency
  timezone: string
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
  subtotal: number
  discount: number
  tax: number
  total: number
  paidAmount: number
  dueAmount: number
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
