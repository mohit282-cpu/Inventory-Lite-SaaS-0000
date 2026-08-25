import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { SalesReturn, SalesReturnItem } from '@/types'
import { Query } from 'appwrite'
import { saleService } from './sale.service'
import { saleItemService } from './sale-item.service'
import { stockMovementService } from './stock-movement.service'
import { customerService } from './customer.service'
import { numberingService } from './numbering.service'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { toMinorUnits, fromMinorUnits } from '@/lib/money'
import { auditLogService } from './audit-log.service'
import { idempotencyManager } from '@/lib/idempotency'

export class SalesReturnItemService extends BaseService {
  constructor() {
    super(COLLECTIONS.SALES_RETURN_ITEMS)
  }

  async listReturnItems(salesReturnId: string, businessId: string): Promise<SalesReturnItem[]> {
    return await this.list<SalesReturnItem>(businessId, [Query.equal('salesReturnId', salesReturnId)])
  }
}

export const salesReturnItemService = new SalesReturnItemService()

export class SalesReturnService extends BaseService {
  constructor() {
    super(COLLECTIONS.SALES_RETURNS)
  }

  /**
   * Allocate sequential sales return number: SR-83/84-000001
   */
  async generateNextReturnNumber(businessId: string, dateInput?: string | Date): Promise<string> {
    const allocated = await numberingService.allocateNextNumber(businessId, 'SALES_RETURN', dateInput)
    return allocated.formattedNumber
  }

  /**
   * Get all previous sales returns for a given sale
   */
  async getReturnsForSale(saleId: string, businessId: string): Promise<SalesReturn[]> {
    return await this.list<SalesReturn>(businessId, [Query.equal('saleId', saleId)])
  }

  /**
   * Process a Sales Return
   */
  async createSalesReturn(
    data: {
      saleId: string
      items: Array<{
        saleItemId: string
        productId: string
        quantity: number
        unitPrice?: number
      }>
      reason: string
      refundMethod?: 'cash' | 'credit_adjustment' | 'bank_transfer' | 'digital_wallet' | 'other'
      idempotencyKey?: string
    },
    businessId: string,
    userId: string
  ): Promise<{ salesReturn: SalesReturn; items: SalesReturnItem[] }> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Sales return must include at least one item')
    }

    if (!data.reason || data.reason.trim() === '') {
      throw new Error('Sales return reason is required')
    }

    const sale = await saleService.getSale(data.saleId, businessId)
    if (!sale) {
      throw new Error('Original sale transaction not found')
    }

    if (sale.status === 'cancelled') {
      throw new Error('Cannot process return for a cancelled sale transaction')
    }

    const persistentCheck = async (): Promise<{ salesReturn: SalesReturn; items: SalesReturnItem[] } | null> => {
      if (!data.idempotencyKey) return null
      const existingReturns = await this.getReturnsForSale(data.saleId, businessId)
      const match = existingReturns.find((r) => (r as any).referenceId === data.idempotencyKey || r.reason?.includes(data.idempotencyKey!))
      if (match) {
        const items = await salesReturnItemService.listReturnItems(match.$id, businessId)
        return { salesReturn: match, items }
      }
      return null
    }

    return await idempotencyManager.executeIdempotentTransaction(
      {
        idempotencyKey: data.idempotencyKey,
        businessId,
        operationType: 'create_sales_return',
        payload: data,
        resourceType: 'sales_return',
      },
      persistentCheck,
      async () => {
        // Fetch all items from the original sale
        const originalSaleItems = await saleItemService.listSaleItems(data.saleId, businessId)
        const saleItemMap = new Map(originalSaleItems.map((item) => [item.$id, item]))

        // Fetch all previous returns for this sale to compute total returned quantity per item
        const previousReturns = await this.getReturnsForSale(data.saleId, businessId)
        const previouslyReturnedQtyMap = new Map<string, number>()

        for (const ret of previousReturns) {
          const retItems = await salesReturnItemService.listReturnItems(ret.$id, businessId)
          for (const ri of retItems) {
            const curr = previouslyReturnedQtyMap.get(ri.saleItemId) || 0
            previouslyReturnedQtyMap.set(ri.saleItemId, curr + ri.quantity)
          }
        }

        let totalReturnAmountP = 0
        const validatedReturnItems: Array<{
          saleItemId: string
          productId: string
          quantity: number
          unitPrice: number
          lineTotal: number
          productNameSnapshot: string
        }> = []

        for (const item of data.items) {
          if (typeof item.quantity !== 'number' || isNaN(item.quantity) || !isFinite(item.quantity) || item.quantity <= 0) {
            throw new Error('Return item quantity must be a positive number greater than zero')
          }

          const originalItem = saleItemMap.get(item.saleItemId)
          if (!originalItem) {
            throw new Error(`Sale item ID '${item.saleItemId}' does not belong to original sale '${sale.saleNumber || sale.$id}'`)
          }

          if (originalItem.productId !== item.productId) {
            throw new Error(`Product ID mismatch for sale item '${item.saleItemId}'`)
          }

          const prevReturned = previouslyReturnedQtyMap.get(item.saleItemId) || 0
          const allowableQty = originalItem.quantity - prevReturned

          if (item.quantity > allowableQty) {
            throw new Error(
              `Return quantity (${item.quantity}) exceeds remaining returnable quantity (${allowableQty}) for product "${originalItem.productNameSnapshot}"`
            )
          }

          // Effective unit price derived from original sale item
          const effectiveUnitPrice = item.unitPrice !== undefined ? item.unitPrice : originalItem.unitPrice
          const lineTotalP = toMinorUnits(item.quantity * effectiveUnitPrice)
          totalReturnAmountP += lineTotalP

          validatedReturnItems.push({
            saleItemId: item.saleItemId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: effectiveUnitPrice,
            lineTotal: fromMinorUnits(lineTotalP),
            productNameSnapshot: originalItem.productNameSnapshot,
          })
        }

        const returnNumber = await this.generateNextReturnNumber(businessId)

        const salesReturnData = {
          returnNumber,
          saleId: data.saleId,
          saleNumber: sale.saleNumber || `SALE-${sale.$id.slice(-6)}`,
          customerId: sale.customerId || '',
          subtotal: fromMinorUnits(totalReturnAmountP),
          discount: 0,
          tax: 0,
          totalAmount: fromMinorUnits(totalReturnAmountP),
          reason: data.reason.trim(),
          refundMethod: data.refundMethod || 'cash',
          createdBy: userId,
        }

        const salesReturn = await this.create<SalesReturn>(salesReturnData, businessId, userId)

        const createdReturnItems: SalesReturnItem[] = []
        for (const item of validatedReturnItems) {
          const itemDoc = await salesReturnItemService.create<SalesReturnItem>(
            {
              salesReturnId: salesReturn.$id,
              saleItemId: item.saleItemId,
              productId: item.productId,
              productNameSnapshot: item.productNameSnapshot,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.lineTotal,
            },
            businessId,
            userId
          )
          createdReturnItems.push(itemDoc)

          // Restore stock via Stock IN (type: stock_in / SALES_RETURN_IN)
          await stockMovementService.processStockIn(
            item.productId,
            item.quantity,
            businessId,
            userId,
            `Sales Return #${salesReturn.returnNumber} (Sale #${sale.saleNumber || sale.$id})`,
            salesReturn.$id
          )
        }

        // Customer credit/due balance adjustment if sale was on credit
        if (sale.customerId && sale.customerId.trim() !== '' && sale.dueAmount > 0) {
          const returnAmount = fromMinorUnits(totalReturnAmountP)
          const dueAdjustment = Math.min(sale.dueAmount, returnAmount)
          try {
            await customerService.updateDueAmount(sale.customerId, -dueAdjustment, businessId)
          } catch (custErr) {
            console.error('Failed to adjust customer due balance on sales return:', custErr)
          }
        }

        try {
          await auditLogService.logEvent(businessId, userId, 'sales_return_created', salesReturn.$id, {
            returnNumber: salesReturn.returnNumber,
            saleId: data.saleId,
            totalAmount: salesReturn.totalAmount,
            reason: salesReturn.reason,
          })
        } catch {}

        return { salesReturn, items: createdReturnItems }
      }
    )
  }

  /**
   * Get sales return by ID
   */
  async getSalesReturn(salesReturnId: string, businessId: string): Promise<SalesReturn> {
    return await this.getById<SalesReturn>(salesReturnId, businessId)
  }

  /**
   * List sales returns for a business
   */
  async listSalesReturns(
    businessId: string,
    filters?: {
      saleId?: string
      customerId?: string
      limit?: number
    }
  ): Promise<SalesReturn[]> {
    const limit = filters?.limit || 200
    const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

    if (filters?.saleId) {
      queries.push(Query.equal('saleId', filters.saleId))
    }

    if (filters?.customerId) {
      queries.push(Query.equal('customerId', filters.customerId))
    }

    return await this.list<SalesReturn>(businessId, queries)
  }

  /**
   * List ALL sales returns for a business (for reporting)
   */
  async listAllSalesReturns(
    businessId: string,
    filters?: {
      dateFrom?: string
      dateTo?: string
    }
  ): Promise<SalesReturn[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]

    if (filters?.dateFrom) {
      queries.push(Query.greaterThanEqual('createdAt', filters.dateFrom))
    }

    if (filters?.dateTo) {
      queries.push(Query.lessThanEqual('createdAt', filters.dateTo))
    }

    return await this.listAll<SalesReturn>(businessId, queries)
  }
}

export const salesReturnService = new SalesReturnService()
