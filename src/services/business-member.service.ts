import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { BusinessMember, UserRole } from '@/types'
import { Query } from 'appwrite'

/**
 * Business Member Service
 * 
 * Manages user memberships within businesses and role assignments.
 */
export class BusinessMemberService extends BaseService {
  constructor() {
    super(COLLECTIONS.BUSINESS_MEMBERS)
  }

  /**
   * Add a user member to a business
   */
  async addMember(
    data: {
      userId: string
      role: UserRole
    },
    businessId: string,
    creatorUserId: string
  ): Promise<BusinessMember> {
    // Check if membership already exists
    const existing = await this.getMemberByUserAndBusiness(data.userId, businessId)
    if (existing) {
      throw new Error(`User ${data.userId} is already a member of business ${businessId}`)
    }

    return await this.create<BusinessMember>(
      {
        userId: data.userId,
        role: data.role,
      },
      businessId,
      creatorUserId
    )
  }

  /**
   * Get member record by ID
   */
  async getMember(memberId: string, businessId: string): Promise<BusinessMember> {
    return await this.getById<BusinessMember>(memberId, businessId)
  }

  /**
   * List all members belonging to a business
   */
  async listMembers(businessId: string): Promise<BusinessMember[]> {
    return await this.list<BusinessMember>(businessId, [
      Query.orderDesc('createdAt')
    ])
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    memberId: string,
    role: UserRole,
    businessId: string
  ): Promise<BusinessMember> {
    return await this.update<BusinessMember>(memberId, { role }, businessId)
  }

  /**
   * Remove a member from a business
   */
  async removeMember(memberId: string, businessId: string): Promise<void> {
    await this.delete(memberId, businessId)
  }

  /**
   * Get all business memberships for a user
   */
  async getUserMemberships(userId: string): Promise<BusinessMember[]> {
    return await this.query<BusinessMember>('system', [
      Query.equal('userId', userId)
    ])
  }

  /**
   * Get member record by user ID and business ID
   */
  async getMemberByUserAndBusiness(userId: string, businessId: string): Promise<BusinessMember | null> {
    const members = await this.query<BusinessMember>(businessId, [
      Query.equal('userId', userId),
      Query.limit(1)
    ])
    return members.length > 0 ? members[0] : null
  }

  /**
   * Check if a user has active membership access to a business
   */
  async hasAccess(userId: string, businessId: string): Promise<boolean> {
    const member = await this.getMemberByUserAndBusiness(userId, businessId)
    return member !== null
  }

  /**
   * Check if a user has a specific role in a business
   */
  async hasRole(userId: string, businessId: string, role: UserRole): Promise<boolean> {
    const member = await this.getMemberByUserAndBusiness(userId, businessId)
    return member !== null && member.role === role
  }

  /**
   * Check if a user has any of the specified roles in a business
   */
  async hasAnyRole(userId: string, businessId: string, roles: UserRole[]): Promise<boolean> {
    const member = await this.getMemberByUserAndBusiness(userId, businessId)
    return member !== null && roles.includes(member.role)
  }
}

export const businessMemberService = new BusinessMemberService()
