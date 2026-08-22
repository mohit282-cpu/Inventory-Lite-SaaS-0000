import Dexie, { Table } from 'dexie'

export interface LocalProduct {
  id: string
  businessId: string
  name: string
  sku?: string
  barcode?: string
  categoryId?: string
  quantity: number
  price: number
  purchasePrice?: number
  minStock?: number
  unit?: string
  description?: string
  syncStatus: 'SYNCED' | 'PENDING_SYNC' | 'FAILED'
  updatedAt?: string
}

export interface LocalCategory {
  id: string
  businessId: string
  name: string
  description?: string
}

export interface LocalCustomer {
  id: string
  businessId: string
  name: string
  phone?: string
  email?: string
  address?: string
  dueAmount: number
  syncStatus: 'SYNCED' | 'PENDING_SYNC' | 'FAILED'
  createdAt?: string
}

export interface LocalSale {
  id: string
  businessId: string
  customerId?: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  paidAmount: number
  dueAmount: number
  status: 'completed' | 'cancelled' | 'pending'
  paymentMethod: string
  syncStatus: 'SYNCED' | 'PENDING_SYNC' | 'FAILED'
  createdAt: string
  createdBy?: string
}

export interface LocalSaleItem {
  id: string
  saleId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

export interface LocalInvoice {
  id: string
  saleId: string
  businessId: string
  invoiceNumber: string
  grandTotal: number
  paidAmount: number
  dueAmount: number
  syncStatus: 'SYNCED' | 'PENDING_SYNC' | 'FAILED'
  createdAt: string
}

export interface LocalPayment {
  id: string
  businessId: string
  customerId: string
  saleId?: string
  amount: number
  paymentMethod: string
  notes?: string
  syncStatus: 'SYNCED' | 'PENDING_SYNC' | 'FAILED'
  createdAt: string
}

export interface SyncQueueItem {
  id?: number
  businessId: string
  userId: string
  entityType: 'sale' | 'customer' | 'payment' | 'product' | 'stock'
  entityId: string
  operation: 'CREATE' | 'UPDATE' | 'DELETE'
  payload: any
  retryCount: number
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED'
  createdAt: string
  errorMessage?: string
}

export interface SyncMetadata {
  businessId: string
  lastSyncedAt: string
}

export interface OfflineAuthRecord {
  id: string // lowercased email
  userId: string
  email: string
  passwordHash: string
  salt: string
  deviceId: string
  userProfile: any
  activeBusinessId: string
  activeBusiness: any
  memberships: any[]
  authorizedAt: string
  lastValidatedAt: string
}

export class InventoryLiteLocalDB extends Dexie {
  products!: Table<LocalProduct, string>
  categories!: Table<LocalCategory, string>
  customers!: Table<LocalCustomer, string>
  sales!: Table<LocalSale, string>
  saleItems!: Table<LocalSaleItem, string>
  invoices!: Table<LocalInvoice, string>
  payments!: Table<LocalPayment, string>
  syncQueue!: Table<SyncQueueItem, number>
  syncMetadata!: Table<SyncMetadata, string>
  authRecords!: Table<OfflineAuthRecord, string>

  constructor() {
    super('inventory_lite_local')

    this.version(2).stores({
      products: 'id, businessId, categoryId, syncStatus',
      categories: 'id, businessId',
      customers: 'id, businessId, syncStatus',
      sales: 'id, businessId, customerId, status, syncStatus, createdAt',
      saleItems: 'id, saleId, productId',
      invoices: 'id, saleId, businessId, syncStatus',
      payments: 'id, businessId, customerId, saleId, syncStatus',
      syncQueue: '++id, businessId, userId, entityType, status, createdAt',
      syncMetadata: 'businessId',
      authRecords: 'id, userId, email, activeBusinessId',
    })
  }

  async clearBusinessData(businessId: string) {
    await this.transaction(
      'rw',
      [
        this.products,
        this.categories,
        this.customers,
        this.sales,
        this.saleItems,
        this.invoices,
        this.payments,
        this.syncQueue,
        this.syncMetadata,
      ],
      async () => {
        await this.products.where('businessId').equals(businessId).delete()
        await this.categories.where('businessId').equals(businessId).delete()
        await this.customers.where('businessId').equals(businessId).delete()
        await this.sales.where('businessId').equals(businessId).delete()
        await this.invoices.where('businessId').equals(businessId).delete()
        await this.payments.where('businessId').equals(businessId).delete()
        await this.syncQueue.where('businessId').equals(businessId).delete()
        await this.syncMetadata.where('businessId').equals(businessId).delete()
      }
    )
  }
}

export const localDB = new InventoryLiteLocalDB()
