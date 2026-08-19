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
  constructor() {
    super(COLLECTIONS.PRODUCTS)
  }

  /**
   * Create a new product
   */
  async createProduct(
    data: {
      categoryId?: string
      name: string
      sku: string
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
    // Prevent duplicate SKU within the business
    const existingSku = await this.getProductBySku(businessId, data.sku)
    if (existingSku) {
      throw new Error(`Product with SKU "${data.sku}" already exists for this business`)
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
      sku: data.sku,
      barcode: data.barcode || '',
      unit: data.unit,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      stockQuantity: data.stockQuantity,
      lowStockThreshold: data.lowStockThreshold ?? 5,
      imageUrl: data.imageUrl || '',
      isActive: data.isActive ?? true,
    }

    return await this.create<Product>(productData, businessId, userId)
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string, businessId: string): Promise<Product> {
    return await this.getById<Product>(productId, businessId)
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
    }
  ): Promise<Product[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]

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
    const results = await this.query<Product>(businessId, [
      Query.equal('sku', sku),
      Query.limit(1)
    ])
    return results.length > 0 ? results[0] : null
  }

  /**
   * Get product by barcode within business
   */
  async getProductByBarcode(businessId: string, barcode: string): Promise<Product | null> {
    const results = await this.query<Product>(businessId, [
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
}

export const productService = new ProductService()
