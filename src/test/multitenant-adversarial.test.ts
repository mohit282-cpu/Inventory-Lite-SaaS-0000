import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map<string, any>()

// Setup in-memory Appwrite mock
vi.mock('@/config/appwrite', () => {
  return {
    DATABASE_ID: 'test_db',
    COLLECTIONS: {
      USERS: 'users',
      BUSINESSES: 'businesses',
      BUSINESS_MEMBERS: 'business_members',
      CATEGORIES: 'categories',
      PRODUCTS: 'products',
      STOCK_MOVEMENTS: 'stock_movements',
      CUSTOMERS: 'customers',
      SALES: 'sales',
      SALE_ITEMS: 'sale_items',
      INVOICES: 'invoices',
      PAYMENTS: 'payments',
      EXPENSES: 'expenses',
      FINANCIAL_SEQUENCES: 'financial_sequences',
      IDEMPOTENCY_KEYS: 'idempotency_keys',
      INVENTORY_LOCKS: 'inventory_locks',
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_attacker' })),
    },
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        const doc = {
          $id: docId,
          $collectionId: colId,
          $databaseId: _dbId,
          ...data,
        }
        store.set(`${colId}:${doc.$id}`, doc)
        return doc
      }),
      getDocument: vi.fn(async (_dbId, colId, id) => {
        const doc = store.get(`${colId}:${id}`)
        if (!doc) {
          const err: any = new Error(`Document ${id} not found`)
          err.code = 404
          err.type = 'document_not_found'
          throw err
        }
        return { ...doc }
      }),
      updateDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = store.get(`${colId}:${id}`)
        if (!doc) {
          const err: any = new Error(`Document ${id} not found`)
          err.code = 404
          err.type = 'document_not_found'
          throw err
        }
        const updated = { ...doc, ...data }
        store.set(`${colId}:${id}`, updated)
        return { ...updated }
      }),
      deleteDocument: vi.fn(async (_dbId, colId, id) => {
        store.delete(`${colId}:${id}`)
        return {}
      }),
      listDocuments: vi.fn(async (_dbId, colId, queries = []) => {
        let filtered = Array.from(store.values()).filter((d) => d.$collectionId === colId)
        for (const q of queries) {
          const qStr = typeof q === 'string' ? q : JSON.stringify(q)
          if (qStr.includes('equal')) {
            const fieldMatch =
              qStr.match(/equal\("([^"]+)"/) ||
              qStr.match(/"attribute":"([^"]+)"/) ||
              qStr.match(/attribute: '([^']+)'/)
            const valueMatch =
              qStr.match(/\["([^"]+)"\]/) ||
              qStr.match(/"values":\s*\["([^"]+)"\]/) ||
              qStr.match(/values: \['([^']+)'\]/)
            if (fieldMatch && valueMatch) {
              const field = fieldMatch[1]
              const val = valueMatch[1]
              filtered = filtered.filter((doc) => doc[field] === val)
            }
          }
        }
        return { documents: filtered, total: filtered.length }
      }),
      __clearStore: () => store.clear(),
    },
  }
})

import { databases } from '@/config/appwrite'
import { businessMemberService } from '@/services/business-member.service'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { SYSTEM_TENANT_ID } from '@/services/base.service'

describe('Phase 3 Multi-Tenant Adversarial & Privilege Escalation Tests', () => {
  const biz1 = 'biz_corp_alpha'
  const biz2 = 'biz_corp_beta'
  const owner1 = 'user_owner_alpha'
  const admin1 = 'user_admin_alpha'
  const staff1 = 'user_staff_alpha'
  const attacker = 'user_attacker_x'

  beforeEach(async () => {
    vi.clearAllMocks()
    ;(databases as any).__clearStore()

    // Seed Business 1 with owner1 as registered owner
    await databases.createDocument('test_db', 'businesses', biz1, {
      name: 'Alpha Corp',
      ownerId: owner1,
      createdBy: owner1,
    })

    // Seed Business 2 with separate owner
    await databases.createDocument('test_db', 'businesses', biz2, {
      name: 'Beta Corp',
      ownerId: 'user_owner_beta',
      createdBy: 'user_owner_beta',
    })

    // Add members to Business 1
    await businessMemberService.addMember({ userId: owner1, role: 'owner' }, biz1, owner1)
    await businessMemberService.addMember({ userId: admin1, role: 'admin' }, biz1, owner1)
    await businessMemberService.addMember({ userId: staff1, role: 'staff' }, biz1, owner1)

    // Add member to Business 2
    await businessMemberService.addMember({ userId: 'user_owner_beta', role: 'owner' }, biz2, 'user_owner_beta')
  })

  it('rejects attacker trying to claim initial owner on a business they did not create', async () => {
    // Attacker calls addMember claiming role: 'owner' and creatorUserId = attacker on biz1
    await expect(
      businessMemberService.addMember(
        { userId: attacker, role: 'owner' },
        biz1,
        attacker
      )
    ).rejects.toThrow(/Forbidden/)
  })

  it('rejects admin trying to add or promote someone to owner role', async () => {
    // Admin attempting to add a new owner
    await expect(
      businessMemberService.addMember(
        { userId: 'user_new_invitee', role: 'owner' },
        biz1,
        admin1
      )
    ).rejects.toThrow(/Forbidden/)
  })

  it('rejects admin trying to remove an existing owner', async () => {
    const ownerMember = await businessMemberService.getMemberByUserAndBusiness(owner1, biz1)
    expect(ownerMember).toBeDefined()

    await expect(
      businessMemberService.removeMember(ownerMember!.$id, biz1, admin1)
    ).rejects.toThrow(/Only business owners can remove an owner/)
  })

  it('rejects admin trying to demote an existing owner', async () => {
    const ownerMember = await businessMemberService.getMemberByUserAndBusiness(owner1, biz1)
    expect(ownerMember).toBeDefined()

    await expect(
      businessMemberService.updateMemberRole(ownerMember!.$id, 'staff', biz1, admin1)
    ).rejects.toThrow(/Only business owners can manage owner roles/)
  })

  it('rejects removing the sole owner of a business', async () => {
    const ownerMember = await businessMemberService.getMemberByUserAndBusiness(owner1, biz1)
    expect(ownerMember).toBeDefined()

    await expect(
      businessMemberService.removeMember(ownerMember!.$id, biz1, owner1)
    ).rejects.toThrow(/Cannot remove the sole owner of a business/)
  })

  it('rejects demoting the sole owner of a business', async () => {
    const ownerMember = await businessMemberService.getMemberByUserAndBusiness(owner1, biz1)
    expect(ownerMember).toBeDefined()

    await expect(
      businessMemberService.updateMemberRole(ownerMember!.$id, 'admin', biz1, owner1)
    ).rejects.toThrow(/Cannot demote the sole owner of a business/)
  })

  it('rejects unauthorized client attempts to use SYSTEM_TENANT_ID', async () => {
    await expect(
      authorizeBusinessAccess({
        userId: attacker,
        businessId: SYSTEM_TENANT_ID,
        isSystemOperation: false,
      })
    ).rejects.toThrow(/System Operation Bypass/)
  })

  it('rejects cross-tenant access between two legitimate businesses', async () => {
    // User from biz1 attempting to access biz2
    await expect(
      authorizeBusinessAccess({
        userId: owner1,
        businessId: biz2,
      })
    ).rejects.toThrow(/Forbidden/)
  })
})
