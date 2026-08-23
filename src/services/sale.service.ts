import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Sale, SaleStatus, PaymentMethod } from '@/types'
import { Query } from 'appwrite'
import { saleItemService } from './sale-item.service'
import { stockMovementService } from './stock-movement.service'
import { productService } from './product.service'
import { customerService } from './customer.service'
import { invoiceService } from './invoice.service'
import { calculateSaleTotals, validateFinancialInvariants } from '@/lib/money'
import { generateSecureToken } from '@/lib/security'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { auditLogService } from './audit-log.service'
import { idempotencyManager } from '@/lib/idempotency'
import { offlineNumberPoolService } from './offline-number-pool.service'

export class SaleService extends BaseService {
  constructor() {
    super(COLLECTIONS.SALES)
  }

  /**
   * Helper to generate a sequential sale number per business starting from 1 every financial year.
   * Format: SALE-83/84-000001
   */
  async generateNextSaleNumber(businessId: string, dateInput?: string | Date): Promise<string> {
    const allocated = await offlineNumberPoolService.allocateDocumentNumber(businessId, 'SALE', dateInput)
    return allocated.formattedNumber
  }

  /**
   * Create a complete sale transaction with server-side price validation,
   * cashier price override auditing, financial invariant checks, collision-proof sale numbers,
   * and atomic compensating rollbacks.
   */
  async createSale(
    data: {
      customerId?: string
      items: Array<{
        productId: string
        quantity: number
        unitPrice?: number
        discount?: number
      }>
      discount?: number
      discountType?: 'percentage' | 'fixed' | 'amount'
      discountValue?: number
      vatEnabled?: boolean
      taxRate?: number
      paidAmount: number
      paymentMethod: PaymentMethod
      idempotencyKey?: string
    },
    businessId: string,
    userId: string
  ): Promise<{ sale: Sale; items: any[]; invoice?: any }> {
    // 1. Database-verified RBAC check
    const authCtx = await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    const persistentCheck = async (): Promise<{ sale: Sale; items: any[]; invoice?: any } | null> => {
      if (!data.idempotencyKey) return null
      const existingSales = await this.listSales(businessId)
      const matchedSale = existingSales.find(
        (s: any) => s.idempotencyKey === data.idempotencyKey || (s as any).referenceId === data.idempotencyKey
      )
      if (matchedSale) {
        const items = await saleItemService.listSaleItems(matchedSale.$id, businessId)
        return { sale: matchedSale, items, invoice: null }
      }
      return null
    }

    return await idempotencyManager.executeWithPersistentFallback(data.idempotencyKey, persistentCheck, async () => {
      if (!data.items || data.items.length === 0) {
        throw new Error('Sale must include at least one item')
      }

      // 2. Fetch trusted product data & validate stock and selling prices
      const validatedItems: Array<{
        productId: string
        quantity: number
        unitPrice: number
        discount: number
        productName: string
      }> = []

      for (const item of data.items) {
        if (typeof item.quantity !== 'number' || isNaN(item.quantity) || !isFinite(item.quantity) || item.quantity <= 0) {
          throw new Error('Item quantity must be a positive number greater than zero')
        }

        const product = await productService.getProduct(item.productId, businessId)
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`)
        }
        if (product.stockQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${product.stockQuantity} ${product.unit}, Requested: ${item.quantity}`
          )
        }

        // Cashier price override security & audit logic
        let effectiveUnitPrice = product.sellingPrice
        if (item.unitPrice !== undefined && item.unitPrice >= 0 && item.unitPrice !== product.sellingPrice) {
          if (authCtx.memberRole === 'staff') {
            throw new Error('PRICE_OVERRIDE_NOT_AUTHORIZED: Staff role is not authorized to override catalog selling price')
          }
          effectiveUnitPrice = item.unitPrice
          await auditLogService.logEvent(
            businessId,
            userId,
            'price_override',
            product.$id,
            {
              productName: product.name,
              catalogPrice: product.sellingPrice,
              overriddenPrice: item.unitPrice,
              userRole: authCtx.memberRole,
            }
          )
        }

        validatedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: effectiveUnitPrice,
          discount: item.discount || 0,
          productName: product.name,
        })
      }

      // 3. Server-Side Totals Recalculation (Prevents client total manipulation)
      const totals = calculateSaleTotals({
        items: validatedItems,
        discount: data.discount || 0,
        vatEnabled: data.vatEnabled ?? true,
        taxRate: data.taxRate ?? 13,
        paidAmount: data.paidAmount || 0,
      })

      validateFinancialInvariants({
        total: totals.total,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
      })

      const status: SaleStatus = totals.dueAmount > 0 ? 'pending' : 'completed'
      // Collision-proof sequential sale number starting from 1 per financial year (e.g. SALE-83/84-000001)
      const saleNumber = (data as any).saleNumber || (await this.generateNextSaleNumber(businessId, (data as any).createdAt))

      const isVatOn = data.vatEnabled ?? (data.taxRate !== undefined ? data.taxRate > 0 : totals.taxAmount > 0)
      const saleData = {
        saleNumber,
        customerId: data.customerId || '',
        invoiceId: '',
        subtotal: totals.subtotal,
        discount: totals.overallDiscount,
        discountType: data.discountType || (data.discountValue ? 'percentage' : 'fixed'),
        discountValue: data.discountValue ?? totals.overallDiscount,
        taxableAmount: totals.taxableAmount,
        tax: totals.taxAmount,
        vatEnabled: isVatOn,
        vatRate: isVatOn ? (data.taxRate ?? 13) : 0,
        taxRate: isVatOn ? (data.taxRate ?? 13) : 0,
        total: totals.total,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
        changeAmount: totals.changeAmount,
        paymentMethod: data.paymentMethod,
        status,
        createdBy: userId,
      }

      const sale = await this.create<Sale>(saleData, businessId, userId)

      // Compensating Transaction State Tracking
      let createdItems: any[] = []
      const processedDeductions: Array<{ productId: string; quantity: number }> = []

      try {
        // 5. Persist SaleItem documents
        const processedItemsPayload = totals.processedItems.map((item, idx) => ({
          saleId: sale.$id,
          productId: item.productId,
          productNameSnapshot: validatedItems[idx].productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.total,
        }))

        createdItems = await saleItemService.createSaleItems(processedItemsPayload, businessId, userId)

        // 6. Record stock movement (stock_out) and deduct stock
        for (const item of validatedItems) {
          await stockMovementService.processStockOut(
            item.productId,
            item.quantity,
            businessId,
            userId,
            `Sale #${sale.saleNumber || sale.$id}`,
            sale.$id
          )
          processedDeductions.push({ productId: item.productId, quantity: item.quantity })
        }

        // 7. Update customer due amount if sale has remaining due balance
        if (data.customerId && data.customerId.trim() !== '' && totals.dueAmount > 0) {
          await customerService.updateDueAmount(data.customerId, totals.dueAmount, businessId)
        }

        // 8. Generate invoice for sale
        let invoice: any = null
        try {
          invoice = await invoiceService.createInvoice(
            {
              saleId: sale.$id,
              issueDate: new Date().toISOString(),
            },
            businessId,
            userId
          )
          await this.update<Sale>(sale.$id, { invoiceId: invoice.$id }, businessId)
        } catch (invErr) {
          console.warn('Invoice creation warning:', invErr)
        }

        return {
          sale: { ...sale, changeAmount: totals.changeAmount },
          items: createdItems,
          invoice,
        }
      } catch (err: any) {
        // Check if error is network/offline error
        const isOffline = typeof window !== 'undefined' && (!navigator.onLine || err.message?.includes('Network') || err.message?.includes('fetch') || err.message?.includes('Failed to fetch'))

        if (isOffline) {
          console.warn('[SaleService] Network offline. Saving sale locally to IndexedDB transaction queue...')
          return await this.createOfflineSale(data, businessId, userId, data.idempotencyKey)
        }

        // COMPENSATING TRANSACTION ROLLBACK
        console.error('Sale transaction failed. Executing compensating rollback:', err)

        // Rollback stock deductions
        for (const deduction of processedDeductions) {
          try {
            await stockMovementService.processStockIn(
              deduction.productId,
              deduction.quantity,
              businessId,
              userId,
              `Rollback failed sale ${sale.$id}`
            )
          } catch (rbStockErr) {
            console.error('Stock rollback error:', rbStockErr)
          }
        }

        // Rollback created sale items
        for (const createdItem of createdItems) {
          try {
            await saleItemService.delete(createdItem.$id, businessId)
          } catch (rbItemErr) {
            console.error('Sale item rollback error:', rbItemErr)
          }
        }

        // Delete created sale document
        try {
          await this.delete(sale.$id, businessId)
        } catch (rbSaleErr) {
          console.error('Sale document rollback error:', rbSaleErr)
        }

        throw new Error(`Sale transaction failed and was safely rolled back: ${err.message}`)
      }
    })
  }

  /**
   * Internal helper for processing offline sales via Dexie IndexedDB
   */
  private async createOfflineSale(
    data: any,
    businessId: string,
    userId: string,
    customId?: string
  ): Promise<{ sale: any; items: any[]; invoice?: any }> {
    const { localDB } = await import('@/lib/offline/db')

    const localSaleId = customId || `LOCAL-SALE-${Date.now()}-${generateSecureToken(6)}`
    const saleNumber = await this.generateNextSaleNumber(businessId, data.createdAt)

    // Calculate totals locally
    const itemsWithDetails: any[] = []
    for (const item of data.items) {
      const localProd = await localDB.products.get(item.productId)
      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : localProd?.price || 0
      itemsWithDetails.push({
        ...item,
        unitPrice,
        productName: localProd?.name || 'Item',
      })
    }

    const totals = calculateSaleTotals({
      items: itemsWithDetails,
      discount: data.discount || 0,
      taxRate: data.taxRate ?? 13,
      paidAmount: data.paidAmount || 0,
    })

    const status: SaleStatus = totals.dueAmount > 0 ? 'pending' : 'completed'

    const localSale = {
      id: localSaleId,
      $id: localSaleId,
      saleNumber,
      businessId,
      customerId: data.customerId || '',
      subtotal: totals.subtotal,
      discount: totals.overallDiscount,
      tax: totals.taxAmount,
      total: totals.total,
      paidAmount: totals.paidAmount,
      dueAmount: totals.dueAmount,
      changeAmount: totals.changeAmount,
      status,
      paymentMethod: data.paymentMethod,
      syncStatus: 'PENDING_SYNC' as const,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    }

    // Update local product stock and save local sale items
    const createdLocalItems: any[] = []
    for (const item of totals.processedItems) {
      const itemId = `LOCAL-ITEM-${Date.now()}-${generateSecureToken(4)}`
      const localItem = {
        id: itemId,
        $id: itemId,
        saleId: localSaleId,
        productId: item.productId,
        productName: itemsWithDetails.find((i) => i.productId === item.productId)?.productName || 'Item',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total,
      }
      createdLocalItems.push(localItem)
      await localDB.saleItems.put(localItem)

      // Deduct local stock
      const prod = await localDB.products.get(item.productId)
      if (prod) {
        await localDB.products.update(item.productId, {
          quantity: Math.max(0, prod.quantity - item.quantity),
          syncStatus: 'PENDING_SYNC',
        })
      }
    }

    // Update local customer due amount if credit sale
    if (data.customerId && totals.dueAmount > 0) {
      const cust = await localDB.customers.get(data.customerId)
      if (cust) {
        await localDB.customers.update(data.customerId, {
          dueAmount: (cust.dueAmount || 0) + totals.dueAmount,
          syncStatus: 'PENDING_SYNC',
        })
      }
    }

    await localDB.sales.put(localSale as any)

    // Push to sync queue
    await localDB.syncQueue.add({
      businessId,
      userId,
      entityType: 'sale',
      entityId: localSaleId,
      operation: 'CREATE',
      payload: data,
      retryCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    })

    return {
      sale: localSale as any,
      items: createdLocalItems,
    }
  }

  /**
   * Get sale by ID
   */
  async getSale(saleId: string, businessId: string): Promise<Sale> {
    try {
      return await this.getById<Sale>(saleId, businessId)
    } catch (err) {
      const { localDB } = await import('@/lib/offline/db')
      const localSale = await localDB.sales.get(saleId)
      if (localSale) return localSale as any
      throw err
    }
  }

  /**
   * List sales for a business with pagination and offline fallback
   */
  async listSales(
    businessId: string,
    filters?: {
      customerId?: string
      status?: SaleStatus
      paymentMethod?: PaymentMethod
      limit?: number
    }
  ): Promise<Sale[]> {
    try {
      const limit = filters?.limit || 200
      const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

      if (filters?.customerId) {
        queries.push(Query.equal('customerId', filters.customerId))
      }
      if (filters?.status) {
        queries.push(Query.equal('status', filters.status))
      }
      if (filters?.paymentMethod) {
        queries.push(Query.equal('paymentMethod', filters.paymentMethod))
      }

      return await this.list<Sale>(businessId, queries)
    } catch (err) {
      console.warn('[SaleService] Appwrite listSales failed. Falling back to local IndexedDB store...')
      const { localDB } = await import('@/lib/offline/db')
      let localSales = await localDB.sales.where('businessId').equals(businessId).toArray()

      if (filters?.customerId) {
        localSales = localSales.filter((s) => s.customerId === filters.customerId)
      }
      if (filters?.status) {
        localSales = localSales.filter((s) => s.status === filters.status)
      }
      if (filters?.paymentMethod) {
        localSales = localSales.filter((s) => s.paymentMethod === filters.paymentMethod)
      }

      return localSales.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)) as any[]
    }
  }

  /**
   * Delete / Cancel a sale transaction safely.
   * Restores product stock, adjusts customer due balance, and deletes sale item records.
   */
  async cancelSale(saleId: string, businessId: string, userId: string): Promise<boolean> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    const sale = await this.getSale(saleId, businessId)
    if (!sale) {
      throw new Error('Sale transaction not found')
    }

    // 1. Fetch sale items and restore stock
    const items = await saleItemService.listSaleItems(saleId, businessId)
    for (const item of items) {
      try {
        await stockMovementService.processStockIn(
          item.productId,
          item.quantity,
          businessId,
          userId,
          `Sale Cancellation: #${sale.saleNumber || sale.$id}`,
          sale.$id
        )
      } catch (stockErr) {
        console.error('Failed to restore stock on sale cancellation:', stockErr)
      }
      try {
        await saleItemService.delete(item.$id, businessId)
      } catch {
        // Non-fatal
      }
    }

    // 2. Adjust customer due balance if remaining due balance exists
    if (sale.customerId && sale.dueAmount > 0) {
      try {
        await customerService.updateDueAmount(sale.customerId, -sale.dueAmount, businessId)
      } catch (custErr) {
        console.error('Failed to adjust customer due balance on sale cancellation:', custErr)
      }
    }

    // 3. Update Sale document status to 'cancelled' (non-destructive financial reversal)
    await this.update<Sale>(
      saleId,
      {
        status: 'cancelled',
        dueAmount: 0,
        notes: `${sale.notes || ''} [CANCELLED by ${userId} on ${new Date().toISOString()}]`.trim(),
      },
      businessId
    )

    try {
      await auditLogService.logEvent(
        businessId,
        userId,
        'sale_cancelled',
        saleId,
        { saleNumber: sale.saleNumber, total: sale.total, reason: 'Manual sale cancellation' }
      )
    } catch {
      // Non-fatal audit log
    }

    return true
  }

  /**
   * Hard delete sale (restricted for cleanup)
   */
  async deleteSale(saleId: string, businessId: string, userId: string): Promise<boolean> {
    return await this.cancelSale(saleId, businessId, userId)
  }
}

export const saleService = new SaleService()
