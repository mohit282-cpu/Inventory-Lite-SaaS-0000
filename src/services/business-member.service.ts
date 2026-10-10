import { BaseService, SYSTEM_TENANT_ID } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { BusinessMember, UserRole } from '@/types'
import { Query, Permission, Role } from 'appwrite'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { ForbiddenError } from '@/lib/security'

/**
 * Business Member Service
 * 
 * Manages user memberships within businesses and role assignments.
 * RBAC authorization strictly queries the database rather than trusting client parameter inputs.
 */
export class BusinessMemberService extends BaseService {
  constructor() {
    super(COLLECTIONS.BUSINESS_MEMBERS)
  }

  /**
   * Add a user member to a business with database-verified RBAC authorization
   */
  async addMember(
    data: {
      userId: string
      role: UserRole
    },
    businessId: string,
    creatorUserId: string
  ): Promise<BusinessMember> {
    let isInitialOwner = false
    if (data.role === 'owner' && data.userId === creatorUserId) {
      // Validate that creator is actually the registered owner/creator of this business in the database
      try {
        const { businessService } = await import('@/services/business.service')
        const business = await businessService.getById<any>(businessId, SYSTEM_TENANT_ID).catch(() => null)
        if (business && (business.ownerId === creatorUserId || business.createdBy === creatorUserId)) {
          const existingMembers = await this.listMembers(businessId).catch(() => [])
          const hasOwner = existingMembers.some((m) => m.role === 'owner')
          if (!hasOwner) {
            isInitialOwner = true
          }
        }
      } catch {
        // Fallback: not initial owner
      }
    }

    if (!isInitialOwner) {
      // Database-verified RBAC check: caller must have owner or admin role
      // Only existing owners can add another owner to prevent admin privilege escalation
      const auth = await authorizeBusinessAccess({
        userId: creatorUserId,
        businessId,
        requiredRole: data.role === 'owner' ? 'owner' : ['owner', 'admin'],
      })
      if (data.role === 'owner' && auth.memberRole !== 'owner') {
        throw new ForbiddenError('Only business owners can grant owner membership', 'admin')
      }
    }

    // Check if target user is already a member
    const existing = await this.getMemberByUserAndBusiness(data.userId, businessId)
    if (existing) {
      return existing
    }

    const memberPermissions = [
      Permission.read(Role.user(data.userId)),
      Permission.read(Role.user(creatorUserId)),
      Permission.update(Role.user(creatorUserId)),
      Permission.delete(Role.user(creatorUserId)),
    ]

    return await this.create<BusinessMember>(
      {
        userId: data.userId,
        role: data.role,
      },
      businessId,
      creatorUserId,
      memberPermissions
    )
  }

  /**
   * Create initial owner membership record during business onboarding
   */
  async createInitialOwnerMember(userId: string, businessId: string): Promise<BusinessMember> {
    return await this.addMember({ userId, role: 'owner' }, businessId, userId)
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
   * Update a member's role with database-verified RBAC authorization
   */
  async updateMemberRole(
    memberId: string,
    role: UserRole,
    businessId: string,
    updatingUserId: string
  ): Promise<BusinessMember> {
    // Database-verified RBAC check: caller must be owner or admin
    const auth = await authorizeBusinessAccess({
      userId: updatingUserId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    const targetMember = await this.getMember(memberId, businessId)
    if (!targetMember) {
      throw new Error('Member not found')
    }

    // Admins cannot grant owner role or modify existing owners
    if ((role === 'owner' || targetMember.role === 'owner') && auth.memberRole !== 'owner') {
      throw new ForbiddenError('Only business owners can manage owner roles', 'admin')
    }

    // Owner cannot demote self if they are the sole owner
    if (targetMember.role === 'owner' && role !== 'owner') {
      const allMembers = await this.listMembers(businessId)
      const ownerCount = allMembers.filter((m) => m.role === 'owner').length
      if (ownerCount <= 1) {
        throw new Error('Cannot demote the sole owner of a business')
      }
    }

    return await this.update<BusinessMember>(memberId, { role }, businessId)
  }

  /**
   * Remove a member from a business with database-verified RBAC authorization
   */
  async removeMember(
    memberId: string,
    businessId: string,
    removingUserId: string
  ): Promise<void> {
    // Database-verified RBAC check: caller must be owner or admin
    const auth = await authorizeBusinessAccess({
      userId: removingUserId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    const targetMember = await this.getMember(memberId, businessId)
    if (!targetMember) {
      throw new Error('Member not found')
    }

    // Admins cannot remove owners
    if (targetMember.role === 'owner') {
      if (auth.memberRole !== 'owner') {
        throw new ForbiddenError('Only business owners can remove an owner', 'admin')
      }
      const allMembers = await this.listMembers(businessId)
      const ownerCount = allMembers.filter((m) => m.role === 'owner').length
      if (ownerCount <= 1) {
        throw new Error('Cannot remove the sole owner of a business')
      }
    }

    await this.delete(memberId, businessId)
  }

  /**
   * Get all business memberships for a user
   */
  async getUserMemberships(userId: string): Promise<BusinessMember[]> {
    return await this.list<BusinessMember>(SYSTEM_TENANT_ID, [
      Query.equal('userId', userId)
    ])
  }

  /**
   * Get member record by user ID and business ID
   */
  async getMemberByUserAndBusiness(userId: string, businessId: string): Promise<BusinessMember | null> {
    try {
      const members = await this.list<BusinessMember>(businessId, [
        Query.equal('userId', userId),
        Query.limit(1)
      ])
      if (members.length > 0) {
        return members[0]
      }
    } catch {
      // Ignore database listing errors
    }

    // Fallback: If listing by businessId was restricted or empty, query system memberships by userId
    try {
      const memberships = await this.getUserMemberships(userId)
      const matched = memberships.find((m) => m.businessId === businessId)
      if (matched) return matched
    } catch {
      // Ignore database listing errors
    }

    return null
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
