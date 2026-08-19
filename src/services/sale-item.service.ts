import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { SaleItem } from '@/types'
import { Query } from 'appwrite'

/**
 * Sale Item Service
 * 
 * Handles individual line items within a sale transaction.
 * Stores product name and price snapshots for historical audit integrity.
 */
export class SaleItemService extends BaseService {
  constructor() {
    super(COLLECTIONS.SALE_ITEMS)
  }

  /**
   * Create sale items in batch for a given sale
   */
  async createSaleItems(
    items: Array<{
      saleId: string
      productId: string
      productNameSnapshot: string
      quantity: number
      unitPrice: number
      discount: number
      total: number
    }>,
    businessId: string,
    userId: string
  ): Promise<SaleItem[]> {
    const createdItems: SaleItem[] = []

    for (const item of items) {
      const created = await this.create<SaleItem>(
        {
          saleId: item.saleId,
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: item.total,
        },
        businessId,
        userId
      )
      createdItems.push(created)
    }

    return createdItems
  }

  /**
   * List all sale items for a specific sale
   */
  async getSaleItemsBySaleId(saleId: string, businessId: string): Promise<SaleItem[]> {
    return await this.list<SaleItem>(businessId, [
      Query.equal('saleId', saleId)
    ])
  }

  /**
   * List all sale items for a specific sale (alias)
   */
  async listSaleItems(saleId: string, businessId: string): Promise<SaleItem[]> {
    return await this.getSaleItemsBySaleId(saleId, businessId)
  }

  /**
   * List sale items for a product (history tracking)
   */
  async getSaleItemsByProductId(productId: string, businessId: string): Promise<SaleItem[]> {
    return await this.list<SaleItem>(businessId, [
      Query.equal('productId', productId)
    ])
  }
}

export const saleItemService = new SaleItemService()
