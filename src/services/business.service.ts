import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Business, Currency, TaxRegistrationType } from '@/types'
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
      taxRegistrationType?: TaxRegistrationType
      taxRegistrationNumber?: string
      logoUrl?: string
      currency?: Currency
      timezone?: string
    },
    userId: string
  ): Promise<Business> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Business name is required')
    }

    const regType: TaxRegistrationType =
      data.taxRegistrationType || (data.vatNumber?.trim() ? 'VAT' : data.panNumber?.trim() ? 'PAN' : 'NONE')
    const regNum = (data.taxRegistrationNumber || (regType === 'VAT' ? data.vatNumber : regType === 'PAN' ? data.panNumber : '') || '').trim()

    const businessData = {
      name: data.name,
      ownerId: userId,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      taxRegistrationType: regType,
      taxRegistrationNumber: regNum,
      panNumber: regType === 'PAN' ? regNum : (data.panNumber || ''),
      vatNumber: regType === 'VAT' ? regNum : (data.vatNumber || ''),
      logoUrl: data.logoUrl || '',
      currency: data.currency || 'NPR',
      timezone: data.timezone || 'Asia/Kathmandu',
    }

    const business = await this.create<Business>(businessData, 'system', userId)

    try {
      const { businessMemberService } = await import('./business-member.service')
      await businessMemberService.createInitialOwnerMember(userId, business.$id)
    } catch {
      // Ignore if membership creation failed or already exists
    }

    return business
  }

  /**
   * Get business details by ID with optional database RBAC access verification (P1)
   */
  async getBusiness(businessId: string, userId?: string): Promise<Business> {
    if (userId) {
      await authorizeBusinessAccess({
        userId,
        businessId,
        requiredRole: ['owner', 'admin', 'staff'],
      })
    }
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
      taxRegistrationType: TaxRegistrationType
      taxRegistrationNumber: string
      logoUrl: string
      currency: Currency
      timezone: string
      dateFormat?: string
    }>,
    updatingUserId: string
  ): Promise<Business> {
    // Database-verified RBAC check: caller must be owner or admin
    await authorizeBusinessAccess({
      userId: updatingUserId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    const payload: any = { ...data }

    if (data.taxRegistrationType) {
      const regType = data.taxRegistrationType
      const regNum = (data.taxRegistrationNumber || (regType === 'VAT' ? data.vatNumber : regType === 'PAN' ? data.panNumber : '') || '').trim()

      payload.taxRegistrationType = regType
      payload.taxRegistrationNumber = regNum
      if (regType === 'VAT') {
        payload.vatNumber = regNum
        payload.panNumber = ''
      } else if (regType === 'PAN') {
        payload.panNumber = regNum
        payload.vatNumber = ''
      } else {
        payload.vatNumber = ''
        payload.panNumber = ''
        payload.taxRegistrationNumber = ''
      }
    }

    return await this.update<Business>(businessId, payload, 'system')
  }

  /**
   * Get businesses owned by authenticated user (derives ownerId from authenticated user ID)
   */
  async getMyBusinesses(userId: string): Promise<Business[]> {
    if (!userId || userId.trim() === '') {
      throw new Error('Unauthorized: Valid userId required')
    }
    return await this.list<Business>('system', [
      Query.equal('ownerId', userId),
      Query.orderDesc('createdAt')
    ])
  }

  /**
   * Get businesses owned by a specific user (legacy wrapper)
   */
  async getOwnedBusinesses(ownerId: string): Promise<Business[]> {
    return await this.getMyBusinesses(ownerId)
  }
}

export const businessService = new BusinessService()
