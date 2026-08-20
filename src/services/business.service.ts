import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Business, Currency } from '@/types'
import { Query } from 'appwrite'
import { authorizeBusinessAccess } from '@/lib/authorization'

/**
 * Business Service
 * 
 * Handles business entity creation, metadata updates, and ownership.
 */
export class BusinessService extends BaseService {
  constructor() {
    super(COLLECTIONS.BUSINESSES)
  }

  /**
   * Create a new business and register owner
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
    if (!data.name || data.name.trim() === '') {
      throw new Error('Business name is required')
    }

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
   * Get business details by ID
   */
  async getBusiness(businessId: string): Promise<Business> {
    return await this.getById<Business>(businessId, 'system')
  }

  /**
   * Update business settings with database-verified RBAC authorization
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
    }>,
    updatingUserId: string
  ): Promise<Business> {
    // Database-verified RBAC check: caller must be owner or admin
    await authorizeBusinessAccess({
      userId: updatingUserId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    return await this.update<Business>(businessId, data, 'system')
  }

  /**
   * Get businesses owned by a specific user
   */
  async getOwnedBusinesses(ownerId: string): Promise<Business[]> {
    return await this.list<Business>('system', [
      Query.equal('ownerId', ownerId),
      Query.orderDesc('createdAt')
    ])
  }
}

export const businessService = new BusinessService()
