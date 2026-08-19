import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Business, Currency } from '@/types'
import { Query } from 'appwrite'

/**
 * Business Service
 * 
 * Handles business entity operations.
 * Business entities are top-level tenant roots in Inventory Lite.
 */
export class BusinessService extends BaseService {
  constructor() {
    super(COLLECTIONS.BUSINESSES)
  }

  /**
   * Create a new business entity
   */
  async createBusiness(
    data: {
      name: string
      phone?: string
      email?: string
      address?: string
      panNumber?: string
      vatNumber?: string
      logoUrl?: string
      currency?: Currency
      timezone?: string
    },
    userId: string
  ): Promise<Business> {
    const businessData = {
      name: data.name,
      ownerId: userId,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      panNumber: data.panNumber || '',
      vatNumber: data.vatNumber || '',
      logoUrl: data.logoUrl || '',
      currency: data.currency || 'NPR',
      timezone: data.timezone || 'Asia/Kathmandu',
    }

    return await this.create<Business>(businessData, 'system', userId)
  }

  /**
   * Get business by ID
   */
  async getBusiness(businessId: string): Promise<Business> {
    return await this.getById<Business>(businessId, 'system')
  }

  /**
   * Update business details
   */
  async updateBusiness(
    businessId: string,
    data: Partial<{
      name: string
      phone: string
      email: string
      address: string
      panNumber: string
      vatNumber: string
      logoUrl: string
      currency: Currency
      timezone: string
    }>
  ): Promise<Business> {
    return await this.update<Business>(businessId, data, 'system')
  }

  /**
   * Get businesses owned by a specific user
   */
  async getOwnedBusinesses(ownerId: string): Promise<Business[]> {
    return await this.query<Business>('system', [
      Query.equal('ownerId', ownerId),
      Query.orderDesc('createdAt')
    ])
  }
}

export const businessService = new BusinessService()
