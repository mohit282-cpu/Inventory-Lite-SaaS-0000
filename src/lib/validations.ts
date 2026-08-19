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
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')

// ==================== Auth Validations ====================

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  password: passwordSchema,
})

// ==================== Business Validations ====================

export const businessSchema = z.object({
  name: nameSchema,
  type: z.enum(['retail', 'hardware', 'electronics', 'clothing', 'stationery', 'cosmetics', 'other']),
  address: z.string().optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  taxId: z.string().optional(),
})

export const businessSettingsSchema = z.object({
  currency: z.enum(['NPR', 'USD', 'EUR', 'INR']),
  timezone: z.string(),
  dateFormat: z.string(),
  invoicePrefix: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  enableTax: z.boolean().optional(),
})

// ==================== Product Validations ====================

export const categorySchema = z.object({
  name: nameSchema,
  description: z.string().optional(),
  parentId: z.string().optional(),
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

// ==================== Customer Validations ====================

export const customerSchema = z.object({
  name: nameSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  creditLimit: z.number().min(0).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
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
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'digital_wallet', 'credit']),
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
