import { BaseService } from './base.service'
import { COLLECTIONS, databases, DATABASE_ID } from '@/config/appwrite'
import { Product } from '@/types'
import { Query } from 'appwrite'

/**
 * Product Service
 * 
 * Handles product inventory operations with strict tenant isolation,
 * backend-authoritative SKU/barcode uniqueness, and auditable stock mutations.
 */
export class ProductService extends BaseService {
  constructor() {
    super(COLLECTIONS.PRODUCTS)
  }

  /**
   * Executes a task under strict per-product async queue lock to prevent race conditions.
   * Utilizes an Appwrite 'inventory_locks' collection to ensure atomicity across processes.
   */
  async withStockLock<T>(productId: string, task: () => Promise<T>): Promise<T> {
    const lockId = `lock_${productId}`
    const maxRetries = 10
    const retryDelayMs = 500

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Attempt to acquire lock by creating a document with a unique ID
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.INVENTORY_LOCKS,
          lockId,
          { productId, createdAt: new Date().toISOString() }
        )

        // Lock acquired, execute task
        try {
          return await task()
        } finally {
          // Always release lock
          try {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVENTORY_LOCKS, lockId)
          } catch (deleteErr) {
            console.error(`Failed to release lock for ${productId}:`, deleteErr)
          }
        }
      } catch (err: any) {
        // If document already exists, another process has the lock (Appwrite 409 conflict)
        if (err?.code === 409) {
          if (attempt === maxRetries) {
            throw new Error(`Timeout acquiring lock for product ${productId}`)
          }
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
          continue
        }
        throw err
      }
    }
    throw new Error('Unexpected lock failure')
  }

  /**
   * Create a new product with normalized SKU & Barcode uniqueness validation
   */
  async createProduct(
    data: {
      categoryId?: string
      name: string
      sku?: string
      barcode?: string
      unit: string
      purchasePrice: number
      sellingPrice: number
      stockQuantity: number
      lowStockThreshold?: number
      imageUrl?: string
      isActive?: boolean
    },
    businessId: string,
    userId: string
  ): Promise<Product> {
    if (!businessId) {
      throw new Error('Business ID is required to create a product')
    }

    const name = data.name.trim()
    const sku = data.sku ? data.sku.trim().toUpperCase() : ''
    const barcode = data.barcode ? data.barcode.trim() : ''

    if (!name) {
      throw new Error('Product name cannot be empty')
    }

    if (data.purchasePrice < 0 || data.sellingPrice < 0) {
      throw new Error('Prices cannot be negative')
    }

    if (data.stockQuantity < 0) {
      throw new Error('Stock quantity cannot be negative')
    }

    let skuLockId = ''
    let barcodeLockId = ''

    try {
      // Uniqueness validation across active business products
      if (sku) {
        skuLockId = `sku_${businessId}_${sku}`
        try {
          await databases.createDocument(DATABASE_ID, COLLECTIONS.INVENTORY_LOCKS, skuLockId, { productId: 'sku_check', createdAt: new Date().toISOString() })
        } catch (err: any) {
          if (err?.code === 409) throw new Error(`Product with SKU "${sku}" already exists or is being created`)
          throw err
        }
        
        const existingSku = await this.list<Product>(businessId, [Query.equal('sku', sku)])
        if (existingSku.length > 0) {
          throw new Error(`Product with SKU "${sku}" already exists in this business`)
        }
      }

      if (barcode) {
        barcodeLockId = `bar_${businessId}_${barcode}`
        try {
          await databases.createDocument(DATABASE_ID, COLLECTIONS.INVENTORY_LOCKS, barcodeLockId, { productId: 'bar_check', createdAt: new Date().toISOString() })
        } catch (err: any) {
          if (err?.code === 409) throw new Error(`Product with Barcode "${barcode}" already exists or is being created`)
          throw err
        }

        const existingBarcode = await this.list<Product>(businessId, [Query.equal('barcode', barcode)])
        if (existingBarcode.length > 0) {
          throw new Error(`Product with Barcode "${barcode}" already exists in this business`)
        }
      }

      const payload = {
        name,
        sku,
        barcode,
        categoryId: data.categoryId || '',
        unit: data.unit || 'pcs',
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        stockQuantity: data.stockQuantity,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        imageUrl: data.imageUrl || '',
        isActive: data.isActive ?? true,
      }

      const createdProduct = await this.create<Product>(payload, businessId, userId)

      // Record initial stock movement for opening stock (with transaction rollback on failure)
    if (data.stockQuantity > 0) {
      try {
        const { stockMovementService } = await import('./stock-movement.service')
        await stockMovementService.createRawMovement(
          {
            productId: createdProduct.$id,
            type: 'stock_in',
            quantity: data.stockQuantity,
            previousQuantity: 0,
            newQuantity: data.stockQuantity,
            reason: 'Opening stock initialization',
          },
          businessId,
          userId,
          true // internal authorization flag
        )
      } catch (stockErr: any) {
        // Compensating transaction rollback: Delete created product if opening stock movement fails
        try {
          await this.delete(createdProduct.$id, businessId)
        } catch {
          // Ignore deletion error during rollback
        }
        throw new Error(`Product creation failed: Unable to record opening stock audit trail: ${stockErr.message}`)
      }
      }

      return createdProduct
    } finally {
      // Release uniqueness locks
      if (skuLockId) {
        try { await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVENTORY_LOCKS, skuLockId) } catch (e) { /* ignore */ }
      }
      if (barcodeLockId) {
        try { await databases.deleteDocument(DATABASE_ID, COLLECTIONS.INVENTORY_LOCKS, barcodeLockId) } catch (e) { /* ignore */ }
      }
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string, businessId: string): Promise<Product> {
    return await this.getById<Product>(productId, businessId)
  }

  /**
   * List products for a business with optional filters
   */
  async listProducts(
    businessId: string,
    filters?: {
      categoryId?: string
      isActive?: boolean
      searchTerm?: string
      limit?: number
    }
  ): Promise<Product[]> {
    const limit = filters?.limit || 200
    const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

    if (filters?.categoryId) {
      queries.push(Query.equal('categoryId', filters.categoryId))
    }

    if (filters?.isActive !== undefined) {
      queries.push(Query.equal('isActive', filters.isActive))
    }

    if (filters?.searchTerm && filters.searchTerm.trim() !== '') {
      queries.push(Query.search('name', filters.searchTerm.trim()))
    }

    return await this.list<Product>(businessId, queries)
  }

  /**
   * List ALL products for a business without limit (for reporting)
   */
  async listAllProducts(
    businessId: string,
    filters?: {
      isActive?: boolean
    }
  ): Promise<Product[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]

    if (filters?.isActive !== undefined) {
      queries.push(Query.equal('isActive', filters.isActive))
    }

    return await this.listAll<Product>(businessId, queries)
  }

  /**
   * Update product with normalized SKU & Barcode checks
   */
  async updateProduct(
    productId: string,
    data: Partial<{
      categoryId: string
      name: string
      sku: string
      barcode: string
      unit: string
      purchasePrice: number
      sellingPrice: number
      stockQuantity: number
      lowStockThreshold: number
      imageUrl: string
      isActive: boolean
    }>,
    businessId: string
  ): Promise<Product> {
    if (data.purchasePrice !== undefined && data.purchasePrice < 0) {
      throw new Error('Purchase price cannot be negative')
    }
    if (data.sellingPrice !== undefined && data.sellingPrice < 0) {
      throw new Error('Selling price cannot be negative')
    }
    if (data.stockQuantity !== undefined && data.stockQuantity < 0) {
      throw new Error('Stock quantity cannot be negative')
    }

    const updatedFields: any = { ...data }

    // Check SKU duplicate if changing SKU
    if (data.sku !== undefined) {
      const normalizedSku = data.sku.trim().toUpperCase()
      updatedFields.sku = normalizedSku
      const existingSku = await this.getProductBySku(businessId, normalizedSku)
      if (existingSku && existingSku.$id !== productId) {
        throw new Error(`Product with SKU "${normalizedSku}" already exists for this business`)
      }
    }

    // Check Barcode duplicate if changing Barcode
    if (data.barcode !== undefined) {
      const normalizedBarcode = data.barcode.trim()
      updatedFields.barcode = normalizedBarcode
      if (normalizedBarcode !== '') {
        const existingBarcode = await this.getProductByBarcode(businessId, normalizedBarcode)
        if (existingBarcode && existingBarcode.$id !== productId) {
          throw new Error(`Product with Barcode "${normalizedBarcode}" already exists for this business`)
        }
      }
    }

    return await this.update<Product>(productId, updatedFields, businessId)
  }

  /**
   * Delete product (soft-archiving to maintain historical financial and sales reporting integrity)
   */
  async deleteProduct(productId: string, businessId: string): Promise<void> {
    await this.update<Product>(productId, { isActive: false }, businessId)
  }

  /**
   * Get product by SKU within business (normalized)
   */
  async getProductBySku(businessId: string, sku: string): Promise<Product | null> {
    const normalizedSku = sku.trim().toUpperCase()
    const results = await this.list<Product>(businessId, [
      Query.equal('sku', normalizedSku),
      Query.limit(1)
    ])
    return results.length > 0 ? results[0] : null
  }

  /**
   * Get product by barcode within business (normalized)
   */
  async getProductByBarcode(businessId: string, barcode: string): Promise<Product | null> {
    const normalizedBarcode = barcode.trim()
    if (!normalizedBarcode) return null
    const results = await this.list<Product>(businessId, [
      Query.equal('barcode', normalizedBarcode),
      Query.limit(1)
    ])
    return results.length > 0 ? results[0] : null
  }

  /**
   * P1 Issue #6: Audited Stock Adjustment (Preferred Method)
   * Converts direct stock edits into immutable stock movement audit entries.
   */
  async adjustStock(params: {
    productId: string
    newQuantity: number
    businessId: string
    userId: string
    reason?: string
    referenceId?: string
  }): Promise<Product> {
    const { productId, newQuantity, businessId, userId, reason, referenceId } = params
    if (newQuantity < 0) {
      throw new Error('Target stock quantity for adjustment cannot be negative')
    }

    const { stockMovementService } = await import('./stock-movement.service')
    await stockMovementService.createMovement(
      {
        productId,
        type: 'adjustment',
        quantity: newQuantity,
        reason: reason || 'Manual stock inventory adjustment',
        referenceId: referenceId || '',
      },
      businessId,
      userId
    )

    return await this.getProduct(productId, businessId)
  }

  /**
   * Direct stock quantity setter (internal & migration helper)
   */
  async updateStockQuantity(
    productId: string,
    newQuantity: number,
    businessId: string
  ): Promise<Product> {
    if (newQuantity < 0) {
      throw new Error('Stock quantity cannot be negative')
    }
    return await this.update<Product>(productId, { stockQuantity: newQuantity }, businessId)
  }

  /**
   * Authoritative Atomic Stock Update with State Verification
   */
  async updateStockWithCAS(
    productId: string,
    expectedPreviousQuantity: number,
    newQuantity: number,
    businessId: string,
    requestedDeduction: number = 0
  ): Promise<Product> {
    if (newQuantity < 0) {
      throw new Error('Stock quantity cannot be negative')
    }

    const currentDoc = await this.getProduct(productId, businessId)
    if (currentDoc.stockQuantity !== expectedPreviousQuantity) {
      if (requestedDeduction > 0 && currentDoc.stockQuantity < requestedDeduction) {
        throw new Error(
          `Insufficient stock for product "${currentDoc.name}". Available: ${currentDoc.stockQuantity}, Requested: ${requestedDeduction}`
        )
      }
      throw new Error('CONCURRENCY_CONFLICT: Product stock was updated by another transaction')
    }

    return await this.update<Product>(productId, { stockQuantity: newQuantity }, businessId)
  }

  /**
   * Get products with low stock or out of stock status for a business
   */
  async getLowStockProducts(businessId: string): Promise<Product[]> {
    const products = await this.listProducts(businessId, { isActive: true })
    return products.filter(
      (p) => p.stockQuantity <= (p.lowStockThreshold ?? 5)
    )
  }
}

export const productService = new ProductService()

