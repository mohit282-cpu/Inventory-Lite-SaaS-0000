/**
 * Type Definitions
 * 
 * Centralized type definitions for the entire application.
 * All business entities and their relationships are defined here.
 */

// ==================== Core Types ====================

export type BusinessType = 
  | 'retail' 
  | 'hardware' 
  | 'electronics' 
  | 'clothing' 
  | 'stationery' 
  | 'cosmetics' 
  | 'other'

export type BusinessStatus = 'active' | 'suspended' | 'inactive'

export type UserRole = 'owner' | 'admin' | 'staff'

export type Currency = 'NPR' | 'USD' | 'EUR' | 'INR'

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'credit'

export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded'

export type StockMovementType = 'stock_in' | 'stock_out' | 'adjustment'

// ==================== User Entity ====================

export interface AppUser {
  $id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  preferences: UserPreferences
  createdAt: string
  updatedAt: string
}

export interface UserPreferences {
  activeBusinessId?: string
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: {
    email: boolean
    push: boolean
  }
}

// ==================== Business Entity ====================

export interface Business {
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

// ==================== Business Member Entity ====================

export interface BusinessMember {
  $id: string
  businessId: string
  userId: string
  role: UserRole
  createdAt: string
}

// ==================== Category Entity ====================

export interface Category {
  $id: string
  businessId: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

// ==================== Product Entity ====================

export interface Product {
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

// ==================== Stock Movement Entity ====================

export interface StockMovement {
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

// ==================== Customer Entity ====================

export interface Customer {
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

// ==================== Sale Entity ====================

export interface Sale {
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
  createdBy: string
  createdAt: string
}

// ==================== Sale Item Entity ====================

export interface SaleItem {
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

// ==================== Invoice Entity ====================

export interface Invoice {
  $id: string
  businessId: string
  saleId: string
  invoiceNumber: string
  issueDate: string
  pdfUrl?: string
  createdAt: string
}

// ==================== Expense Entity ====================

export interface Expense {
  $id: string
  businessId: string
  category: string
  description: string
  amount: number
  date: string
  createdBy: string
  createdAt: string
}

// ==================== UI State Types ====================

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
