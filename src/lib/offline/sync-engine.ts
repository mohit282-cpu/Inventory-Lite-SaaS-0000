import { localDB, SyncQueueItem } from './db'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { customerService } from '@/services/customer.service'
import { saleService } from '@/services/sale.service'
import { paymentService } from '@/services/payment.service'
import { expenseService } from '@/services/expense.service'

export interface SyncProgressCallback {
  (step: string, current: number, total: number): void
}

export class SyncEngine {
  private isProcessing = false

  public isOnline(): boolean {
    if (typeof window === 'undefined') return true
    return navigator.onLine
  }

  /**
   * Initial data download from Appwrite Cloud into IndexedDB
   */
  async initialSync(businessId: string, onProgress?: SyncProgressCallback): Promise<boolean> {
    if (!this.isOnline() || !businessId || businessId === 'system') return false

    try {
      if (onProgress) onProgress('Fetching cloud catalog...', 1, 5)
      const [products, categories, customers, sales, payments, expenses] = await Promise.all([
        productService.listProducts(businessId).catch(() => []),
        categoryService.listCategories(businessId).catch(() => []),
        customerService.listCustomers(businessId).catch(() => []),
        saleService.listSales(businessId).catch(() => []),
        paymentService.getPayments(businessId).catch(() => []),
        expenseService.listExpenses(businessId).catch(() => []),
      ])

      if (onProgress) onProgress('Storing products & categories...', 2, 5)
      await localDB.transaction(
        'rw',
        [
          localDB.products,
          localDB.categories,
          localDB.customers,
          localDB.sales,
          localDB.payments,
          localDB.expenses,
          localDB.syncMetadata,
        ],
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

          if (onProgress) onProgress('Storing customers & sales history...', 3, 5)
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

          if (onProgress) onProgress('Storing payments & expenses...', 4, 5)
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

          // Sync Expenses
          for (const exp of expenses) {
            await localDB.expenses.put({
              id: exp.$id,
              businessId: exp.businessId,
              title: exp.title || exp.description || 'Expense',
              amount: exp.amount,
              category: exp.category,
              date: exp.date || exp.createdAt,
              notes: exp.notes,
              syncStatus: 'SYNCED',
              createdAt: exp.createdAt || exp.$createdAt,
              createdBy: exp.createdBy || '',
            })
          }

          // Set Sync Metadata
          await localDB.syncMetadata.put({
            businessId,
            lastSyncedAt: new Date().toISOString(),
          })
        }
      )

      if (onProgress) onProgress('Initial sync complete', 5, 5)
      return true
    } catch (error) {
      console.error('[SyncEngine] Error downloading cloud data:', error)
      return false
    }
  }

  /**
   * Order priority for dependency resolution
   */
  private getEntityTypePriority(type: SyncQueueItem['entityType']): number {
    switch (type) {
      case 'customer':
        return 1
      case 'product':
        return 2
      case 'sale':
        return 3
      case 'payment':
        return 4
      case 'stock':
        return 5
      case 'expense':
        return 6
      default:
        return 99
    }
  }

  /**
   * Process pending transaction sync queue items in strict dependency order
   */
  async processSyncQueue(
    businessId: string,
    onProgress?: SyncProgressCallback
  ): Promise<{ syncedCount: number; failedCount: number }> {
    if (!this.isOnline() || this.isProcessing || !businessId) {
      return { syncedCount: 0, failedCount: 0 }
    }

    this.isProcessing = true
    let syncedCount = 0
    let failedCount = 0

    try {
      // Reset stuck PROCESSING/SYNCING items from interrupted browser sessions back to PENDING
      const stuckItems = await localDB.syncQueue
        .where('businessId')
        .equals(businessId)
        .and((item) => item.status === 'PROCESSING' || item.status === 'SYNCING')
        .toArray()

      for (const stuck of stuckItems) {
        if (stuck.id) {
          await localDB.syncQueue.update(stuck.id, { status: 'PENDING' })
        }
      }

      const rawItems = await localDB.syncQueue
        .where('businessId')
        .equals(businessId)
        .and((item) => item.status === 'PENDING' || item.status === 'FAILED')
        .toArray()

      // Sort by dependency priority first, then by creation date/id
      const pendingItems = rawItems.sort((a, b) => {
        const pA = this.getEntityTypePriority(a.entityType)
        const pB = this.getEntityTypePriority(b.entityType)
        if (pA !== pB) return pA - pB
        return (a.id || 0) - (b.id || 0)
      })

      const totalItems = pendingItems.length
      let currentIndex = 0

      // Map to replace temporary local IDs with real server IDs
      const idMappings = new Map<string, string>()

      for (const item of pendingItems) {
        if (!this.isOnline()) break
        currentIndex++

        if (onProgress) {
          onProgress(`Syncing ${item.entityType} (${currentIndex}/${totalItems})...`, currentIndex, totalItems)
        }

        let createdServerId: string | undefined = undefined

        try {
          await localDB.syncQueue.update(item.id!, { status: 'PROCESSING' })

          // Replace any temporary customer ID in payload if mapped from earlier sync step
          const payload = { ...item.payload }
          if (payload.customerId && idMappings.has(payload.customerId)) {
            payload.customerId = idMappings.get(payload.customerId)
          }

          const idempotencyKey = item.idempotencyKey || item.entityId

          if (item.entityType === 'customer') {
            const created = await customerService.createCustomer(payload, item.businessId, item.userId)
            if (created && created.$id) {
              createdServerId = created.$id
              idMappings.set(item.entityId, created.$id)
              // Update local Dexie customer record
              const existingLocal = await localDB.customers.get(item.entityId)
              if (existingLocal) {
                await localDB.customers.delete(item.entityId)
                await localDB.customers.put({
                  ...existingLocal,
                  id: created.$id,
                  syncStatus: 'SYNCED',
                })
              }
            }
          } else if (item.entityType === 'sale') {
            payload.idempotencyKey = idempotencyKey
            const result = await saleService.createSale(payload, item.businessId, item.userId)
            if (result && result.sale && result.sale.$id) {
              createdServerId = result.sale.$id
              idMappings.set(item.entityId, result.sale.$id)
              await localDB.sales.update(item.entityId, { syncStatus: 'SYNCED' })
            }
          } else if (item.entityType === 'payment') {
            payload.idempotencyKey = idempotencyKey
            if (payload.saleId && idMappings.has(payload.saleId)) {
              payload.saleId = idMappings.get(payload.saleId)
            }
            const payDoc = await paymentService.createPayment(payload, item.businessId, item.userId)
            if (payDoc && payDoc.$id) {
              createdServerId = payDoc.$id
              await localDB.payments.update(item.entityId, { syncStatus: 'SYNCED' })
            }
          } else if (item.entityType === 'expense') {
            const expDoc = await expenseService.createExpense(payload, item.businessId, item.userId)
            if (expDoc && expDoc.$id) {
              createdServerId = expDoc.$id
              await localDB.expenses.update(item.entityId, { syncStatus: 'SYNCED' })
            }
          } else if (item.entityType === 'product') {
            const prodDoc = await productService.createProduct(payload, item.businessId, item.userId)
            if (prodDoc && prodDoc.$id) {
              createdServerId = prodDoc.$id
              await localDB.products.update(item.entityId, { syncStatus: 'SYNCED' })
            }
          }

          await localDB.syncQueue.update(item.id!, {
            status: 'SYNCED',
            serverId: createdServerId,
            errorMessage: undefined,
          })
          syncedCount++
        } catch (err: any) {
          console.error(`[SyncEngine] Failed to sync queue item ${item.id}:`, err)
          const isStockOrBusinessConflict =
            err?.message?.includes('Insufficient stock') ||
            err?.message?.includes('conflict') ||
            err?.message?.includes('CONFLICT') ||
            err?.message?.includes('already exists')

          if (isStockOrBusinessConflict) {
            await localDB.syncQueue.update(item.id!, {
              status: 'CONFLICT',
              errorMessage: err?.message || 'Conflict detected during synchronization',
            })
          } else {
            const newRetryCount = (item.retryCount || 0) + 1
            const isFinalFailure = newRetryCount >= 4

            await localDB.syncQueue.update(item.id!, {
              status: isFinalFailure ? 'FAILED' : 'PENDING',
              retryCount: newRetryCount,
              errorMessage: err?.message || 'Synchronization failed',
            })
          }
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

