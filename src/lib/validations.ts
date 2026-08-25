/**
 * Validation Schemas
 * 
 * Centralized Zod validation schemas for all form inputs and API requests.
 * These schemas ensure type safety and data validation throughout the application.
 */

import { z } from 'zod'

// ==================== Common Validations ====================

export const emailSchema = z.string().email('Invalid email address')
export const phoneSchema = z.string().min(10, 'Phone number must be at least 10 digits')
export const nameSchema = z.string().min(2, 'Name must be at least 2 characters')
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const safeImageUrlSchema = z
  .string()
  .optional()
  .refine(
    (url) => {
      if (!url || url.trim() === '') return true
      try {
        const parsed = new URL(url)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: 'Invalid URL scheme. Only HTTP and HTTPS URLs are allowed.' }
  )

// ==================== Auth Validations ====================

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: z.string().optional().or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// ==================== Business Validations ====================

export const taxRegistrationTypeSchema = z.enum(['NONE', 'PAN', 'VAT'])

export const businessSchema = z.object({
  name: nameSchema,
  type: z.enum(['retail', 'hardware', 'electronics', 'clothing', 'stationery', 'cosmetics', 'other']),
  address: z.string().optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  taxId: z.string().optional(),
  taxRegistrationType: taxRegistrationTypeSchema.optional(),
  taxRegistrationNumber: z.string().optional(),
})

export const onboardingSchema = z
  .object({
    name: z.string().trim().min(2, 'Business name must be at least 2 characters'),
    ownerName: z.string().trim().min(2, 'Owner name must be at least 2 characters'),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    panNumber: z.string().optional(),
    vatNumber: z.string().optional(),
    taxRegistrationType: taxRegistrationTypeSchema.default('NONE'),
    taxRegistrationNumber: z.string().optional(),
    currency: z.enum(['NPR', 'USD', 'EUR', 'INR']).default('NPR'),
    timezone: z.string().min(1, 'Timezone is required').default('Asia/Kathmandu'),
    defaultVatRate: z.coerce.number().min(0).max(100).optional().default(13),
    invoicePrefix: z.string().optional().default('INV-'),
    lowStockThreshold: z.coerce.number().min(0).optional().default(10),
    dateFormat: z.string().optional().default('BS_FORMAT'),
  })
  .refine(
    (data) => {
      if (data.taxRegistrationType === 'VAT' || data.taxRegistrationType === 'PAN') {
        const num = (data.taxRegistrationNumber || (data.taxRegistrationType === 'VAT' ? data.vatNumber : data.panNumber) || '').trim()
        if (num.length === 0) return false
        
        // Strict PAN/VAT 9 digit validation
        const cleaned = num.replace(/\D/g, '')
        if (cleaned.length !== 9) return false
      }
      return true
    },
    {
      message: 'A valid 9-digit Tax registration number (PAN) is required for PAN/VAT registered businesses',
      path: ['taxRegistrationNumber'],
    }
  )

export const businessSettingsSchema = z
  .object({
    name: z.string().min(2, 'Business name must be at least 2 characters').optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    address: z.string().optional(),
    currency: z.enum(['NPR', 'USD', 'EUR', 'INR']),
    timezone: z.string(),
    dateFormat: z.string().optional(),
    invoicePrefix: z.string().optional(),
    taxRate: z.number().min(0).max(100).optional(),
    enableTax: z.boolean().optional(),
    panNumber: z.string().optional(),
    vatNumber: z.string().optional(),
    logoUrl: safeImageUrlSchema,
    taxRegistrationType: taxRegistrationTypeSchema.optional().default('NONE'),
    taxRegistrationNumber: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.taxRegistrationType === 'VAT' || data.taxRegistrationType === 'PAN') {
        const num = (data.taxRegistrationNumber || (data.taxRegistrationType === 'VAT' ? data.vatNumber : data.panNumber) || '').trim()
        if (num.length === 0) return false

        // Strict PAN/VAT 9 digit validation
        const cleaned = num.replace(/\D/g, '')
        if (cleaned.length !== 9) return false
      }
      return true
    },
    {
      message: 'A valid 9-digit Tax registration number (PAN) is required for PAN/VAT registered businesses',
      path: ['taxRegistrationNumber'],
    }
  )

// ==================== Product Validations ====================

export const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional(),
})

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: nameSchema,
  description: z.string().optional(),
  categoryId: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  costPrice: z.number().min(0).optional(),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  minStockLevel: z.number().min(0).optional(),
  maxStockLevel: z.number().min(0).optional(),
  unit: z.string().min(1, 'Unit is required'),
  barcode: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const productFormSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative'),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative'),
  openingStock: z.coerce.number().min(0, 'Opening stock cannot be negative'),
  minStockAlert: z.coerce.number().min(0, 'Low-stock threshold cannot be negative'),
  imageUrl: safeImageUrlSchema,
  isActive: z.boolean(),
})

// ==================== Stock Movement Validations ====================

export const stockInSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().gt(0, 'Quantity must be greater than zero'),
  reason: z.string().optional(),
  referenceId: z.string().optional(),
})

export const stockOutSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().gt(0, 'Quantity must be greater than zero'),
  reason: z.string().optional(),
  referenceId: z.string().optional(),
})

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  newQuantity: z.coerce.number().min(0, 'Stock quantity cannot be negative'),
  reason: z.string().min(2, 'Adjustment reason is required'),
})

export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  panNumber: z.string().optional(),
})

// ==================== Sales & POS Validations ====================

export const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().gt(0, 'Quantity must be greater than zero'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
})

export const saleInputSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one product item is required'),
  overallDiscount: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
  taxRate: z.coerce.number().min(0, 'Tax rate cannot be negative').default(13),
  paidAmount: z.coerce.number().min(0, 'Paid amount cannot be negative').default(0),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card', 'digital_wallet', 'credit', 'eSewa', 'Khalti', 'other']).default('cash'),
  notes: z.string().optional(),
})

// ==================== Invoice Validations ====================

export const invoiceItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Price must be positive'),
  discount: z.number().min(0).max(100).default(0),
})

export const invoiceSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(100).default(0),
  discountAmount: z.number().min(0).default(0),
})

export const paymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'digital_wallet', 'credit', 'eSewa', 'Khalti', 'other']),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

// ==================== Member Validations ====================

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'manager', 'staff', 'viewer']),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'manager', 'staff', 'viewer']),
})

// ==================== Expense Validations ====================

export const expenseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  category: z.enum(['rent', 'utilities', 'salaries', 'supplies', 'transport', 'maintenance', 'other']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
})

// ==================== Supplier Validations ====================

export const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name must be at least 2 characters'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  panVatNumber: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'archived']).default('active'),
})

export const supplierPaymentSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  purchaseId: z.string().optional(),
  amount: z.coerce.number().gt(0, 'Payment amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'digital_wallet', 'credit', 'eSewa', 'Khalti', 'other']).default('cash'),
  paymentDate: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
})

// ==================== Purchase Validations ====================

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().gt(0, 'Quantity must be greater than 0'),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
  tax: z.coerce.number().min(0, 'Tax cannot be negative').default(0),
})

export const purchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  supplierInvoiceNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one product item is required'),
  discount: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
  tax: z.coerce.number().min(0, 'Tax cannot be negative').default(0),
  paidAmount: z.coerce.number().min(0, 'Paid amount cannot be negative').default(0),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'digital_wallet', 'credit', 'eSewa', 'Khalti', 'other']).default('cash'),
  notes: z.string().optional(),
})

// ==================== Sales Return Validations ====================

export const salesReturnItemSchema = z.object({
  saleItemId: z.string().min(1, 'Sale item is required'),
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().gt(0, 'Return quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
})

export const salesReturnSchema = z.object({
  saleId: z.string().min(1, 'Sale transaction is required'),
  items: z.array(salesReturnItemSchema).min(1, 'At least one return item is required'),
  reason: z.string().min(2, 'Return reason is required'),
  refundMethod: z.enum(['cash', 'credit_adjustment', 'bank_transfer', 'digital_wallet', 'other']).default('cash'),
})

// ==================== Bill Cancellation Validations ====================

export const cancelSaleSchema = z.object({
  saleId: z.string().min(1, 'Sale ID is required'),
  reason: z.string().min(3, 'Cancellation reason is required (at least 3 characters)'),
})

// ==================== Type Inference ====================

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type BusinessInput = z.infer<typeof businessSchema>
export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type ProductInput = z.infer<typeof productSchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>
export type InvoiceInput = z.infer<typeof invoiceSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type SupplierInput = z.infer<typeof supplierSchema>
export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>
export type PurchaseInput = z.infer<typeof purchaseSchema>
export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>
export type SalesReturnInput = z.infer<typeof salesReturnSchema>
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>

