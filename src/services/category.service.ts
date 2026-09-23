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
    if (!businessId) {
      throw new Error('Business ID is required to create a category')
    }

    const trimmedName = data.name ? data.name.trim() : ''
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Category name must be at least 2 characters')
    }

    const trimmedDescription = data.description ? data.description.trim() : undefined

    // Case-insensitive duplicate check within active business
    const existingCategories = await this.listCategories(businessId)
    const normalizedNewName = trimmedName.toLowerCase()
    const duplicate = existingCategories.find(
      (c) => c.name.trim().toLowerCase() === normalizedNewName
    )

    if (duplicate) {
      throw new Error(`Category "${trimmedName}" already exists for this business`)
    }

    return await this.create<Category>(
      {
        name: trimmedName,
        description: trimmedDescription,
      },
      businessId,
      userId
    )
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
    if (!businessId) {
      throw new Error('Business ID is required to update a category')
    }

    const payload: Partial<{ name: string; description: string }> = {}

    if (data.name !== undefined) {
      const trimmedName = data.name.trim()
      if (!trimmedName || trimmedName.length < 2) {
        throw new Error('Category name must be at least 2 characters')
      }

      // Case-insensitive duplicate check
      const existingCategories = await this.listCategories(businessId)
      const normalizedNewName = trimmedName.toLowerCase()
      const duplicate = existingCategories.find(
        (c) => c.$id !== categoryId && c.name.trim().toLowerCase() === normalizedNewName
      )

      if (duplicate) {
        throw new Error(`Category "${trimmedName}" already exists for this business`)
      }

      payload.name = trimmedName
    }

    if (data.description !== undefined) {
      payload.description = data.description.trim() || undefined
    }

    return await this.update<Category>(categoryId, payload, businessId)
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string, businessId: string): Promise<void> {
    await this.delete(categoryId, businessId)
  }
}

export const categoryService = new CategoryService()
