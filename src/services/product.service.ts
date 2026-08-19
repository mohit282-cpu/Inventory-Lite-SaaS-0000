import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Product } from '@/types'
import { Query } from 'appwrite'

/**
 * Product Service
 * 
 * Handles product operations with tenant isolation.
 * Products are business-specific inventory items.
 */
export class ProductService extends BaseService {
  constructor() {
    super(COLLECTIONS.PRODUCTS)
  }

  /**
   * Create a new product
   * @param data - Product data
   * @param businessId - Business ID for tenant isolation
   * @param userId - User ID creating the product
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
    return await this.create(data, businessId, userId) as Product
  }

  /**
   * Get product by ID
   * @param productId - Product ID
   * @param businessId - Business ID for tenant isolation
   */
  async getProduct(productId: string, businessId: string): Promise<Product> {
    return await this.getById(productId, businessId) as Product
  }

  /**
   * List all products for a business
   * @param businessId - Business ID for tenant isolation
   * @param filters - Optional filters
   */
  async listProducts(
    businessId: string,
    filters?: {
      categoryId?: string
      isActive?: boolean
      lowStock?: boolean
    }
  ): Promise<Product[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]

    if (filters?.categoryId) {
      queries.push(Query.equal('categoryId', filters.categoryId))
    }

    if (filters?.isActive !== undefined) {
      queries.push(Query.equal('isActive', filters.isActive))
    }

    if (filters?.lowStock) {
      // Note: This requires complex query - might need to be done in application logic
      // as Appwrite doesn't support complex comparisons
    }

    const result = await this.list(businessId, queries)
    return result.documents as Product[]
  }

  /**
   * Update product
   * @param productId - Product ID
   * @param data - Product data to update
   * @param businessId - Business ID for tenant isolation
   */
  async updateProduct(
    productId: string,
    data: Partial<{
      categoryId?: string
      name?: string
      sku?: string
      barcode?: string
      unit?: string
      purchasePrice?: number
      sellingPrice?: number
      stockQuantity?: number
      lowStockThreshold?: number
      imageUrl?: string
      isActive?: boolean
    }>,
    businessId: string
  ): Promise<Product> {
    return await this.update(productId, data, businessId) as Product
  }

  /**
   * Delete product
   * @param productId - Product ID
   * @param businessId - Business ID for tenant isolation
   */
  async deleteProduct(productId: string, businessId: string): Promise<void> {
    await this.delete(productId, businessId)
  }

  /**
   * Search products by name or SKU
   * @param businessId - Business ID for tenant isolation
   * @param searchTerm - Search term
   */
  async searchProducts(businessId: string, searchTerm: string): Promise<Product[]> {
    const result = await this.query(businessId, [
      Query.search('name', searchTerm),
      Query.search('sku', searchTerm)
    ])
    return result.documents as Product[]
  }

  /**
   * Get product by SKU
   * @param businessId - Business ID for tenant isolation
   * @param sku - Product SKU
   */
  async getProductBySku(businessId: string, sku: string): Promise<Product | null> {
    const result = await this.query(businessId, [
      Query.equal('sku', sku),
      Query.limit(1)
    ])
    return result.documents.length > 0 ? result.documents[0] as Product : null
  }

  /**
   * Get product by barcode
   * @param businessId - Business ID for tenant isolation
   * @param barcode - Product barcode
   */
  async getProductByBarcode(businessId: string, barcode: string): Promise<Product | null> {
    const result = await this.query(businessId, [
      Query.equal('barcode', barcode),
      Query.limit(1)
    ])
    return result.documents.length > 0 ? result.documents[0] as Product : null
  }

  /**
   * Get low stock products
   * @param businessId - Business ID for tenant isolation
   */
  async getLowStockProducts(businessId: string): Promise<Product[]> {
    const result = await this.list(businessId, [
      Query.equal('isActive', true),
      Query.orderDesc('createdAt')
    ])
    
    // Filter in application logic since Appwrite doesn't support complex comparisons
    const products = result.documents as Product[]
    return products.filter(product => 
      product.lowStockThreshold !== undefined && 
      product.stockQuantity <= product.lowStockThreshold
    )
  }
}

export const productService = new ProductService()
