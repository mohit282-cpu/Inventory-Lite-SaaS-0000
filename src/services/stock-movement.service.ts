import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { StockMovement, StockMovementType } from '@/types'
import { Query } from 'appwrite'
import { productService } from './product.service'

/**
 * Stock Movement Service
 * 
 * Handles stock movement operations with tenant isolation.
 * Tracks all inventory changes with proper audit trail.
 * Ensures data integrity with transaction-like operations.
 */
export class StockMovementService extends BaseService {
  constructor() {
    super(COLLECTIONS.STOCK_MOVEMENTS)
  }

  /**
   * Create a stock movement record
   * @param data - Stock movement data
   * @param businessId - Business ID for tenant isolation
   * @param userId - User ID creating the movement
   */
  async createStockMovement(
    data: {
      productId: string
      type: StockMovementType
      quantity: number
      previousQuantity: number
      newQuantity: number
      reason?: string
      referenceId?: string
    },
    businessId: string,
    userId: string
  ): Promise<StockMovement> {
    return await this.create(data, businessId, userId) as StockMovement
  }

  /**
   * Get stock movement by ID
   * @param movementId - Stock movement ID
   * @param businessId - Business ID for tenant isolation
   */
  async getStockMovement(movementId: string, businessId: string): Promise<StockMovement> {
    return await this.getById(movementId, businessId) as StockMovement
  }

  /**
   * List stock movements for a business
   * @param businessId - Business ID for tenant isolation
   * @param filters - Optional filters
   */
  async listStockMovements(
    businessId: string,
    filters?: {
      productId?: string
      type?: StockMovementType
      startDate?: string
      endDate?: string
    }
  ): Promise<StockMovement[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]

    if (filters?.productId) {
      queries.push(Query.equal('productId', filters.productId))
    }

    if (filters?.type) {
      queries.push(Query.equal('type', filters.type))
    }

    if (filters?.startDate) {
      queries.push(Query.greaterThanEqual('createdAt', filters.startDate))
    }

    if (filters?.endDate) {
      queries.push(Query.lessThanEqual('createdAt', filters.endDate))
    }

    const result = await this.list(businessId, queries)
    return result.documents as StockMovement[]
  }

  /**
   * Process stock in (add stock)
   * @param productId - Product ID
   * @param quantity - Quantity to add
   * @param businessId - Business ID for tenant isolation
   * @param userId - User ID processing the movement
   * @param reason - Reason for stock in
   * @param referenceId - Optional reference ID (e.g., purchase order)
   */
  async processStockIn(
    productId: string,
    quantity: number,
    businessId: string,
    userId: string,
    reason?: string,
    referenceId?: string
  ): Promise<{ movement: StockMovement; product: any }> {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive for stock in')
    }

    // Get current product
    const product = await productService.getProduct(productId, businessId)
    const previousQuantity = product.stockQuantity
    const newQuantity = previousQuantity + quantity

    // Update product stock
    await productService.updateProduct(productId, { stockQuantity: newQuantity }, businessId)

    // Create stock movement record
    const movement = await this.createStockMovement(
      {
        productId,
        type: 'stock_in',
        quantity,
        previousQuantity,
        newQuantity,
        reason,
        referenceId,
      },
      businessId,
      userId
    )

    return { movement, product: await productService.getProduct(productId, businessId) }
  }

  /**
   * Process stock out (remove stock)
   * @param productId - Product ID
   * @param quantity - Quantity to remove
   * @param businessId - Business ID for tenant isolation
   * @param userId - User ID processing the movement
   * @param reason - Reason for stock out
   * @param referenceId - Optional reference ID (e.g., sale ID)
   */
  async processStockOut(
    productId: string,
    quantity: number,
    businessId: string,
    userId: string,
    reason?: string,
    referenceId?: string
  ): Promise<{ movement: StockMovement; product: any }> {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive for stock out')
    }

    // Get current product
    const product = await productService.getProduct(productId, businessId)
    const previousQuantity = product.stockQuantity

    if (previousQuantity < quantity) {
      throw new Error(`Insufficient stock. Available: ${previousQuantity}, Requested: ${quantity}`)
    }

    const newQuantity = previousQuantity - quantity

    // Update product stock
    await productService.updateProduct(productId, { stockQuantity: newQuantity }, businessId)

    // Create stock movement record
    const movement = await this.createStockMovement(
      {
        productId,
        type: 'stock_out',
        quantity,
        previousQuantity,
        newQuantity,
        reason,
        referenceId,
      },
      businessId,
      userId
    )

    return { movement, product: await productService.getProduct(productId, businessId) }
  }

  /**
   * Process stock adjustment (manual correction)
   * @param productId - Product ID
   * @param newQuantity - New quantity to set
   * @param businessId - Business ID for tenant isolation
   * @param userId - User ID processing the movement
   * @param reason - Reason for adjustment
   */
  async processStockAdjustment(
    productId: string,
    newQuantity: number,
    businessId: string,
    userId: string,
    reason?: string
  ): Promise<{ movement: StockMovement; product: any }> {
    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative')
    }

    // Get current product
    const product = await productService.getProduct(productId, businessId)
    const previousQuantity = product.stockQuantity
    const quantity = Math.abs(newQuantity - previousQuantity)
    const type = newQuantity > previousQuantity ? 'stock_in' : 'stock_out'

    // Update product stock
    await productService.updateProduct(productId, { stockQuantity: newQuantity }, businessId)

    // Create stock movement record
    const movement = await this.createStockMovement(
      {
        productId,
        type: 'adjustment',
        quantity,
        previousQuantity,
        newQuantity,
        reason,
      },
      businessId,
      userId
    )

    return { movement, product: await productService.getProduct(productId, businessId) }
  }

  /**
   * Get stock movements for a specific product
   * @param productId - Product ID
   * @param businessId - Business ID for tenant isolation
   */
  async getProductStockMovements(productId: string, businessId: string): Promise<StockMovement[]> {
    return await this.listStockMovements(businessId, { productId })
  }

  /**
   * Get recent stock movements
   * @param businessId - Business ID for tenant isolation
   * @param limit - Number of movements to return
   */
  async getRecentStockMovements(businessId: string, limit: number = 50): Promise<StockMovement[]> {
    const result = await this.list(businessId, [
      Query.limit(limit),
      Query.orderDesc('createdAt')
    ])
    return result.documents as StockMovement[]
  }
}

export const stockMovementService = new StockMovementService()
