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
   * Log an explicit stock movement record without mutating product stock
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
    userId: string
  ): Promise<StockMovement> {
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
   * List stock movements for a business with pagination limit
   */
  async listMovements(
    businessId: string,
    filters?: {
      productId?: string
      type?: StockMovementType
      limit?: number
    }
  ): Promise<StockMovement[]> {
    try {
      const limit = filters?.limit || 200
      const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

      if (filters?.productId) {
        queries.push(Query.equal('productId', filters.productId))
      }

      if (filters?.type) {
        queries.push(Query.equal('type', filters.type))
      }

      const items = await this.list<StockMovement>(businessId, queries)

      // Caching locally in Dexie
      try {
        const { localDB } = await import('@/lib/offline/db')
        for (const item of items) {
          await localDB.stockMovements.put({
            id: item.$id,
            businessId: item.businessId,
            productId: item.productId,
            type: item.type,
            quantity: item.quantity,
            previousQuantity: item.previousQuantity,
            newQuantity: item.newQuantity,
            reason: item.reason,
            referenceId: item.referenceId,
            createdBy: item.createdBy,
            syncStatus: 'SYNCED',
            createdAt: item.createdAt || item.$createdAt,
          })
        }
      } catch {
        // Caching non-fatal
      }

      return items
    } catch (err: any) {
      const isOffline =
        typeof window !== 'undefined' &&
        (!navigator.onLine ||
          err.message?.includes('Network') ||
          err.message?.includes('fetch') ||
          err.message?.includes('offline'))

      if (isOffline) {
        try {
          const { localDB } = await import('@/lib/offline/db')
          const localMovs = await localDB.stockMovements
            .where('businessId')
            .equals(businessId)
            .toArray()

          localMovs.sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          )

          let filtered = localMovs
          if (filters?.productId) {
            filtered = filtered.filter((m) => m.productId === filters.productId)
          }
          if (filters?.type) {
            filtered = filtered.filter((m) => m.type === filters.type)
          }

          return filtered.map((m) => ({
            $id: m.id,
            businessId: m.businessId,
            productId: m.productId,
            type: m.type,
            quantity: m.quantity,
            previousQuantity: m.previousQuantity,
            newQuantity: m.newQuantity,
            reason: m.reason || '',
            referenceId: m.referenceId || '',
            createdBy: m.createdBy || '',
            createdAt: m.createdAt,
            updatedAt: m.createdAt,
            $createdAt: m.createdAt,
            $updatedAt: m.createdAt,
            $databaseId: '',
            $collectionId: '',
            $permissions: [],
          }))
        } catch {
          return []
        }
      }
      throw err
    }
  }
}

export const stockMovementService = new StockMovementService()
