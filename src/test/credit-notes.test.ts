import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStore = new Map<string, any>()

vi.mock('@/config/appwrite', () => {
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
      SUPPLIERS: 'suppliers',
      PURCHASES: 'purchases',
      PURCHASE_ITEMS: 'purchase_items',
      SUPPLIER_PAYMENTS: 'supplier_payments',
      SALES_RETURNS: 'sales_returns',
      SALES_RETURN_ITEMS: 'sales_return_items',
      CREDIT_NOTES: 'credit_notes',
      DEBIT_NOTES: 'debit_notes',
      FINANCIAL_SEQUENCES: 'financial_sequences',
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_owner_cn_1001' })),
    },
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = {
          $id: id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          $collectionId: colId,
          $databaseId: _dbId,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          ...data,
        }
        mockStore.set(`${colId}:${doc.$id}`, doc)
        return doc
      }),
      getDocument: vi.fn(async (_dbId, colId, id) => {
        const doc = mockStore.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        return { ...doc }
      }),
      updateDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = mockStore.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        const updated = { ...doc, ...data, $updatedAt: new Date().toISOString() }
        mockStore.set(`${colId}:${id}`, updated)
        return updated
      }),
      listDocuments: vi.fn(async (_dbId, colId, queries = []) => {
        let filtered = Array.from(mockStore.values()).filter((d) => d.$collectionId === colId)
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
      deleteDocument: vi.fn(async (_dbId, colId, id) => {
        mockStore.delete(`${colId}:${id}`)
        return true
      }),
    },
  }
})

vi.mock('@/lib/authorization', () => ({
  authorizeBusinessAccess: vi.fn(async () => true),
}))

import { creditNoteService } from '@/services/credit-note.service'
import { customerService } from '@/services/customer.service'

describe('Credit Note System Tests', () => {
  const businessId = 'biz_cn_test_1001'
  const ownerUserId = 'user_owner_cn_1001'

  beforeEach(() => {
    mockStore.clear()
  })

  it('1. Should create a valid Credit Note and generate CN sequence number', async () => {
    const cn = await creditNoteService.createCreditNote(
      {
        invoiceNumber: 'INV-2083-0001',
        reason: 'Goods returned damaged in transit',
        taxableAmount: 1000,
        vatAmount: 130,
      },
      businessId,
      ownerUserId
    )

    expect(cn).toBeDefined()
    expect(cn.creditNoteNumber).toMatch(/^CN-/)
    expect(cn.taxableAmount).toBe(1000)
    expect(cn.vatAmount).toBe(130)
    expect(cn.totalAmount).toBe(1130)
    expect(cn.businessId).toBe(businessId)
  })

  it('2. Should reject creating Credit Note with zero or negative taxable amount', async () => {
    await expect(
      creditNoteService.createCreditNote(
        {
          reason: 'Invalid amount test',
          taxableAmount: 0,
        },
        businessId,
        ownerUserId
      )
    ).rejects.toThrow(/Taxable amount must be a positive number/i)
  })

  it('3. Should reject creating Credit Note without a reason', async () => {
    await expect(
      creditNoteService.createCreditNote(
        {
          reason: '   ',
          taxableAmount: 500,
        },
        businessId,
        ownerUserId
      )
    ).rejects.toThrow(/reason is required/i)
  })

  it('4. Should adjust customer outstanding due balance when specified', async () => {
    // Create test customer
    const customer = await customerService.createCustomer(
      {
        name: 'Ram Bahadur',
        phone: '9841009988',
        totalDue: 5000,
      },
      businessId,
      ownerUserId
    )

    // Issue Credit Note with customer due adjustment
    await creditNoteService.createCreditNote(
      {
        customerId: customer.$id,
        reason: 'Overcharged billing adjustment',
        taxableAmount: 1000, // 1000 + 130 VAT = 1130 total adjustment
        adjustCustomerDue: true,
      },
      businessId,
      ownerUserId
    )

    const updatedCustomer = await customerService.getCustomer(customer.$id, businessId)
    expect(updatedCustomer?.totalDue).toBe(5000 - 1130)
  })

  it('5. Should enforce tenant isolation on listing credit notes', async () => {
    const bizA = 'biz_tenant_A'
    const bizB = 'biz_tenant_B'

    await creditNoteService.createCreditNote(
      {
        reason: 'Tenant A credit note',
        taxableAmount: 500,
      },
      bizA,
      ownerUserId
    )

    const listA = await creditNoteService.listCreditNotes(bizA)
    const listB = await creditNoteService.listCreditNotes(bizB)

    expect(listA.length).toBeGreaterThan(0)
    expect(listB.find((cn) => cn.businessId === bizA)).toBeUndefined()
  })
})
