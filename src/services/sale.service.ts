import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Sale, SaleStatus, PaymentMethod } from '@/types'
import { Query } from 'appwrite'
import { saleItemService } from './sale-item.service'
import { stockMovementService } from './stock-movement.service'
import { productService } from './product.service'
import { customerService } from './customer.service'
import { invoiceService } from './invoice.service'

/**
 * Sale Service
 * 
 * Handles complete sales transactions with tenant isolation, snapshot preservation,
 * stock movement audit trails, and invoice creation.
 */
export class SaleService extends BaseService {
  constructor() {
    super(COLLECTIONS.SALES)
  }

  /**
   * Create a complete sale transaction
   */
  async createSale(
    data: {
      customerId?: string
      items: Array<{
        productId: string
        quantity: number
        unitPrice: number
        discount: number
      }>
      discount?: number
      tax?: number
      paidAmount: number
      paymentMethod: PaymentMethod
    },
    businessId: string,
    userId: string
  ): Promise<{ sale: Sale; items: any[]; invoice?: any }> {
    if (data.items.length === 0) {
      throw new Error('Sale must include at least one item')
    }

    // 1. Calculate subtotal and build items with snapshots
    let subtotal = 0
    const processedItems: Array<{
      saleId: string
      productId: string
      productNameSnapshot: string
      quantity: number
      unitPrice: number
      discount: number
      total: number
    }> = []

    for (const item of data.items) {
      const product = await productService.getProduct(item.productId, businessId)
      const itemTotal = item.quantity * item.unitPrice - item.discount
      subtotal += itemTotal

      processedItems.push({
        saleId: '', // Set after sale record is created
        productId: item.productId,
        productNameSnapshot: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: itemTotal,
      })
    }

    const discount = data.discount ?? 0
    const tax = data.tax ?? 0
    const total = subtotal + tax - discount
    const dueAmount = Math.max(0, total - data.paidAmount)
    const status: SaleStatus = dueAmount > 0 ? 'pending' : 'completed'

    // 2. Create Sale document
    const saleData = {
      customerId: data.customerId || '',
      invoiceId: '',
      subtotal,
      discount,
      tax,
      total,
      paidAmount: data.paidAmount,
      dueAmount,
      paymentMethod: data.paymentMethod,
      status,
      createdBy: userId,
    }

    const sale = await this.create<Sale>(saleData, businessId, userId)

    // 3. Update sale ID in processed items and persist SaleItem documents
    for (const item of processedItems) {
      item.saleId = sale.$id
    }
    const createdItems = await saleItemService.createSaleItems(processedItems, businessId, userId)

    // 4. Record stock movement (stock_out) for each item
    for (const item of data.items) {
      await stockMovementService.processStockOut(
        item.productId,
        item.quantity,
        businessId,
        userId,
        `Sale ${sale.$id}`,
        sale.$id
      )
    }

    // 5. Update customer due amount if sale has remaining due balance
    if (data.customerId && data.customerId.trim() !== '' && dueAmount > 0) {
      await customerService.updateDueAmount(data.customerId, dueAmount, businessId)
    }

    // 6. Generate invoice for sale
    const invoice = await invoiceService.createInvoice(
      {
        saleId: sale.$id,
        issueDate: new Date().toISOString(),
      },
      businessId,
      userId
    )

    // 7. Update Sale document with invoice ID
    const updatedSale = await this.update<Sale>(sale.$id, { invoiceId: invoice.$id }, businessId)

    return {
      sale: updatedSale,
      items: createdItems,
      invoice,
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

  /**
   * Process payment for an existing sale with due balance
   */
  async recordPayment(
    saleId: string,
    paymentAmount: number,
    businessId: string
  ): Promise<Sale> {
    const sale = await this.getSale(saleId, businessId)
    if (paymentAmount <= 0) {
      throw new Error('Payment amount must be greater than zero')
    }

    const newPaidAmount = sale.paidAmount + paymentAmount
    const newDueAmount = Math.max(0, sale.total - newPaidAmount)
    const newStatus: SaleStatus = newDueAmount === 0 ? 'completed' : sale.status

    // Update customer due amount if customer was linked
    if (sale.customerId && sale.customerId.trim() !== '') {
      await customerService.updateDueAmount(sale.customerId, -paymentAmount, businessId)
    }

    return await this.update<Sale>(
      saleId,
      {
        paidAmount: newPaidAmount,
        dueAmount: newDueAmount,
        status: newStatus,
      },
      businessId
    )
  }
}

export const saleService = new SaleService()
