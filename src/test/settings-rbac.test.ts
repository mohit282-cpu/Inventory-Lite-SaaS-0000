import { describe, it, expect, beforeEach, vi } from 'vitest'
import { businessService } from '@/services/business.service'
import { businessMemberService } from '@/services/business-member.service'
import { requireRole, ForbiddenError } from '@/lib/security'
import { databases } from '@/config/appwrite'

vi.mock('@/config/appwrite', () => ({
  databases: {
    createDocument: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
  DATABASE_ID: 'inventory_lite_db',
  COLLECTIONS: {
    BUSINESSES: 'businesses',
    BUSINESS_MEMBERS: 'business_members',
  },
}))

describe('Settings & Role-Based Access Control (RBAC) System', () => {
  const businessId = 'bus_tenant_test'
  const ownerUserId = 'usr_owner_001'
  const adminUserId = 'usr_admin_002'
  const staffUserId = 'usr_staff_003'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Security Helper RBAC Assertions', () => {
    it('should allow owner and admin roles for business modifications', () => {
      expect(() => requireRole('owner', ['owner', 'admin'], 'update business')).not.toThrow()
      expect(() => requireRole('admin', ['owner', 'admin'], 'update business')).not.toThrow()
    })

    it('should throw ForbiddenError when staff attempts restricted actions', () => {
      expect(() => requireRole('staff', ['owner', 'admin'], 'update business')).toThrow(ForbiddenError)
    })
  })

  describe('Business Settings Service RBAC', () => {
    it('should update business settings when performed by owner or admin', async () => {
      vi.mocked(databases.updateDocument).mockResolvedValueOnce({
        $id: businessId,
        name: 'Updated Enterprise Name',
        panNumber: '600998877',
        updatedBy: ownerUserId,
      } as any)

      const updated = await businessService.updateBusiness(
        businessId,
        { name: 'Updated Enterprise Name', panNumber: '600998877' },
        'owner'
      )

      expect(updated.name).toBe('Updated Enterprise Name')
      expect(updated.panNumber).toBe('600998877')
    })

    it('should reject business settings update when performed by staff', async () => {
      await expect(
        businessService.updateBusiness(
          businessId,
          { name: 'Malicious Name Update' },
          'staff'
        )
      ).rejects.toThrow('Forbidden: Access denied for action \'update business settings\' with role \'staff\'')
    })
  })

  describe('Team & Membership Management RBAC', () => {
    it('should allow admin to invite new team members', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({ total: 0, documents: [] } as any)
      vi.mocked(databases.createDocument).mockResolvedValueOnce({
        $id: 'mem_999',
        userId: 'usr_new',
        role: 'staff',
        businessId,
      } as any)

      const newMember = await businessMemberService.addMember(
        { userId: 'usr_new', role: 'staff' },
        businessId,
        adminUserId,
        'admin'
      )

      expect(newMember.$id).toBe('mem_999')
      expect(newMember.role).toBe('staff')
    })

    it('should block staff members from inviting new team members', async () => {
      await expect(
        businessMemberService.addMember(
          { userId: 'usr_hacker', role: 'admin' },
          businessId,
          staffUserId,
          'staff'
        )
      ).rejects.toThrow('Forbidden: Access denied for action \'invite team members\' with role \'staff\'')
    })

    it('should block staff members from removing team members', async () => {
      await expect(
        businessMemberService.removeMember('mem_target', businessId, 'staff')
      ).rejects.toThrow('Forbidden: Access denied for action \'remove team members\' with role \'staff\'')
    })
  })
})
