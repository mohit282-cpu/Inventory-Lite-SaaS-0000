import { BaseService } from './base.service'
import { COLLECTIONS, DATABASE_ID, databases } from '@/config/appwrite'
import { ID, Models } from 'appwrite'

/**
 * Business Service
 * 
 * Handles business-related operations with tenant isolation.
 * Businesses are the top-level entities in our multi-tenant architecture.
 */
export class BusinessService extends BaseService {
  constructor() {
    super(COLLECTIONS.BUSINESSES)
  }

  /**
   * Create a new business
   * Businesses are top-level entities, so they don't have businessId
   * @param data - Business data
   * @param userId - Owner user ID
   */
  async createBusiness(data: {
    name: string
    type: string
    address?: string
    phone?: string
    email?: string
    taxId?: string
  }, userId: string): Promise<Models.Document> {
    const businessData = {
      ...data,
      ownerId: userId,
      status: 'active',
      settings: {
        currency: 'NPR',
        timezone: 'Asia/Kathmandu',
        dateFormat: 'DD/MM/YYYY',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return await databases.createDocument(
      DATABASE_ID,
      this.collectionId,
      ID.unique(),
      businessData
    )
  }

  /**
   * Get business by ID
   * Businesses are top-level entities, accessed directly
   * @param businessId - Business ID
   */
  async getBusiness(businessId: string): Promise<Models.Document> {
    return await databases.getDocument(
      DATABASE_ID,
      this.collectionId,
      businessId
    )
  }

  /**
   * Update business
   * @param businessId - Business ID
   * @param data - Business data to update
   */
  async updateBusiness(businessId: string, data: Partial<{
    name: string
    address: string
    phone: string
    email: string
    taxId: string
    settings: any
  }>): Promise<Models.Document> {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    }

    return await databases.updateDocument(
      DATABASE_ID,
      this.collectionId,
      businessId,
      updateData
    )
  }

  /**
   * Get user's businesses
   * @param userId - User ID
   */
  async getUserBusinesses(_userId: string) {
    // This will query the business_members collection
    // Implementation to be added when membership system is built
    return []
  }
}

export const businessService = new BusinessService()
