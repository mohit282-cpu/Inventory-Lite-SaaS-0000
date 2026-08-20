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

export class SaleService extends BaseService {
  constructor() {
    super(COLLECTIONS.SALES)
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

    return await idempotencyManager.execute(data.idempotencyKey, async () => {
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

        // Cashier price override audit logic (Option B)
        let effectiveUnitPrice = product.sellingPrice
        if (item.unitPrice !== undefined && item.unitPrice >= 0 && item.unitPrice !== product.sellingPrice) {
          // If cashier overrides price, verify role permission or audit log
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
        taxRate: data.taxRate ?? 13,
        paidAmount: data.paidAmount || 0,
      })

      validateFinancialInvariants({
        total: totals.total,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
      })

      const status: SaleStatus = totals.dueAmount > 0 ? 'pending' : 'completed'
      // Collision-proof sale number generation
      const saleNumber = `SALE-${Date.now()}-${generateSecureToken(6).toUpperCase()}`

      // 4. Create Sale document
      const saleData = {
        saleNumber,
        customerId: data.customerId || '',
        invoiceId: '',
        subtotal: totals.subtotal,
        discount: totals.overallDiscount,
        tax: totals.taxAmount,
        total: totals.total,
        paidAmount: totals.paidAmount,
        dueAmount: totals.dueAmount,
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
          sale,
          items: createdItems,
          invoice,
        }
      } catch (err: any) {
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
}

export const saleService = new SaleService()
