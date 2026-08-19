import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { StockMovement, StockMovementType } from '@/types'
import { Query } from 'appwrite'
import { productService } from './product.service'

/**
 * Stock Movement Service
 * 
 * Manages inventory change tracking and audit trail.
 * Records are immutable audit logs created during stock transactions.
 */
export class StockMovementService extends BaseService {
  constructor() {
    super(COLLECTIONS.STOCK_MOVEMENTS)
  }

  /**
   * Create a new stock movement record and update the product stock quantity
   */
  async createMovement(
    data: {
      productId: string
      type: StockMovementType
      quantity: number
      reason?: string
      referenceId?: string
    },
    businessId: string,
    userId: string
  ): Promise<StockMovement> {
    if (data.quantity <= 0) {
      throw new Error('Stock movement quantity must be greater than zero')
    }

    const product = await productService.getProduct(data.productId, businessId)
    const previousQuantity = product.stockQuantity
    let newQuantity = previousQuantity

    if (data.type === 'stock_in') {
      newQuantity = previousQuantity + data.quantity
    } else if (data.type === 'stock_out') {
      if (previousQuantity < data.quantity) {
        throw new Error(`Insufficient stock for product "${product.name}". Available: ${previousQuantity}, Requested: ${data.quantity}`)
      }
      newQuantity = previousQuantity - data.quantity
    } else if (data.type === 'adjustment') {
      newQuantity = data.quantity // For adjustment, quantity argument is the target absolute stock
      if (newQuantity < 0) {
        throw new Error('Target stock quantity for adjustment cannot be negative')
      }
    }

    // 1. Create movement record
    const movementData = {
      productId: data.productId,
      type: data.type,
      quantity: data.type === 'adjustment' ? Math.abs(newQuantity - previousQuantity) : data.quantity,
      previousQuantity,
      newQuantity,
      reason: data.reason || '',
      referenceId: data.referenceId || '',
      createdBy: userId,
    }

    const movement = await this.create<StockMovement>(movementData, businessId, userId)

    // 2. Update product stock quantity
    await productService.updateStockQuantity(data.productId, newQuantity, businessId)

    return movement
  }

  /**
   * Process stock in
   */
  async processStockIn(
    productId: string,
    quantity: number,
    businessId: string,
    userId: string,
    reason?: string,
    referenceId?: string
  ): Promise<StockMovement> {
    return await this.createMovement(
      {
        productId,
        type: 'stock_in',
        quantity,
        reason,
        referenceId,
      },
      businessId,
      userId
    )
  }

  /**
   * Process stock out
   */
  async processStockOut(
    productId: string,
    quantity: number,
    businessId: string,
    userId: string,
    reason?: string,
    referenceId?: string
  ): Promise<StockMovement> {
    return await this.createMovement(
      {
        productId,
        type: 'stock_out',
        quantity,
        reason,
        referenceId,
      },
      businessId,
      userId
    )
  }

  /**
   * Process stock adjustment
   */
  async processAdjustment(
    productId: string,
    newQuantity: number,
    businessId: string,
    userId: string,
    reason?: string,
    referenceId?: string
  ): Promise<StockMovement> {
    return await this.createMovement(
      {
        productId,
        type: 'adjustment',
        quantity: newQuantity,
        reason,
        referenceId,
      },
      businessId,
      userId
    )
  }

  /**
   * List movement history for a product within a business
   */
  async getProductHistory(productId: string, businessId: string): Promise<StockMovement[]> {
    return await this.list<StockMovement>(businessId, [
      Query.equal('productId', productId),
      Query.orderDesc('createdAt')
    ])
  }

  /**
   * List stock movements for a business
   */
  async listMovements(
    businessId: string,
    filters?: {
      productId?: string
      type?: StockMovementType
    }
  ): Promise<StockMovement[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]

    if (filters?.productId) {
      queries.push(Query.equal('productId', filters.productId))
    }

    if (filters?.type) {
      queries.push(Query.equal('type', filters.type))
    }

    return await this.list<StockMovement>(businessId, queries)
  }
}

export const stockMovementService = new StockMovementService()
