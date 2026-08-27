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
import { authorizeBusinessAccess } from '@/lib/authorization'
import { auditLogService } from './audit-log.service'
import { idempotencyManager, computePayloadHash } from '@/lib/idempotency'

import { numberingService } from './numbering.service'

export class SaleService extends BaseService {
  constructor() {
    super(COLLECTIONS.SALES)
  }

  /**
   * Helper to generate a sequential sale number per business starting from 1 every financial year.
   * Format: SALE-83/84-000001
   */
  async generateNextSaleNumber(businessId: string, dateInput?: string | Date): Promise<string> {
    const allocated = await numberingService.allocateNextNumber(businessId, 'SALE', dateInput)
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

    // Full Udhaar mandatory customer & tenant validation
    const isFullUdhaar = data.paymentMethod === 'full_udhaar'
    if (isFullUdhaar) {
      if (!data.customerId || data.customerId.trim() === '') {
        throw new Error('Please select a customer for Full Udhaar.')
      }
      const customer = await customerService.getCustomer(data.customerId, businessId)
      if (!customer || customer.businessId !== businessId) {
        throw new Error('Selected customer does not belong to this business')
      }
    }

    const persistentCheck = async (): Promise<{ sale: Sale; items: any[]; invoice?: any } | null> => {
      if (!data.idempotencyKey) return null
      const existingSales = await this.listSales(businessId)
      const matchedSale = existingSales.find(
        (s: any) => s.idempotencyKey === data.idempotencyKey || (s as any).referenceId === data.idempotencyKey
      )
      if (matchedSale) {
        const items = await saleItemService.listSaleItems(matchedSale.$id, businessId)
        return { sale: matchedSale, items }
      }
      return null
    }

    return await idempotencyManager.executeIdempotentTransaction(
      {
        idempotencyKey: data.idempotencyKey,
        businessId,
        operationType: 'create_sale',
        payload: data,
        resourceType: 'sale',
      },
      persistentCheck,
      async () => {
        // 2. Server-side product price verification
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
            throw new Error(`Product record '${item.productId}' not found or inaccessible`)
          }

          if (product.stockQuantity < item.quantity) {
            throw new Error(`Insufficient stock for product '${product.name}'. Available: ${product.stockQuantity}, Requested: ${item.quantity}`)
          }

          const catalogPrice = product.sellingPrice
          let effectiveUnitPrice = catalogPrice

          if (item.unitPrice !== undefined && Math.abs(item.unitPrice - catalogPrice) > 0.01) {
            if (authCtx.memberRole !== 'owner') {
              throw new Error('PRICE_OVERRIDE_NOT_AUTHORIZED: Cashiers cannot modify unit price.')
            }
            effectiveUnitPrice = item.unitPrice
            await auditLogService.logEvent(businessId, userId, 'price_override', product.$id, {
              productName: product.name,
              catalogPrice,
              overriddenPrice: effectiveUnitPrice,
            })
          }

          validatedItems.push({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: effectiveUnitPrice,
            discount: item.discount || 0,
            productName: product.name,
          })
        }

        // 3. Server-Side Totals Recalculation
        const effectivePaidAmount = isFullUdhaar ? 0 : (data.paidAmount || 0)
        const totals = calculateSaleTotals({
          items: validatedItems,
          discount: data.discount || 0,
          vatEnabled: data.vatEnabled ?? true,
          taxRate: data.taxRate ?? 13,
          paidAmount: effectivePaidAmount,
        })

        if (isFullUdhaar) {
          totals.paidAmount = 0
          totals.dueAmount = totals.total
          totals.changeAmount = 0
        }

        validateFinancialInvariants({
          total: totals.total,
          paidAmount: totals.paidAmount,
          dueAmount: totals.dueAmount,
        })

        const status: SaleStatus = totals.dueAmount > 0 ? 'pending' : 'completed'

      let sale: Sale | null = null
      let attempts = 0
      let lastErr: any = null

      while (attempts < 5 && !sale) {
        attempts++
        try {
          const saleNumber =
            (data as any).saleNumber ||
            (await this.generateNextSaleNumber(businessId, (data as any).createdAt))

          const isVatOn = data.vatEnabled ?? (data.taxRate !== undefined ? data.taxRate > 0 : totals.taxAmount > 0)
          const saleData = {
            saleNumber,
            customerId: data.customerId || '',
            invoiceId: '',
            invoiceStatus: 'PENDING',
            idempotencyKey:
              data.idempotencyKey && data.idempotencyKey.trim() !== ''
                ? data.idempotencyKey
                : `sale_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            requestHash: data.idempotencyKey ? computePayloadHash(data) : `hash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            subtotal: totals.subtotal,
            discount: totals.overallDiscount,
            discountType: data.discountType || (data.discountValue ? 'percentage' : 'fixed'),
            discountValue: data.discountValue ?? totals.overallDiscount,
            taxableAmount: totals.taxableAmount,
            vatAmount: totals.taxAmount,
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

          sale = await this.create<Sale>(saleData, businessId, userId)
        } catch (createErr: any) {
          lastErr = createErr
          const errMsg = String(createErr?.message || '')
          const isUniqueViolation =
            errMsg.includes('unique') ||
            errMsg.includes('violates') ||
            createErr?.code === 409

          if (isUniqueViolation && attempts < 5) {
            numberingService.resetInMemorySequences()
            await new Promise((resolve) => setTimeout(resolve, 50 * attempts))
            continue
          }
          throw createErr
        }
      }

      if (!sale) {
        throw lastErr || new Error('Failed to create sale transaction due to document constraint error')
      }

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

        // 6. Record stock movement (stock_out) and deduct stock in parallel
        await Promise.all(
          validatedItems.map(async (item) => {
            await stockMovementService.processStockOut(
              item.productId,
              item.quantity,
              businessId,
              userId,
              `Sale #${sale.saleNumber || sale.$id}`,
              sale.$id
            )
            processedDeductions.push({ productId: item.productId, quantity: item.quantity })
          })
        )

        // 7. Update customer due amount if sale has remaining due balance
        if (data.customerId && data.customerId.trim() !== '' && totals.dueAmount > 0) {
          await customerService.updateDueAmount(data.customerId, totals.dueAmount, businessId)
        }

        if (isFullUdhaar) {
          await auditLogService.logEvent(businessId, userId, 'full_udhaar_sale', sale.$id, {
            customerId: data.customerId,
            saleNumber: sale.saleNumber || sale.$id,
            udhaarAmount: totals.dueAmount,
          })
        }

        // 8. Generate invoice for sale with explicit invoiceStatus tracking
        let invoice: any = null
        try {
          invoice = await invoiceService.createInvoice(
            {
              saleId: sale.$id,
              issueDate: new Date().toISOString(),
              idempotencyKey: data.idempotencyKey ? `inv_${data.idempotencyKey}` : undefined,
            },
            businessId,
            userId
          )
          await this.update<Sale>(sale.$id, { invoiceId: invoice.$id, invoiceStatus: 'GENERATED' }, businessId)
        } catch (invErr: any) {
          console.warn('Invoice creation warning:', invErr)
          try {
            await this.update<Sale>(
              sale.$id,
              { invoiceStatus: 'FAILED', notes: `[Invoice Generation Failed: ${invErr.message || 'Error'}]` },
              businessId
            )
          } catch {}
        }

        // 9. Create accounting journal entry (non-blocking hook)
        try {
          const { hookSaleJournalEntry } = await import('@/lib/accounting-hooks')
          await hookSaleJournalEntry({
            businessId,
            userId,
            saleId: sale.$id,
            saleNumber: sale.saleNumber || sale.$id,
            date: new Date().toISOString().split('T')[0],
            paymentMethod: data.paymentMethod,
            subtotal: totals.subtotal,
            taxAmount: totals.taxAmount,
            total: totals.total,
            paidAmount: totals.paidAmount,
            dueAmount: totals.dueAmount,
            vatEnabled: data.vatEnabled ?? true,
          })
        } catch {
          // Non-critical — accounting hook failure should not break sale
        }

        return {
          sale: { ...sale, changeAmount: totals.changeAmount },
          items: createdItems,
          invoice,
        }
      } catch (err: any) {
        // COMPENSATING TRANSACTION ROLLBACK
        if (process.env.NODE_ENV !== 'test') {
          console.error('Sale transaction failed. Executing compensating rollback:', err)
        }

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
   * Get sale by ID
   */
  async getSale(saleId: string, businessId: string): Promise<Sale> {
    return await this.getById<Sale>(saleId, businessId)
  }

  /**
   * List sales for a business with pagination
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
  }

  /**
   * List ALL sales for a business within a date range (for reporting)
   */
  async listAllSales(
    businessId: string,
    filters?: {
      dateFrom?: string // ISO string
      dateTo?: string   // ISO string
      status?: SaleStatus
      customerId?: string
    }
  ): Promise<Sale[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]

    if (filters?.dateFrom) {
      queries.push(Query.greaterThanEqual('createdAt', filters.dateFrom))
    }
    if (filters?.dateTo) {
      queries.push(Query.lessThanEqual('createdAt', filters.dateTo))
    }
    if (filters?.status) {
      queries.push(Query.equal('status', filters.status))
    }
    if (filters?.customerId) {
      queries.push(Query.equal('customerId', filters.customerId))
    }

    return await this.listAll<Sale>(businessId, queries)
  }

  /**
   * Cancel / Void a sale transaction safely (Non-destructive).
   * Restores product stock, adjusts customer due balance, voids payments, and preserves item records.
   */
  async cancelSale(
    saleId: string,
    businessId: string,
    userId: string,
    reason: string = 'Manual bill cancellation'
  ): Promise<boolean> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    if (!reason || reason.trim() === '') {
      throw new Error('Cancellation reason is required')
    }

    const sale = await this.getSale(saleId, businessId)
    if (!sale) {
      throw new Error('Sale transaction not found')
    }

    if (sale.status === 'cancelled') {
      throw new Error('Sale transaction has already been cancelled')
    }

    const cancelledAt = new Date().toISOString()

    // 1. Fetch sale items and restore stock (compensating stock movement)
    const items = await saleItemService.listSaleItems(saleId, businessId)
    for (const item of items) {
      try {
        await stockMovementService.processStockIn(
          item.productId,
          item.quantity,
          businessId,
          userId,
          `Bill Void: Sale #${sale.saleNumber || sale.$id} (${reason})`,
          sale.$id
        )
      } catch (stockErr) {
        console.error('Failed to restore stock on sale cancellation:', stockErr)
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

    // 3. Void/Reverse any associated payment records
    try {
      const { paymentService } = await import('./payment.service')
      const payments = await paymentService.listPayments(businessId, { saleId })
      for (const p of payments) {
        if (p.status !== 'VOIDED' && p.status !== 'REVERSED') {
          await paymentService.reversePayment(p.$id, businessId, userId, `Bill voided: ${reason}`)
        }
      }
    } catch (payErr) {
      console.warn('Payment reversal warning on sale cancellation:', payErr)
    }

    // 4. Update Sale document status to 'cancelled' (preserving sale document and items)
    await this.update<Sale>(
      saleId,
      {
        status: 'cancelled',
        dueAmount: 0,
        cancelledBy: userId,
        cancelledAt,
        cancellationReason: reason.trim(),
        notes: `${sale.notes || ''} [CANCELLED by ${userId} on ${cancelledAt}: ${reason.trim()}]`.trim(),
      },
      businessId
    )

    try {
      await auditLogService.logEvent(
        businessId,
        userId,
        'sale_cancelled',
        saleId,
        { saleNumber: sale.saleNumber, total: sale.total, cancelledBy: userId, reason: reason.trim() }
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
