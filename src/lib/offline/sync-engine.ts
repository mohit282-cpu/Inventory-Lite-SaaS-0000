import { localDB } from './db'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { customerService } from '@/services/customer.service'
import { saleService } from '@/services/sale.service'
import { paymentService } from '@/services/payment.service'

export class SyncEngine {
  private isProcessing = false

  public isOnline(): boolean {
    if (typeof window === 'undefined') return true
    return navigator.onLine
  }

  /**
   * Initial data download from Appwrite Cloud into IndexedDB
   */
  async initialSync(businessId: string): Promise<boolean> {
    if (!this.isOnline() || !businessId || businessId === 'system') return false

    try {
      const [products, categories, customers, sales, payments] = await Promise.all([
        productService.listProducts(businessId).catch(() => []),
        categoryService.listCategories(businessId).catch(() => []),
        customerService.listCustomers(businessId).catch(() => []),
        saleService.listSales(businessId).catch(() => []),
        paymentService.getPayments(businessId).catch(() => []),
      ])

      await localDB.transaction(
        'rw',
        [localDB.products, localDB.categories, localDB.customers, localDB.sales, localDB.payments, localDB.syncMetadata],
        async () => {
          // Sync Products
          for (const p of products) {
            await localDB.products.put({
              id: p.$id,
              businessId: p.businessId,
              name: p.name,
              sku: p.sku,
              barcode: p.barcode,
              categoryId: p.categoryId,
              quantity: p.stockQuantity,
              price: p.sellingPrice,
              purchasePrice: p.purchasePrice,
              minStock: p.lowStockThreshold,
              unit: p.unit,
              description: '',
              syncStatus: 'SYNCED',
              updatedAt: p.$updatedAt,
            })
          }

          // Sync Categories
          for (const c of categories) {
            await localDB.categories.put({
              id: c.$id,
              businessId: c.businessId,
              name: c.name,
              description: c.description,
            })
          }

          // Sync Customers
          for (const cust of customers) {
            await localDB.customers.put({
              id: cust.$id,
              businessId: cust.businessId,
              name: cust.name,
              phone: cust.phone,
              email: cust.email,
              address: cust.address,
              dueAmount: cust.dueAmount || cust.totalDue || 0,
              syncStatus: 'SYNCED',
              createdAt: cust.createdAt || cust.$createdAt,
            })
          }

          // Sync Sales
          for (const s of sales) {
            await localDB.sales.put({
              id: s.$id,
              businessId: s.businessId,
              customerId: s.customerId,
              subtotal: s.subtotal,
              discountAmount: s.discount || 0,
              taxAmount: s.tax || 0,
              total: s.total,
              paidAmount: s.paidAmount || 0,
              dueAmount: s.dueAmount || 0,
              status: s.status as any,
              paymentMethod: s.paymentMethod || 'cash',
              syncStatus: 'SYNCED',
              createdAt: s.createdAt || s.$createdAt,
              createdBy: s.createdBy || '',
            })
          }

          // Sync Payments
          for (const pay of payments) {
            await localDB.payments.put({
              id: pay.$id,
              businessId: pay.businessId,
              customerId: pay.customerId || '',
              saleId: pay.saleId,
              amount: pay.amount,
              paymentMethod: pay.paymentMethod || 'cash',
              notes: pay.notes,
              syncStatus: 'SYNCED',
              createdAt: pay.createdAt || pay.$createdAt,
            })
          }

          // Set Sync Metadata
          await localDB.syncMetadata.put({
            businessId,
            lastSyncedAt: new Date().toISOString(),
          })
        }
      )

      return true
    } catch (error) {
      console.error('[SyncEngine] Error downloading cloud data:', error)
      return false
    }
  }

  /**
   * Process pending transaction sync queue items
   */
  async processSyncQueue(businessId: string): Promise<{ syncedCount: number; failedCount: number }> {
    if (!this.isOnline() || this.isProcessing || !businessId) {
      return { syncedCount: 0, failedCount: 0 }
    }

    this.isProcessing = true
    let syncedCount = 0
    let failedCount = 0

    try {
      const pendingItems = await localDB.syncQueue
        .where('businessId')
        .equals(businessId)
        .and((item) => item.status === 'PENDING' || item.status === 'FAILED')
        .sortBy('id')

      for (const item of pendingItems) {
        if (!this.isOnline()) break

        try {
          await localDB.syncQueue.update(item.id!, { status: 'SYNCING' })

          if (item.entityType === 'sale') {
            await saleService.createSale(item.payload, item.businessId, item.userId)
            await localDB.sales.update(item.entityId, { syncStatus: 'SYNCED' })
          } else if (item.entityType === 'customer') {
            await customerService.createCustomer(item.payload, item.businessId, item.userId)
            await localDB.customers.update(item.entityId, { syncStatus: 'SYNCED' })
          } else if (item.entityType === 'payment') {
            await paymentService.createPayment(item.payload, item.businessId, item.userId)
            await localDB.payments.update(item.entityId, { syncStatus: 'SYNCED' })
          }

          await localDB.syncQueue.update(item.id!, {
            status: 'SYNCED',
            errorMessage: undefined,
          })
          syncedCount++
        } catch (err: any) {
          console.error(`[SyncEngine] Failed to sync queue item ${item.id}:`, err)
          const newRetryCount = (item.retryCount || 0) + 1
          const isFinalFailure = newRetryCount >= 4

          await localDB.syncQueue.update(item.id!, {
            status: isFinalFailure ? 'FAILED' : 'PENDING',
            retryCount: newRetryCount,
            errorMessage: err?.message || 'Synchronization failed',
          })
          failedCount++
        }
      }

      if (syncedCount > 0) {
        await localDB.syncMetadata.put({
          businessId,
          lastSyncedAt: new Date().toISOString(),
        })
      }
    } finally {
      this.isProcessing = false
    }

    return { syncedCount, failedCount }
  }
}

export const syncEngine = new SyncEngine()
