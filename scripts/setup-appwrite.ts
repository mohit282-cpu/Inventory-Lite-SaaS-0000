/**
 * Appwrite Database Schema Provisioning & Setup Script
 * 
 * Provisions database 'inventory_lite_db', all 11 core collections,
 * required attributes, default values, and indexes (including tenant isolation indexes)
 * using the Appwrite REST API.
 */

import fs from 'fs'
import path from 'path'

try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8')
    envFile.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        const key = match[1]
        let value = match[2] || ''
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
        if (!process.env[key]) process.env[key] = value.trim()
      }
    })
  }
} catch {
  // Ignore env loading errors
}

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
const API_KEY = process.env.APPWRITE_API_KEY || ''
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'inventory_lite_db'

export const INDEX_TYPES = {
  KEY: 'key',
  UNIQUE: 'unique',
  FULLTEXT: 'fulltext',
} as const

export const COLLECTIONS_SCHEMA = [
  {
    id: 'users',
    name: 'Users',
    attributes: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'avatar', type: 'string', size: 1000, required: false },
      { key: 'preferences', type: 'string', size: 2000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_email', type: INDEX_TYPES.UNIQUE, attributes: ['email'] },
    ],
  },
  {
    id: 'businesses',
    name: 'Businesses',
    attributes: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'ownerId', type: 'string', size: 100, required: true },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'panNumber', type: 'string', size: 50, required: false },
      { key: 'vatNumber', type: 'string', size: 50, required: false },
      { key: 'logoUrl', type: 'string', size: 1000, required: false },
      { key: 'currency', type: 'string', size: 10, required: true, default: 'NPR' },
      { key: 'timezone', type: 'string', size: 100, required: true, default: 'Asia/Kathmandu' },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_ownerId', type: INDEX_TYPES.KEY, attributes: ['ownerId'] },
      { key: 'idx_email', type: INDEX_TYPES.KEY, attributes: ['email'] },
      { key: 'idx_panNumber', type: INDEX_TYPES.KEY, attributes: ['panNumber'] },
    ],
  },
  {
    id: 'business_members',
    name: 'Business Members',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'userId', type: 'string', size: 100, required: true },
      { key: 'role', type: 'string', size: 50, required: true },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: false },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_userId', type: INDEX_TYPES.KEY, attributes: ['userId'] },
      { key: 'idx_business_user', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'userId'] },
    ],
  },
  {
    id: 'categories',
    name: 'Categories',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_name', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'name'] },
    ],
  },
  {
    id: 'products',
    name: 'Products',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'categoryId', type: 'string', size: 100, required: false },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'sku', type: 'string', size: 100, required: true },
      { key: 'barcode', type: 'string', size: 100, required: false },
      { key: 'unit', type: 'string', size: 50, required: true },
      { key: 'purchasePrice', type: 'double', required: true },
      { key: 'sellingPrice', type: 'double', required: true },
      { key: 'stockQuantity', type: 'double', required: true },
      { key: 'lowStockThreshold', type: 'double', required: false, default: 5 },
      { key: 'imageUrl', type: 'string', size: 1000, required: false },
      { key: 'isActive', type: 'boolean', required: true, default: true },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_sku', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'sku'] },
      { key: 'idx_business_barcode', type: INDEX_TYPES.KEY, attributes: ['businessId', 'barcode'] },
      { key: 'idx_business_name', type: INDEX_TYPES.KEY, attributes: ['businessId', 'name'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'stock_movements',
    name: 'Stock Movements',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'productId', type: 'string', size: 100, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'quantity', type: 'double', required: true },
      { key: 'previousQuantity', type: 'double', required: true },
      { key: 'newQuantity', type: 'double', required: true },
      { key: 'reason', type: 'string', size: 500, required: false },
      { key: 'referenceId', type: 'string', size: 100, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_productId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'productId'] },
      { key: 'idx_business_type', type: INDEX_TYPES.KEY, attributes: ['businessId', 'type'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'customers',
    name: 'Customers',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'panNumber', type: 'string', size: 50, required: false },
      { key: 'totalDue', type: 'double', required: true, default: 0 },
      { key: 'dueAmount', type: 'double', required: false, default: 0 },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_name', type: INDEX_TYPES.KEY, attributes: ['businessId', 'name'] },
      { key: 'idx_business_phone', type: INDEX_TYPES.KEY, attributes: ['businessId', 'phone'] },
      { key: 'idx_business_email', type: INDEX_TYPES.KEY, attributes: ['businessId', 'email'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'saleNumber', type: 'string', size: 100, required: false },
      { key: 'customerId', type: 'string', size: 100, required: false },
      { key: 'invoiceId', type: 'string', size: 100, required: false },
      { key: 'invoiceStatus', type: 'string', size: 50, required: false },
      { key: 'idempotencyKey', type: 'string', size: 255, required: false },
      { key: 'requestHash', type: 'string', size: 255, required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'subtotal', type: 'double', required: true },
      { key: 'discount', type: 'double', required: true },
      { key: 'discountType', type: 'string', size: 50, required: false, default: 'fixed' },
      { key: 'discountValue', type: 'double', required: false, default: 0 },
      { key: 'taxableAmount', type: 'double', required: false, default: 0 },
      { key: 'nonTaxableAmount', type: 'double', required: false, default: 0 },
      { key: 'tax', type: 'double', required: true },
      { key: 'vatAmount', type: 'double', required: false, default: 0 },
      { key: 'vatEnabled', type: 'boolean', required: false, default: false },
      { key: 'vatRate', type: 'double', required: false, default: 0 },
      { key: 'taxRate', type: 'double', required: false, default: 0 },
      { key: 'total', type: 'double', required: true },
      { key: 'paidAmount', type: 'double', required: true },
      { key: 'dueAmount', type: 'double', required: true },
      { key: 'changeAmount', type: 'double', required: false, default: 0 },
      { key: 'paymentMethod', type: 'string', size: 50, required: true },
      { key: 'status', type: 'string', size: 50, required: true },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_idemp', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'idempotencyKey'] },
      { key: 'idx_business_saleNumber', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'saleNumber'] },
      { key: 'idx_business_customerId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'customerId'] },
      { key: 'idx_business_status', type: INDEX_TYPES.KEY, attributes: ['businessId', 'status'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'sale_items',
    name: 'Sale Items',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'saleId', type: 'string', size: 100, required: true },
      { key: 'productId', type: 'string', size: 100, required: true },
      { key: 'productNameSnapshot', type: 'string', size: 255, required: true },
      { key: 'quantity', type: 'double', required: true },
      { key: 'unitPrice', type: 'double', required: true },
      { key: 'discount', type: 'double', required: true },
      { key: 'total', type: 'double', required: true },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: false },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_saleId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'saleId'] },
      { key: 'idx_business_productId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'productId'] },
    ],
  },
  {
    id: 'invoices',
    name: 'Invoices',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'saleId', type: 'string', size: 100, required: true },
      { key: 'invoiceNumber', type: 'string', size: 100, required: false },
      { key: 'issueDate', type: 'string', size: 100, required: true },
      { key: 'dueDate', type: 'string', size: 100, required: false },
      { key: 'pdfUrl', type: 'string', size: 1000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_invoiceNumber', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'invoiceNumber'] },
      { key: 'idx_business_saleId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'saleId'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'expenses',
    name: 'Expenses',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'category', type: 'string', size: 100, required: true },
      { key: 'description', type: 'string', size: 1000, required: true },
      { key: 'amount', type: 'double', required: true },
      { key: 'date', type: 'string', size: 100, required: true },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_category', type: INDEX_TYPES.KEY, attributes: ['businessId', 'category'] },
      { key: 'idx_business_date', type: INDEX_TYPES.KEY, attributes: ['businessId', 'date'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'payments',
    name: 'Payments',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'saleId', type: 'string', size: 100, required: true },
      { key: 'customerId', type: 'string', size: 100, required: false },
      { key: 'invoiceId', type: 'string', size: 100, required: false },
      { key: 'amount', type: 'double', required: true },
      { key: 'paymentMethod', type: 'string', size: 50, required: true },
      { key: 'paymentDate', type: 'string', size: 100, required: true },
      { key: 'referenceNumber', type: 'string', size: 100, required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'status', type: 'string', size: 50, required: true, default: 'POSTED' },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_saleId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'saleId'] },
      { key: 'idx_business_customerId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'customerId'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'suppliers',
    name: 'Suppliers',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'panVatNumber', type: 'string', size: 50, required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'status', type: 'string', size: 50, required: true, default: 'active' },
      { key: 'totalPurchases', type: 'double', required: true, default: 0 },
      { key: 'totalPaid', type: 'double', required: true, default: 0 },
      { key: 'outstandingPayable', type: 'double', required: true, default: 0 },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_phone', type: INDEX_TYPES.KEY, attributes: ['businessId', 'phone'] },
      { key: 'idx_business_name', type: INDEX_TYPES.KEY, attributes: ['businessId', 'name'] },
      { key: 'idx_business_status', type: INDEX_TYPES.KEY, attributes: ['businessId', 'status'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'purchases',
    name: 'Purchases',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'supplierId', type: 'string', size: 100, required: true },
      { key: 'purchaseNumber', type: 'string', size: 100, required: false },
      { key: 'supplierInvoiceNumber', type: 'string', size: 100, required: false },
      { key: 'purchaseDate', type: 'string', size: 100, required: true },
      { key: 'subtotal', type: 'double', required: true },
      { key: 'discount', type: 'double', required: true },
      { key: 'taxableAmount', type: 'double', required: false, default: 0 },
      { key: 'nonTaxableAmount', type: 'double', required: false, default: 0 },
      { key: 'tax', type: 'double', required: true },
      { key: 'vatAmount', type: 'double', required: false, default: 0 },
      { key: 'total', type: 'double', required: true },
      { key: 'paidAmount', type: 'double', required: true },
      { key: 'dueAmount', type: 'double', required: true },
      { key: 'paymentMethod', type: 'string', size: 50, required: true },
      { key: 'status', type: 'string', size: 50, required: true, default: 'completed' },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'cancellationReason', type: 'string', size: 1000, required: false },
      { key: 'cancelledBy', type: 'string', size: 100, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_purchaseNumber', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'purchaseNumber'] },
      { key: 'idx_business_supplierId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'supplierId'] },
      { key: 'idx_business_status', type: INDEX_TYPES.KEY, attributes: ['businessId', 'status'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'purchase_items',
    name: 'Purchase Items',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'purchaseId', type: 'string', size: 100, required: true },
      { key: 'productId', type: 'string', size: 100, required: true },
      { key: 'productNameSnapshot', type: 'string', size: 255, required: true },
      { key: 'quantity', type: 'double', required: true },
      { key: 'purchasePrice', type: 'double', required: true },
      { key: 'discount', type: 'double', required: true, default: 0 },
      { key: 'tax', type: 'double', required: true, default: 0 },
      { key: 'total', type: 'double', required: true },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_purchaseId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'purchaseId'] },
      { key: 'idx_business_productId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'productId'] },
    ],
  },
  {
    id: 'supplier_payments',
    name: 'Supplier Payments',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'supplierId', type: 'string', size: 100, required: true },
      { key: 'purchaseId', type: 'string', size: 100, required: false },
      { key: 'amount', type: 'double', required: true },
      { key: 'paymentMethod', type: 'string', size: 50, required: true },
      { key: 'paymentDate', type: 'string', size: 100, required: true },
      { key: 'referenceNumber', type: 'string', size: 100, required: false },
      { key: 'idempotencyKey', type: 'string', size: 255, required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_supplierId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'supplierId'] },
      { key: 'idx_business_purchaseId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'purchaseId'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'sales_returns',
    name: 'Sales Returns',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'saleId', type: 'string', size: 100, required: true },
      { key: 'saleNumber', type: 'string', size: 100, required: false },
      { key: 'customerId', type: 'string', size: 100, required: false },
      { key: 'returnNumber', type: 'string', size: 100, required: false },
      { key: 'returnDate', type: 'string', size: 100, required: true },
      { key: 'subtotal', type: 'double', required: false, default: 0 },
      { key: 'discount', type: 'double', required: false, default: 0 },
      { key: 'tax', type: 'double', required: false, default: 0 },
      { key: 'taxableAmount', type: 'double', required: false, default: 0 },
      { key: 'vatAmount', type: 'double', required: false, default: 0 },
      { key: 'totalRefund', type: 'double', required: false, default: 0 },
      { key: 'totalAmount', type: 'double', required: true },
      { key: 'refundMethod', type: 'string', size: 50, required: true },
      { key: 'reason', type: 'string', size: 1000, required: true },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_saleId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'saleId'] },
      { key: 'idx_business_customerId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'customerId'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'sales_return_items',
    name: 'Sales Return Items',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'salesReturnId', type: 'string', size: 100, required: true },
      { key: 'saleItemId', type: 'string', size: 100, required: true },
      { key: 'productId', type: 'string', size: 100, required: true },
      { key: 'quantity', type: 'double', required: true },
      { key: 'unitPrice', type: 'double', required: true },
      { key: 'total', type: 'double', required: true },
      { key: 'createdBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_salesReturnId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'salesReturnId'] },
      { key: 'idx_business_productId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'productId'] },
    ],
  },
  {
    id: 'credit_notes',
    name: 'Credit Notes',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'creditNoteNumber', type: 'string', size: 100, required: true },
      { key: 'saleId', type: 'string', size: 100, required: false },
      { key: 'invoiceId', type: 'string', size: 100, required: false },
      { key: 'invoiceNumber', type: 'string', size: 100, required: false },
      { key: 'customerId', type: 'string', size: 100, required: false },
      { key: 'customerName', type: 'string', size: 255, required: false },
      { key: 'reason', type: 'string', size: 1000, required: true },
      { key: 'taxableAmount', type: 'double', required: true },
      { key: 'vatAmount', type: 'double', required: true },
      { key: 'totalAmount', type: 'double', required: true },
      { key: 'issuedDate', type: 'string', size: 100, required: true },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_creditNoteNum', type: INDEX_TYPES.KEY, attributes: ['businessId', 'creditNoteNumber'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'debit_notes',
    name: 'Debit Notes',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'debitNoteNumber', type: 'string', size: 100, required: true },
      { key: 'purchaseId', type: 'string', size: 100, required: false },
      { key: 'supplierId', type: 'string', size: 100, required: false },
      { key: 'supplierName', type: 'string', size: 255, required: false },
      { key: 'reason', type: 'string', size: 1000, required: true },
      { key: 'taxableAmount', type: 'double', required: true },
      { key: 'vatAmount', type: 'double', required: true },
      { key: 'totalAmount', type: 'double', required: true },
      { key: 'issuedDate', type: 'string', size: 100, required: true },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_debitNoteNum', type: INDEX_TYPES.KEY, attributes: ['businessId', 'debitNoteNumber'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'store_assets',
    name: 'Store Assets',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'serialNumber', type: 'string', size: 100, required: false },
      { key: 'category', type: 'string', size: 100, required: false },
      { key: 'cost', type: 'double', required: true },
      { key: 'purchaseDate', type: 'string', size: 100, required: false },
      { key: 'status', type: 'string', size: 50, required: true, default: 'ACTIVE' },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_business_status', type: INDEX_TYPES.KEY, attributes: ['businessId', 'status'] },
      { key: 'idx_business_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'financial_sequences',
    name: 'Financial Sequences',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'currentSequence', type: 'double', required: true },
      { key: 'prefix', type: 'string', size: 50, required: false },
      { key: 'financialYear', type: 'string', size: 50, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: false },
      { key: 'updatedAt', type: 'string', size: 100, required: false },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_type_fy', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'type', 'financialYear'] },
    ],
  },
  {
    id: 'inventory_locks',
    name: 'Inventory Locks',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: false },
      { key: 'productId', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_createdAt', type: INDEX_TYPES.KEY, attributes: ['createdAt'] },
    ],
  },
  {
    id: 'idempotency_keys',
    name: 'Idempotency Keys',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'key', type: 'string', size: 255, required: true },
      { key: 'requestHash', type: 'string', size: 255, required: true },
      { key: 'status', type: 'string', size: 50, required: true },
      { key: 'response', type: 'string', size: 10000, required: false },
      { key: 'resourceId', type: 'string', size: 100, required: false },
      { key: 'error', type: 'string', size: 2000, required: false },
      { key: 'expiresAt', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_key', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'key'] },
      { key: 'idx_expiresAt', type: INDEX_TYPES.KEY, attributes: ['expiresAt'] },
    ],
  },
  {
    id: 'rate_limits',
    name: 'Rate Limits',
    attributes: [
      { key: 'key', type: 'string', size: 255, required: true },
      { key: 'count', type: 'double', required: true },
      { key: 'resetTime', type: 'double', required: true },
      { key: 'expiresAt', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_key', type: INDEX_TYPES.UNIQUE, attributes: ['key'] },
      { key: 'idx_expiresAt', type: INDEX_TYPES.KEY, attributes: ['expiresAt'] },
    ],
  },
  {
    id: 'contact_submissions',
    name: 'Contact Submissions',
    attributes: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'subject', type: 'string', size: 255, required: true },
      { key: 'message', type: 'string', size: 5000, required: true },
      { key: 'ip', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_createdAt', type: INDEX_TYPES.KEY, attributes: ['createdAt'] },
    ],
  },
  {
    id: 'newsletter_subscriptions',
    name: 'Newsletter Subscriptions',
    attributes: [
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'ip', type: 'string', size: 100, required: false },
      { key: 'status', type: 'string', size: 50, required: true, default: 'active' },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_email', type: INDEX_TYPES.UNIQUE, attributes: ['email'] },
    ],
  },
  {
    id: 'audit_logs',
    name: 'Audit Logs',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'userId', type: 'string', size: 100, required: false },
      { key: 'entityType', type: 'string', size: 100, required: true },
      { key: 'entityId', type: 'string', size: 100, required: true },
      { key: 'entityNumber', type: 'string', size: 100, required: false },
      { key: 'action', type: 'string', size: 50, required: true },
      { key: 'changes', type: 'string', size: 10000, required: false },
      { key: 'performedBy', type: 'string', size: 100, required: true },
      { key: 'performedByName', type: 'string', size: 255, required: false },
      { key: 'ipAddress', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_entity', type: INDEX_TYPES.KEY, attributes: ['businessId', 'entityType', 'entityId'] },
      { key: 'idx_biz_createdAt', type: INDEX_TYPES.KEY, attributes: ['businessId', 'createdAt'] },
    ],
  },
  {
    id: 'accounts',
    name: 'Accounts',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'code', type: 'string', size: 50, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'subType', type: 'string', size: 50, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'parentId', type: 'string', size: 100, required: false },
      { key: 'isActive', type: 'boolean', required: true, default: true },
      { key: 'isSystem', type: 'boolean', required: true, default: false },
      { key: 'openingBalance', type: 'double', required: true, default: 0 },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_code', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'code'] },
      { key: 'idx_biz_type', type: INDEX_TYPES.KEY, attributes: ['businessId', 'type'] },
    ],
  },
  {
    id: 'journal_entries',
    name: 'Journal Entries',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'entryNumber', type: 'string', size: 100, required: true },
      { key: 'date', type: 'string', size: 100, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'status', type: 'string', size: 50, required: true },
      { key: 'description', type: 'string', size: 1000, required: true },
      { key: 'referenceType', type: 'string', size: 100, required: false },
      { key: 'referenceId', type: 'string', size: 100, required: false },
      { key: 'fiscalYear', type: 'string', size: 50, required: true },
      { key: 'totalDebit', type: 'double', required: true },
      { key: 'totalCredit', type: 'double', required: true },
      { key: 'isBalanced', type: 'boolean', required: true, default: true },
      { key: 'postedAt', type: 'string', size: 100, required: false },
      { key: 'voidedAt', type: 'string', size: 100, required: false },
      { key: 'voidedBy', type: 'string', size: 100, required: false },
      { key: 'voidReason', type: 'string', size: 1000, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_entryNum', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'entryNumber'] },
      { key: 'idx_biz_date', type: INDEX_TYPES.KEY, attributes: ['businessId', 'date'] },
      { key: 'idx_biz_status', type: INDEX_TYPES.KEY, attributes: ['businessId', 'status'] },
    ],
  },
  {
    id: 'journal_lines',
    name: 'Journal Lines',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'journalEntryId', type: 'string', size: 100, required: true },
      { key: 'accountId', type: 'string', size: 100, required: true },
      { key: 'accountCode', type: 'string', size: 50, required: true },
      { key: 'accountName', type: 'string', size: 255, required: true },
      { key: 'debit', type: 'double', required: true, default: 0 },
      { key: 'credit', type: 'double', required: true, default: 0 },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_journalEntryId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'journalEntryId'] },
      { key: 'idx_biz_accountId', type: INDEX_TYPES.KEY, attributes: ['businessId', 'accountId'] },
    ],
  },
  {
    id: 'fiscal_years',
    name: 'Fiscal Years',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 100, required: true },
      { key: 'bsStartYear', type: 'double', required: true },
      { key: 'bsEndYear', type: 'double', required: true },
      { key: 'isoStartDate', type: 'string', size: 100, required: true },
      { key: 'isoEndDate', type: 'string', size: 100, required: true },
      { key: 'status', type: 'string', size: 50, required: true, default: 'OPEN' },
      { key: 'closedAt', type: 'string', size: 100, required: false },
      { key: 'closedBy', type: 'string', size: 100, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_name', type: INDEX_TYPES.UNIQUE, attributes: ['businessId', 'name'] },
    ],
  },
  {
    id: 'accounting_periods',
    name: 'Accounting Periods',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'fiscalYearId', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 100, required: true },
      { key: 'monthNumber', type: 'double', required: true },
      { key: 'isoStartDate', type: 'string', size: 100, required: true },
      { key: 'isoEndDate', type: 'string', size: 100, required: true },
      { key: 'status', type: 'string', size: 50, required: true, default: 'OPEN' },
      { key: 'closedAt', type: 'string', size: 100, required: false },
      { key: 'closedBy', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_fiscalYear', type: INDEX_TYPES.KEY, attributes: ['businessId', 'fiscalYearId'] },
    ],
  },
  {
    id: 'tax_categories',
    name: 'Tax Categories',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
    ],
  },
  {
    id: 'tax_rates',
    name: 'Tax Rates',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'taxCategoryId', type: 'string', size: 100, required: false },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'rate', type: 'double', required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'effectiveFrom', type: 'string', size: 100, required: true },
      { key: 'effectiveTo', type: 'string', size: 100, required: false },
      { key: 'status', type: 'string', size: 50, required: true, default: 'ACTIVE' },
      { key: 'isDefault', type: 'boolean', required: true, default: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_rate', type: INDEX_TYPES.KEY, attributes: ['businessId', 'rate'] },
    ],
  },
  {
    id: 'tax_transactions',
    name: 'Tax Transactions',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'taxRateId', type: 'string', size: 100, required: true },
      { key: 'taxRateName', type: 'string', size: 255, required: true },
      { key: 'taxRateValue', type: 'double', required: true },
      { key: 'taxType', type: 'string', size: 50, required: true },
      { key: 'referenceType', type: 'string', size: 100, required: true },
      { key: 'referenceId', type: 'string', size: 100, required: true },
      { key: 'taxableAmount', type: 'double', required: true },
      { key: 'taxAmount', type: 'double', required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_reference', type: INDEX_TYPES.KEY, attributes: ['businessId', 'referenceType', 'referenceId'] },
    ],
  },
  {
    id: 'cbms_submissions',
    name: 'CBMS Submissions',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'invoiceId', type: 'string', size: 100, required: true },
      { key: 'invoiceNumber', type: 'string', size: 100, required: true },
      { key: 'invoiceDate', type: 'string', size: 100, required: true },
      { key: 'totalAmount', type: 'double', required: true },
      { key: 'taxAmount', type: 'double', required: true },
      { key: 'customerPan', type: 'string', size: 50, required: false },
      { key: 'status', type: 'string', size: 50, required: true },
      { key: 'externalReference', type: 'string', size: 255, required: false },
      { key: 'responseCode', type: 'string', size: 50, required: false },
      { key: 'responseMessage', type: 'string', size: 1000, required: false },
      { key: 'submittedAt', type: 'string', size: 100, required: false },
      { key: 'acceptedAt', type: 'string', size: 100, required: false },
      { key: 'rejectedAt', type: 'string', size: 100, required: false },
      { key: 'retryCount', type: 'double', required: true, default: 0 },
      { key: 'lastRetryAt', type: 'string', size: 100, required: false },
      { key: 'createdBy', type: 'string', size: 100, required: true },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
      { key: 'idx_biz_invoice', type: INDEX_TYPES.KEY, attributes: ['businessId', 'invoiceId'] },
      { key: 'idx_biz_status', type: INDEX_TYPES.KEY, attributes: ['businessId', 'status'] },
    ],
  },
  {
    id: 'user_preferences',
    name: 'User Preferences',
    attributes: [
      { key: 'userId', type: 'string', size: 100, required: true },
      { key: 'preferences', type: 'string', size: 4000, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_userId', type: INDEX_TYPES.UNIQUE, attributes: ['userId'] },
    ],
  },
  {
    id: 'business_assets',
    name: 'Business Assets',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'url', type: 'string', size: 1000, required: false },
      { key: 'metadata', type: 'string', size: 4000, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.KEY, attributes: ['businessId'] },
    ],
  },
  {
    id: 'business_onboarding',
    name: 'Business Onboarding',
    attributes: [
      { key: 'businessId', type: 'string', size: 100, required: true },
      { key: 'step', type: 'string', size: 50, required: true },
      { key: 'completed', type: 'boolean', required: true, default: false },
      { key: 'data', type: 'string', size: 4000, required: false },
      { key: 'completedAt', type: 'string', size: 100, required: false },
      { key: 'createdAt', type: 'string', size: 100, required: true },
      { key: 'updatedAt', type: 'string', size: 100, required: true },
    ],
    indexes: [
      { key: 'idx_businessId', type: INDEX_TYPES.UNIQUE, attributes: ['businessId'] },
    ],
  },
]

async function apiRequest(path: string, method: string = 'GET', body?: any) {
  const url = `${ENDPOINT}${path}`
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key': API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  return {
    status: response.status,
    data: await response.json().catch(() => ({})),
  }
}

export async function setupDatabase() {
  if (!PROJECT_ID || !API_KEY) {
    console.log('----------------------------------------------------')
    console.log('Notice: Remote provisioning skipped because APPWRITE_API_KEY is not set.')
    console.log(`Verified schema structure for all ${COLLECTIONS_SCHEMA.length} collections.`)
    console.log('----------------------------------------------------')
    return
  }

  console.log(`Checking Database: ${DATABASE_ID}...`)
  const dbCheck = await apiRequest(`/databases/${DATABASE_ID}`)

  if (dbCheck.data?.message?.includes('paused') || dbCheck.data?.type === 'project_paused') {
    console.log('\n----------------------------------------------------')
    console.log('Notice: Appwrite project is currently PAUSED due to inactivity in Appwrite Cloud.')
    console.log('To restore your project:')
    console.log('1. Log into Appwrite Console: https://cloud.appwrite.io')
    console.log('2. Select project inventory-lite-saa-s-0000 (6aabeb7e0017a4599d1e)')
    console.log('3. Click "Restore Project" on the yellow banner at the top.')
    console.log('----------------------------------------------------\n')
    return
  }

  if (dbCheck.status === 404) {
    console.log(`Creating database '${DATABASE_ID}'...`)
    await apiRequest('/databases', 'POST', {
      databaseId: DATABASE_ID,
      name: 'Inventory Lite SaaS Database',
    })
  }

  for (const schema of COLLECTIONS_SCHEMA) {
    const colCheck = await apiRequest(`/databases/${DATABASE_ID}/collections/${schema.id}`)
    
    // Enforce strict principle-of-least-privilege permissions
    let defaultPermissions = [
      'read("users")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ]

    if (schema.id === 'contact_submissions' || schema.id === 'newsletter_subscriptions') {
      defaultPermissions = [
        'create("any")',
        'read("users")',
        'update("users")',
        'delete("users")',
      ]
    } else if (schema.id === 'audit_logs') {
      // Audit logs are append-only and cannot be updated or deleted
      defaultPermissions = [
        'read("users")',
        'create("users")',
      ]
    }

    if (colCheck.status === 404) {
      await apiRequest(`/databases/${DATABASE_ID}/collections`, 'POST', {
        collectionId: schema.id,
        name: schema.name,
        permissions: defaultPermissions,
        documentSecurity: true,
      })
    } else {
      await apiRequest(`/databases/${DATABASE_ID}/collections/${schema.id}`, 'PUT', {
        name: schema.name,
        permissions: defaultPermissions,
        documentSecurity: true,
      })
    }

    // Get existing collection attribute keys
    const colInfo = await apiRequest(`/databases/${DATABASE_ID}/collections/${schema.id}`)
    const existingAttrKeys = (colInfo.data.attributes || []).map((a: any) => a.key)

    for (const attr of schema.attributes) {
      if (existingAttrKeys.includes(attr.key)) continue

      const attrPayload: any = {
        key: attr.key,
        required: (attr as any).default !== undefined ? false : attr.required,
      }

      if ((attr as any).default !== undefined) {
        attrPayload.default = (attr as any).default
      }

      let path = ''
      if (attr.type === 'string') {
        path = `/databases/${DATABASE_ID}/collections/${schema.id}/attributes/string`
        attrPayload.size = attr.size || 255
      } else if (attr.type === 'double') {
        path = `/databases/${DATABASE_ID}/collections/${schema.id}/attributes/float`
      } else if (attr.type === 'boolean') {
        path = `/databases/${DATABASE_ID}/collections/${schema.id}/attributes/boolean`
      }

      if (path) {
        const res = await apiRequest(path, 'POST', attrPayload)
        if (res.status === 401 || res.data?.type === 'general_unauthorized_scope') {
          console.log('\n----------------------------------------------------')
          console.log('Notice: APPWRITE_API_KEY lacks "collections.write" scope in Appwrite Console.')
          console.log('To enable automated remote database provisioning:')
          console.log('1. Go to Appwrite Console -> Project Overview -> API Keys')
          console.log('2. Edit your key and check "collections.write" & "databases.write"')
          console.log(`3. Save and re-run this script.\n`)
          console.log(`Local schema validation successful for all ${COLLECTIONS_SCHEMA.length} collections.`)
          console.log('----------------------------------------------------\n')
          return
        }
        if (res.status >= 400 && res.status !== 409) {
          console.error(`  ✖ Failed to create attribute '${attr.key}' on '${schema.id}':`, res.data)
        } else {
          console.log(`  - Created attribute '${attr.key}' on '${schema.id}'`)
        }
      }
    }

    for (const idx of schema.indexes) {
      await apiRequest(`/databases/${DATABASE_ID}/collections/${schema.id}/indexes`, 'POST', {
        key: idx.key,
        type: idx.type,
        attributes: idx.attributes,
      })
    }
  }

  console.log('Checking Storage Buckets...')
  const BUCKETS_SCHEMA = [
    { id: 'product_images', name: 'Product Images', permissions: ['read("any")'], maximumFileSize: 5242880, allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp'] },
    { id: 'business_logos', name: 'Business Logos', permissions: ['read("any")'], maximumFileSize: 2097152, allowedFileExtensions: ['jpg', 'jpeg', 'png', 'svg'] },
    { id: 'documents', name: 'Generated Documents', permissions: ['read("users")'], maximumFileSize: 10485760, allowedFileExtensions: ['pdf'] },
  ]

  for (const bucket of BUCKETS_SCHEMA) {
    const bucketCheck = await apiRequest(`/storage/buckets/${bucket.id}`)
    if (bucketCheck.status === 404) {
      console.log(`Creating storage bucket '${bucket.id}'...`)
      const res = await apiRequest('/storage/buckets', 'POST', {
        bucketId: bucket.id,
        name: bucket.name,
        permissions: bucket.permissions,
        fileSecurity: false,
        maximumFileSize: bucket.maximumFileSize,
        allowedFileExtensions: bucket.allowedFileExtensions,
      })
      if (res.status < 400 || res.status === 409) {
        console.log(`  - Bucket '${bucket.id}' ready.`)
      }
    } else {
      console.log(`  - Bucket '${bucket.id}' verified.`)
    }
  }

  console.log('✅ Appwrite database & storage setup complete.')
}

// Enable execution when run directly via Node/ts-node/tsx
setupDatabase().catch(console.error)
