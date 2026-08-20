import { describe, it, expect, vi, beforeEach } from 'vitest'
import { businessService } from '@/services/business.service'
import { businessMemberService } from '@/services/business-member.service'
import { databases } from '@/config/appwrite'

vi.mock('@/config/appwrite', () => ({
  DATABASE_ID: 'inventory_lite_db',
  COLLECTIONS: {
    BUSINESSES: 'businesses',
    BUSINESS_MEMBERS: 'business_members',
  },
  databases: {
    updateDocument: vi.fn(),
    createDocument: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}))

describe('Settings & Business Management RBAC Tests', () => {
  const businessId = 'biz_corp_001'
  const ownerUserId = 'usr_owner_001'
  const adminUserId = 'usr_admin_002'
  const staffUserId = 'usr_staff_003'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Business Settings RBAC Authorization', () => {
    it('should allow business owner to update business settings', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 1,
        documents: [{ $id: 'mem_1', userId: ownerUserId, businessId, role: 'owner' }],
      } as any)

      vi.mocked(databases.updateDocument).mockResolvedValueOnce({
        $id: businessId,
        name: 'Updated Enterprise Name',
        panNumber: '600998877',
      } as any)

      const updated = await businessService.updateBusiness(
        businessId,
        { name: 'Updated Enterprise Name', panNumber: '600998877' },
        ownerUserId
      )

      expect(updated.name).toBe('Updated Enterprise Name')
      expect(updated.panNumber).toBe('600998877')
    })

    it('should reject business settings update when performed by staff', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 1,
        documents: [{ $id: 'mem_3', userId: staffUserId, businessId, role: 'staff' }],
      } as any)

      await expect(
        businessService.updateBusiness(
          businessId,
          { name: 'Malicious Name Update' },
          staffUserId
        )
      ).rejects.toThrow(/Required role/)
    })
  })

  describe('Team & Membership Management RBAC', () => {
    it('should allow admin to invite new team members', async () => {
      // 1. Caller admin lookup
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 1,
        documents: [{ $id: 'mem_2', userId: adminUserId, businessId, role: 'admin' }],
      } as any)
      // 2. Existing target user lookup
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({ total: 0, documents: [] } as any)
      // 3. Create document
      vi.mocked(databases.createDocument).mockResolvedValueOnce({
        $id: 'mem_999',
        userId: 'usr_new',
        role: 'staff',
        businessId,
      } as any)

      const newMember = await businessMemberService.addMember(
        { userId: 'usr_new', role: 'staff' },
        businessId,
        adminUserId
      )

      expect(newMember.$id).toBe('mem_999')
      expect(newMember.role).toBe('staff')
    })

    it('should block staff members from inviting new team members', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 1,
        documents: [{ $id: 'mem_3', userId: staffUserId, businessId, role: 'staff' }],
      } as any)

      await expect(
        businessMemberService.addMember(
          { userId: 'usr_hacker', role: 'admin' },
          businessId,
          staffUserId
        )
      ).rejects.toThrow(/Required role/)
    })

    it('should block staff members from removing team members', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 1,
        documents: [{ $id: 'mem_3', userId: staffUserId, businessId, role: 'staff' }],
      } as any)

      await expect(
        businessMemberService.removeMember('mem_target', businessId, staffUserId)
      ).rejects.toThrow(/Required role/)
    })
  })
})
