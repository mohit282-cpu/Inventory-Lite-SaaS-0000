import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Product } from '@/types'
import { Query } from 'appwrite'

/**
 * Product Service
 * 
 * Handles product inventory operations with strict tenant isolation.
 */
export class ProductService extends BaseService {
  private productStockMutex = new Map<string, Promise<any>>()

  constructor() {
    super(COLLECTIONS.PRODUCTS)
  }

  /**
   * Execute an operation under an isolated mutex lock per product ID
   * Prevents race conditions during concurrent stock movements.
   */
  async withStockLock<T>(productId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.productStockMutex.get(productId) || Promise.resolve()
    let release: () => void = () => {}

    const current = new Promise<void>((resolve) => {
      release = resolve
    })

    this.productStockMutex.set(productId, previous.then(() => current))

    try {
      await previous
      return await task()
    } finally {
      release()
    }
  }

  /**
   * Create a new product
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
    if (!data.name || data.name.trim() === '') {
      throw new Error('Product name is required')
    }
    if (data.purchasePrice < 0 || data.sellingPrice < 0) {
      throw new Error('Prices cannot be negative')
    }
    if (data.stockQuantity < 0) {
      throw new Error('Stock quantity cannot be negative')
    }

    const finalSku = data.sku && data.sku.trim() !== ''
      ? data.sku.trim()
      : `SKU-${Date.now().toString(36).toUpperCase()}`

    // Prevent duplicate SKU within the business
    const existingSku = await this.getProductBySku(businessId, finalSku)
    if (existingSku) {
      throw new Error(`Product with SKU "${finalSku}" already exists for this business`)
    }

    // Prevent duplicate barcode if provided
    if (data.barcode && data.barcode.trim() !== '') {
      const existingBarcode = await this.getProductByBarcode(businessId, data.barcode)
      if (existingBarcode) {
        throw new Error(`Product with Barcode "${data.barcode}" already exists for this business`)
      }
    }

    const productData = {
      categoryId: data.categoryId || '',
      name: data.name,
      sku: finalSku,
      barcode: data.barcode || '',
      unit: data.unit,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      stockQuantity: data.stockQuantity,
      lowStockThreshold: data.lowStockThreshold ?? 5,
      imageUrl: data.imageUrl || '',
      isActive: data.isActive ?? true,
    }

    const createdProduct = await this.create<Product>(productData, businessId, userId)

    // Record initial stock movement for opening stock
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
          userId
        )
      } catch (stockErr) {
        console.warn('Initial stock movement log notice:', stockErr)
      }
    }

    return createdProduct
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string, businessId: string): Promise<Product> {
    try {
      return await this.getById<Product>(productId, businessId)
    } catch (err) {
      const { localDB } = await import('@/lib/offline/db')
      const localProd = await localDB.products.get(productId)
      if (localProd && localProd.businessId === businessId) {
        return {
          $id: localProd.id,
          businessId: localProd.businessId,
          name: localProd.name,
          sku: localProd.sku || '',
          barcode: localProd.barcode || '',
          unit: localProd.unit || 'pcs',
          purchasePrice: localProd.purchasePrice || 0,
          sellingPrice: localProd.price,
          stockQuantity: localProd.quantity,
          lowStockThreshold: localProd.minStock || 5,
          isActive: true,
          createdAt: localProd.updatedAt || new Date().toISOString(),
          updatedAt: localProd.updatedAt || new Date().toISOString(),
          $createdAt: localProd.updatedAt || new Date().toISOString(),
          $updatedAt: localProd.updatedAt || new Date().toISOString(),
          $databaseId: '',
          $collectionId: '',
          $permissions: [],
        }
      }
      throw err
    }
  }

  /**
   * List all products for a business with optional filters
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
    try {
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
    } catch (err) {
      console.warn('[ProductService] Appwrite listProducts failed. Falling back to local IndexedDB store...')
      const { localDB } = await import('@/lib/offline/db')
      let localProducts = await localDB.products.where('businessId').equals(businessId).toArray()

      if (filters?.categoryId) {
        localProducts = localProducts.filter((p) => p.categoryId === filters.categoryId)
      }
      if (filters?.searchTerm && filters.searchTerm.trim() !== '') {
        const term = filters.searchTerm.trim().toLowerCase()
        localProducts = localProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(term) ||
            p.sku?.toLowerCase().includes(term) ||
            p.barcode?.toLowerCase().includes(term)
        )
      }

      return localProducts.map((p) => ({
        $id: p.id,
        businessId: p.businessId,
        name: p.name,
        sku: p.sku || '',
        barcode: p.barcode || '',
        unit: p.unit || 'pcs',
        purchasePrice: p.purchasePrice || 0,
        sellingPrice: p.price,
        stockQuantity: p.quantity,
        lowStockThreshold: p.minStock || 5,
        isActive: true,
        createdAt: p.updatedAt || new Date().toISOString(),
        updatedAt: p.updatedAt || new Date().toISOString(),
        $createdAt: p.updatedAt || new Date().toISOString(),
        $updatedAt: p.updatedAt || new Date().toISOString(),
        $databaseId: '',
        $collectionId: '',
        $permissions: [],
      }))
    }
  }

  /**
   * Update product
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

    // Check SKU duplicate if changing SKU
    if (data.sku) {
      const existingSku = await this.getProductBySku(businessId, data.sku)
      if (existingSku && existingSku.$id !== productId) {
        throw new Error(`Product with SKU "${data.sku}" already exists for this business`)
      }
    }

    // Check Barcode duplicate if changing Barcode
    if (data.barcode && data.barcode.trim() !== '') {
      const existingBarcode = await this.getProductByBarcode(businessId, data.barcode)
      if (existingBarcode && existingBarcode.$id !== productId) {
        throw new Error(`Product with Barcode "${data.barcode}" already exists for this business`)
      }
    }

    return await this.update<Product>(productId, data, businessId)
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string, businessId: string): Promise<void> {
    await this.delete(productId, businessId)
  }

  /**
   * Get product by SKU within business
   */
  async getProductBySku(businessId: string, sku: string): Promise<Product | null> {
    const results = await this.list<Product>(businessId, [
      Query.equal('sku', sku),
      Query.limit(1)
    ])
    return results.length > 0 ? results[0] : null
  }

  /**
   * Get product by barcode within business
   */
  async getProductByBarcode(businessId: string, barcode: string): Promise<Product | null> {
    const results = await this.list<Product>(businessId, [
      Query.equal('barcode', barcode),
      Query.limit(1)
    ])
    return results.length > 0 ? results[0] : null
  }

  /**
   * Adjust stock quantity directly
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
