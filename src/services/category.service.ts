import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Category } from '@/types'
import { Query } from 'appwrite'

/**
 * Category Service
 * 
 * Handles product categories with strict tenant isolation.
 */
export class CategoryService extends BaseService {
  constructor() {
    super(COLLECTIONS.CATEGORIES)
  }

  /**
   * Create a new category
   */
  async createCategory(
    data: {
      name: string
      description?: string
    },
    businessId: string,
    userId: string
  ): Promise<Category> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Category name is required')
    }

    // Check for duplicate category name within business
    const existing = await this.list<Category>(businessId, [
      Query.equal('name', data.name.trim()),
      Query.limit(1)
    ])
    if (existing.length > 0) {
      throw new Error(`Category "${data.name}" already exists for this business`)
    }

    return await this.create<Category>(data, businessId, userId)
  }

  /**
   * Get category by ID
   */
  async getCategory(categoryId: string, businessId: string): Promise<Category> {
    return await this.getById<Category>(categoryId, businessId)
  }

  /**
   * List all categories for a business
   */
  async listCategories(businessId: string): Promise<Category[]> {
    return await this.list<Category>(businessId, [Query.orderAsc('name')])
  }

  /**
   * Update category
   */
  async updateCategory(
    categoryId: string,
    data: Partial<{
      name: string
      description: string
    }>,
    businessId: string
  ): Promise<Category> {
    if (data.name) {
      const existing = await this.list<Category>(businessId, [
        Query.equal('name', data.name.trim()),
        Query.limit(2)
      ])
      const duplicate = existing.find((c: Category) => c.$id !== categoryId)
      if (duplicate) {
        throw new Error(`Category "${data.name}" already exists for this business`)
      }
    }

    return await this.update<Category>(categoryId, data, businessId)
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string, businessId: string): Promise<void> {
    await this.delete(categoryId, businessId)
  }
}

export const categoryService = new CategoryService()
