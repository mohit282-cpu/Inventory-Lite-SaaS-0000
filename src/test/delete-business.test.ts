import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite for Account Deletion Tests
vi.mock('@/config/appwrite', () => {
  const store = new Map<string, any>()
  let mockCurrentSession: any = { $id: 'sess_123', userId: 'user_owner_A' }

  return {
    DATABASE_ID: 'inventory_lite_db',
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
    },
    account: {
      createEmailPasswordSession: vi.fn(async (_email, password) => {
        if (password === 'WrongPassword') {
          throw new Error('Invalid credentials')
        }
        mockCurrentSession = { $id: 'sess_123', userId: 'user_owner_A' }
        return mockCurrentSession
      }),
      deleteSession: vi.fn(async () => {
        mockCurrentSession = null
        return {}
      }),
      get: vi.fn(async () => {
        if (!mockCurrentSession) throw new Error('Unauthorized')
        return { $id: mockCurrentSession.userId }
      }),
    },
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = { $id: id, $collectionId: colId, $databaseId: _dbId, ...data }
        store.set(`${colId}:${id}`, doc)
        return doc
      }),
      getDocument: vi.fn(async (_dbId, colId, id) => {
        const doc = store.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        return doc
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
    },
  }
})

import { accountDeletionService } from '@/services/account-deletion.service'
import { businessMemberService } from '@/services/business-member.service'
import { productService } from '@/services/product.service'

describe('Delete Business & Account Security Tests', () => {
  const bizA = 'biz_A'
  const bizB = 'biz_B'
  const ownerA = 'user_owner_A'
  const staffA = 'user_staff_A'
  const ownerB = 'user_owner_B'

  beforeEach(async () => {
    vi.clearAllMocks()

    // Register memberships in mock store
    await businessMemberService.create(
      { userId: ownerA, role: 'owner' },
      bizA,
      ownerA,
      undefined,
      `mem_${ownerA}_${bizA}`
    )
    await businessMemberService.create(
      { userId: staffA, role: 'staff' },
      bizA,
      ownerA,
      undefined,
      `mem_${staffA}_${bizA}`
    )
    await businessMemberService.create(
      { userId: ownerB, role: 'owner' },
      bizB,
      ownerB,
      undefined,
      `mem_${ownerB}_${bizB}`
    )
  })

  it('rejects deletion if password re-authentication fails', async () => {
    await expect(
      accountDeletionService.deleteBusinessAndAccount(bizA, ownerA, 'WrongPassword', 'owner@biz.com')
    ).rejects.toThrow(/re-authentication failed/)
  })

  it('rejects deletion attempt by staff member (RBAC enforcement)', async () => {
    await expect(
      accountDeletionService.deleteBusinessAndAccount(bizA, staffA, 'CorrectPass123!', 'staff@biz.com')
    ).rejects.toThrow(/Forbidden/)
  })

  it('deletes Business A records while leaving Business B records completely intact (Tenant Isolation)', async () => {
    const prodA = await productService.createProduct(
      { name: 'Prod A', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 10 },
      bizA,
      ownerA
    )
    const prodB = await productService.createProduct(
      { name: 'Prod B', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 10 },
      bizB,
      ownerB
    )

    // Execute deletion for Business A
    await accountDeletionService.deleteBusinessAndAccount(bizA, ownerA, 'CorrectPass123!', 'owner@biz.com')

    // Verify Business A product is gone
    await expect(productService.getProduct(prodA.$id, bizA)).rejects.toThrow()

    // Verify Business B product is completely intact
    const remainingB = await productService.getProduct(prodB.$id, bizB)
    expect(remainingB.$id).toBe(prodB.$id)
    expect(remainingB.name).toBe('Prod B')
  })
})
