import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { StockMovement, StockMovementType } from '@/types'
import { Query } from 'appwrite'
import { productService } from './product.service'
import { authorizeBusinessAccess } from '@/lib/authorization'

/**
 * Stock Movement Service
 * 
 * Manages inventory change tracking and audit trail.
 * Records are IMMUTABLE audit logs created during stock transactions.
 * Generic update and delete methods are EXPLICITLY REJECTED.
 */
export class StockMovementService extends BaseService {
  constructor() {
    super(COLLECTIONS.STOCK_MOVEMENTS)
  }

  /**
   * Explicitly override update to reject mutating historical stock movement audit records
   */
  async update<T>(_id: string, _data: any, _businessId: string): Promise<T> {
    throw new Error('Forbidden: Stock movement records are immutable audit logs and cannot be updated')
  }

  /**
   * Explicitly override delete to reject deleting historical stock movement audit records
   */
  async delete(_id: string, _businessId: string): Promise<boolean> {
    throw new Error('Forbidden: Stock movement records are immutable audit logs and cannot be deleted')
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
    if (typeof data.quantity !== 'number' || isNaN(data.quantity) || !isFinite(data.quantity) || data.quantity <= 0) {
      throw new Error('Stock movement quantity must be a positive finite number greater than zero')
    }

    // Require database-verified RBAC check
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    let retries = 3
    while (retries > 0) {
      try {
        return await productService.withStockLock(data.productId, async () => {
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
            newQuantity = data.quantity
            if (newQuantity < 0) {
              throw new Error('Target stock quantity for adjustment cannot be negative')
            }
          }

          // 1. Update product stock quantity atomically with CAS check
          await productService.updateStockWithCAS(
            data.productId,
            previousQuantity,
            newQuantity,
            businessId,
            data.type === 'stock_out' ? data.quantity : 0
          )

          // 2. Create movement record after successful CAS update
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
          return movement
        })
      } catch (err: any) {
        if (err?.message?.includes('CONCURRENCY_CONFLICT') && retries > 1) {
          retries--
          continue
        }
        throw err
      }
    }

    throw new Error('Stock movement concurrency conflict. Please retry the transaction.')
  }

  /**
   * Internal-only helper: Log an explicit stock movement record without mutating product stock
   * Restricted for system initialization and migration logic ONLY.
   */
  async createRawMovement(
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
    userId: string,
    isInternalCall: boolean = false
  ): Promise<StockMovement> {
    if (!isInternalCall) {
      throw new Error('Forbidden: createRawMovement is an internal-only audit logger and cannot be called directly')
    }
    return await this.create<StockMovement>(data, businessId, userId)
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
      Query.orderDesc('createdAt'),
      Query.limit(100)
    ])
  }

  /**
   * Get stock movements for a business
   */
  async getStockMovements(
    businessId: string,
    filters?: {
      productId?: string
      type?: StockMovementType
      limit?: number
    }
  ): Promise<StockMovement[]> {
    const limit = filters?.limit || 200
    const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

    if (filters?.productId) {
      queries.push(Query.equal('productId', filters.productId))
    }

    if (filters?.type) {
      queries.push(Query.equal('type', filters.type))
    }

    return await this.list<StockMovement>(businessId, queries)
  }

  async listMovements(
    businessId: string,
    filters?: {
      productId?: string
      type?: StockMovementType
      limit?: number
    }
  ): Promise<StockMovement[]> {
    return this.getStockMovements(businessId, filters)
  }

  /**
   * Fetch 100% of matching stock movements using chunked pagination (no silent truncation up to max limit)
   * Strictly enforces tenant isolation and optional date range, product, and type filters.
   */
  async fetchAllMovements(
    businessId: string,
    filters?: {
      productId?: string
      type?: StockMovementType | 'ALL'
      dateFrom?: string
      dateTo?: string
      maxLimit?: number
    },
    userId?: string
  ): Promise<StockMovement[]> {
    if (userId) {
      await authorizeBusinessAccess({
        userId,
        businessId,
        requiredRole: ['owner', 'admin', 'staff'],
      })
    }

    const chunkSize = 100
    const maxRecords = filters?.maxLimit || 5000
    const allRecords: StockMovement[] = []
    let offset = 0

    while (allRecords.length < maxRecords) {
      const queries: any[] = [
        Query.orderDesc('createdAt'),
        Query.limit(chunkSize),
        Query.offset(offset),
      ]

      if (filters?.productId && filters.productId !== 'ALL') {
        queries.push(Query.equal('productId', filters.productId))
      }

      if (filters?.type && filters.type !== 'ALL') {
        queries.push(Query.equal('type', filters.type))
      }

      const chunk = await this.list<StockMovement>(businessId, queries)
      if (!chunk || chunk.length === 0) {
        break
      }

      allRecords.push(...chunk)

      if (chunk.length < chunkSize) {
        break
      }

      offset += chunkSize
    }

    // Apply date range filtering in-memory
    let result = allRecords

    if (filters?.dateFrom) {
      const fromTime = new Date(filters.dateFrom).getTime()
      result = result.filter((m) => new Date(m.createdAt).getTime() >= fromTime)
    }

    if (filters?.dateTo) {
      const toDate = new Date(filters.dateTo)
      if (filters.dateTo.length <= 10) {
        toDate.setHours(23, 59, 59, 999)
      }
      const toTime = toDate.getTime()
      result = result.filter((m) => new Date(m.createdAt).getTime() <= toTime)
    }

    return result
  }

  /**
   * Alias for fetching movement history
   */
  async getMovementHistory(businessId: string): Promise<StockMovement[]> {
    return this.fetchAllMovements(businessId)
  }
}

export const stockMovementService = new StockMovementService()
