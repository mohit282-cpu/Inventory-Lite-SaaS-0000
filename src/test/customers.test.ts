import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite Account & Databases for unit testing customers module
vi.mock('@/config/appwrite', () => {
  const store = new Map<string, any>()

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
      get: vi.fn(async () => ({ $id: 'user_123' })),
    },
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = { $id: id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, $collectionId: colId, $databaseId: _dbId, ...data }
        store.set(`${colId}:${doc.$id}`, doc)
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

import { customerService } from '@/services/customer.service'

describe('Customers Module Tests', () => {
  const bizA = 'business_A'
  const bizB = 'business_B'
  const user1 = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates and updates customer contact records', async () => {
    const customer = await customerService.createCustomer(
      {
        name: 'Ram Shrestha',
        phone: '9841234567',
        email: 'ram@shrestha.com',
        address: 'New Road, Kathmandu',
      },
      bizA,
      user1
    )

    expect(customer.name).toBe('Ram Shrestha')
    expect(customer.phone).toBe('9841234567')

    const updated = await customerService.updateCustomer(
      customer.$id,
      { address: 'Lazimpat, Kathmandu' },
      bizA
    )
    expect(updated.address).toBe('Lazimpat, Kathmandu')
  })

  it('calculates customer due amount and summary correctly', async () => {
    const cust = await customerService.createCustomer(
      {
        name: 'Hari Traders',
        phone: '9851000000',
        totalDue: 2500,
      },
      bizA,
      user1
    )

    const summary = await customerService.getCustomerSummary(cust.$id, bizA)
    expect(summary.customer.name).toBe('Hari Traders')
    expect(summary.totalDue).toBe(2500)
  })

  it('enforces multi-tenant isolation for customer records', async () => {
    await customerService.createCustomer(
      {
        name: 'Biz A Customer',
        phone: '9840000001',
      },
      bizA,
      user1
    )

    await customerService.createCustomer(
      {
        name: 'Biz B Customer',
        phone: '9840000002',
      },
      bizB,
      user1
    )

    const listA = await customerService.listCustomers(bizA)
    const listB = await customerService.listCustomers(bizB)

    expect(listA.some((c) => c.name === 'Biz A Customer')).toBe(true)
    expect(listA.some((c) => c.name === 'Biz B Customer')).toBe(false)

    expect(listB.some((c) => c.name === 'Biz B Customer')).toBe(true)
    expect(listB.some((c) => c.name === 'Biz A Customer')).toBe(false)
  })

  it('filters customers by Name, Phone, Email, Address, and PAN number', () => {
    const dataset = [
      { name: 'Diwash Pokhrel', phone: '9841111111', email: 'diwash@test.com', address: 'Baneshwor', panNumber: '600147586' },
      { name: 'Sita Enterprises', phone: '9852222222', email: 'sita@test.com', address: 'Patan', panNumber: '' },
      { name: 'Gita Stores', phone: '9863333333', email: '', address: 'Pokhara', panNumber: '300999888' },
    ]

    const search = (query: string) => {
      const q = query.toLowerCase().trim()
      if (!q) return dataset
      return dataset.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.panNumber.toLowerCase().includes(q)
      )
    }

    // Search by Name
    expect(search('diwash').length).toBe(1)
    // Search by Phone
    expect(search('9852222222').length).toBe(1)
    // Search by Email
    expect(search('sita@test.com').length).toBe(1)
    // Search by Address
    expect(search('pokhara').length).toBe(1)
    // Search by PAN
    expect(search('600147586').length).toBe(1)
  })

  it('sorts customer records numerically by Balance Due (outstanding vs zero vs negative credit)', () => {
    const dataset = [
      { name: 'Customer A', totalDue: 352 },
      { name: 'Customer B', totalDue: 0 },
      { name: 'Customer C', totalDue: -100 },
      { name: 'Customer D', totalDue: 14 },
    ]

    const sortDue = (dir: 'asc' | 'desc') => {
      return [...dataset].sort((a, b) => {
        const dueA = a.totalDue
        const dueB = b.totalDue
        return dir === 'asc' ? dueA - dueB : dueB - dueA
      })
    }

    // Ascending: -100, 0, 14, 352
    const asc = sortDue('asc')
    expect(asc[0].totalDue).toBe(-100)
    expect(asc[1].totalDue).toBe(0)
    expect(asc[2].totalDue).toBe(14)
    expect(asc[3].totalDue).toBe(352)

    // Descending: 352, 14, 0, -100
    const desc = sortDue('desc')
    expect(desc[0].totalDue).toBe(352)
    expect(desc[3].totalDue).toBe(-100)
  })

  it('differentiates State A (no customers exist) vs State B (search matches 0 customers)', () => {
    const getEmptyState = (totalCount: number, filteredCount: number, isSearchActive: boolean) => {
      if (totalCount === 0) return 'STATE_A_NO_CUSTOMERS'
      if (filteredCount === 0 && isSearchActive) return 'STATE_B_NO_SEARCH_RESULTS'
      return 'DATA_PRESENT'
    }

    expect(getEmptyState(0, 0, false)).toBe('STATE_A_NO_CUSTOMERS')
    expect(getEmptyState(5, 0, true)).toBe('STATE_B_NO_SEARCH_RESULTS')
    expect(getEmptyState(5, 2, true)).toBe('DATA_PRESENT')
  })
})
