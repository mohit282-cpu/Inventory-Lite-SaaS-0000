import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite Account & Databases for unit testing auth flow
vi.mock('@/config/appwrite', () => {
  const store = new Map<string, any>()
  let currentSession: any = null
  let currentUserAccount: any = null

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
      EXPENSES: 'expenses',
    },
    account: {
      create: vi.fn(async (_id, email, _password, name) => {
        const u = { $id: _id || 'user_123', email, name }
        currentUserAccount = u
        return u
      }),
      createEmailPasswordSession: vi.fn(async (email) => {
        currentSession = { $id: 'sess_123', userId: currentUserAccount?.$id || 'user_123', email }
        return currentSession
      }),
      deleteSession: vi.fn(async () => {
        currentSession = null
        return {}
      }),
      get: vi.fn(async () => {
        if (!currentSession) throw new Error('Unauthorized')
        return currentUserAccount || { $id: 'user_123', email: 'owner@test.com', name: 'Ram Thapa' }
      }),
      createRecovery: vi.fn(async () => ({ $id: 'token_123' })),
      updateRecovery: vi.fn(async () => ({ $id: 'token_123' })),
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
      updateDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = store.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        const updated = { ...doc, ...data }
        store.set(`${colId}:${id}`, updated)
        return updated
      }),
      deleteDocument: vi.fn(async (_dbId, colId, id) => {
        store.delete(`${colId}:${id}`)
        return {}
      }),
      listDocuments: vi.fn(async (_dbId, colId, queries = []) => {
        let filtered = Array.from(store.values()).filter(d => d.$collectionId === colId)
        for (const q of queries) {
          const qStr = typeof q === 'string' ? q : JSON.stringify(q)
          if (qStr.includes('equal')) {
            const fieldMatch = qStr.match(/equal\("([^"]+)"/) || qStr.match(/"attribute":"([^"]+)"/) || qStr.match(/attribute: '([^']+)'/)
            const valueMatch = qStr.match(/\["([^"]+)"\]/) || qStr.match(/"values":\s*\["([^"]+)"\]/) || qStr.match(/values: \['([^']+)'\]/)
            if (fieldMatch && valueMatch) {
              const field = fieldMatch[1]
              const val = valueMatch[1]
              filtered = filtered.filter(doc => doc[field] === val)
            }
          }
        }
        return { documents: filtered, total: filtered.length }
      }),
    },
  }
})

import { authService } from '@/services/auth.service'
import { userService } from '@/services/user.service'
import { businessService } from '@/services/business.service'
import { businessMemberService } from '@/services/business-member.service'

describe('Phase 2 Authentication & Business Onboarding Flow Tests', () => {
  const userEmail = 'ram.sharma@nepalstore.com'
  const userPass = 'SecurePass123!'
  const userName = 'Ram Sharma'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers user and creates extended profile record', async () => {
    const newAcc = await authService.register(userEmail, userPass, userName)
    expect(newAcc.email).toBe(userEmail)
    expect(newAcc.name).toBe(userName)

    const profile = await userService.createUserProfile(newAcc.$id, {
      name: userName,
      email: userEmail,
    })

    expect(profile.name).toBe(userName)
    expect(profile.email).toBe(userEmail)
  })

  it('creates business during onboarding and sets owner role', async () => {
    const userId = 'user_123'
    await userService.createUserProfile(userId, { name: userName, email: userEmail })

    const businessData = {
      name: 'Kathmandu Retail Traders',
      phone: '9841000000',
      address: 'New Road, Kathmandu',
      panNumber: '600112233',
      currency: 'NPR' as const,
      timezone: 'Asia/Kathmandu',
    }

    const business = await businessService.createBusiness(businessData, userId)
    expect(business.name).toBe('Kathmandu Retail Traders')
    expect(business.currency).toBe('NPR')

    const membership = await businessMemberService.addMember(
      { userId, role: 'owner' },
      business.$id,
      userId
    )
    expect(membership.businessId).toBe(business.$id)
    expect(membership.role).toBe('owner')

    const updatedUser = await userService.setActiveBusiness(userId, business.$id)
    expect(updatedUser.preferences.activeBusinessId).toBe(business.$id)
  })

  it('handles password recovery request flow', async () => {
    const token = await authService.recoverPassword(userEmail)
    expect(token).toBeDefined()

    const updatedToken = await authService.completePasswordRecovery('user_123', 'secret_token', 'NewPass123!')
    expect(updatedToken).toBeDefined()
  })
})
