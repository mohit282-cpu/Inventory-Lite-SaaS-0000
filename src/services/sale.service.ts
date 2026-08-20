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

export class SaleService extends BaseService {
  constructor() {
    super(COLLECTIONS.SALES)
  }

  /**
   * Create a complete sale transaction with server-side price validation,
   * financial invariant checks, and atomic compensating rollbacks.
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
    },
    businessId: string,
    userId: string
  ): Promise<{ sale: Sale; items: any[]; invoice?: any }> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Sale must include at least one item')
    }

    // 1. Fetch trusted product data & validate available stock
    const validatedItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      productName: string;
    }> = []

    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new Error('Item quantity must be greater than zero')
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

      // Server-side price authority (use database sellingPrice unless explicit cashier unitPrice is valid)
      const trustedUnitPrice = item.unitPrice !== undefined && item.unitPrice >= 0 ? item.unitPrice : product.sellingPrice

      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: trustedUnitPrice,
        discount: item.discount || 0,
        productName: product.name,
      })
    }

    // 2. Server-Side Totals Recalculation (Prevents client total manipulation)
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
    const saleNumber = `SALE-${Date.now().toString().slice(-6)}`

    // 3. Create Sale document
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
      // 4. Persist SaleItem documents
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

      // 5. Record stock movement (stock_out) and deduct stock
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

      // 6. Update customer due amount if sale has remaining due balance
      if (data.customerId && data.customerId.trim() !== '' && totals.dueAmount > 0) {
        await customerService.updateDueAmount(data.customerId, totals.dueAmount, businessId)
      }

      // 7. Generate invoice for sale
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
  }

  /**
   * Get sale by ID
   */
  async getSale(saleId: string, businessId: string): Promise<Sale> {
    return await this.getById<Sale>(saleId, businessId)
  }

  /**
   * List sales for a business
   */
  async listSales(
    businessId: string,
    filters?: {
      customerId?: string
      status?: SaleStatus
      paymentMethod?: PaymentMethod
    }
  ): Promise<Sale[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]

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
