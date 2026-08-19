import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Category } from '@/types'
import { Query } from 'appwrite'

/**
 * Category Service
 * 
 * Handles category operations with tenant isolation.
 * Categories are business-specific for organizing products.
 */
export class CategoryService extends BaseService {
  constructor() {
    super(COLLECTIONS.CATEGORIES)
  }

  /**
   * Create a new category
   * @param data - Category data
   * @param businessId - Business ID for tenant isolation
   * @param userId - User ID creating the category
   */
  async createCategory(
    data: { name: string; description?: string },
    businessId: string,
    userId: string
  ): Promise<Category> {
    return await this.create(data, businessId, userId) as Category
  }

  /**
   * Get category by ID
   * @param categoryId - Category ID
   * @param businessId - Business ID for tenant isolation
   */
  async getCategory(categoryId: string, businessId: string): Promise<Category> {
    return await this.getById(categoryId, businessId) as Category
  }

  /**
   * List all categories for a business
   * @param businessId - Business ID for tenant isolation
   */
  async listCategories(businessId: string): Promise<Category[]> {
    const result = await this.list(businessId, [
      Query.orderDesc('createdAt')
    ])
    return result.documents as Category[]
  }

  /**
   * Update category
   * @param categoryId - Category ID
   * @param data - Category data to update
   * @param businessId - Business ID for tenant isolation
   */
  async updateCategory(
    categoryId: string,
    data: { name?: string; description?: string },
    businessId: string
  ): Promise<Category> {
    return await this.update(categoryId, data, businessId) as Category
  }

  /**
   * Delete category
   * @param categoryId - Category ID
   * @param businessId - Business ID for tenant isolation
   */
  async deleteCategory(categoryId: string, businessId: string): Promise<void> {
    await this.delete(categoryId, businessId)
  }

  /**
   * Search categories by name
   * @param businessId - Business ID for tenant isolation
   * @param searchTerm - Search term
   */
  async searchCategories(businessId: string, searchTerm: string): Promise<Category[]> {
    const result = await this.query(businessId, [
      Query.search('name', searchTerm)
    ])
    return result.documents as Category[]
  }
}

export const categoryService = new CategoryService()
