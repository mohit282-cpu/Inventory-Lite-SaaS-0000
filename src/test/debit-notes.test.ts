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
      get: vi.fn(async () => ({ $id: 'user_owner_dn_2001' })),
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

import { debitNoteService } from '@/services/debit-note.service'
import { supplierService } from '@/services/supplier.service'

describe('Debit Note System Tests', () => {
  const businessId = 'biz_dn_test_2001'
  const ownerUserId = 'user_owner_dn_2001'

  beforeEach(() => {
    mockStore.clear()
  })

  it('1. Should create a valid Debit Note and generate DN sequence number', async () => {
    const dn = await debitNoteService.createDebitNote(
      {
        purchaseId: 'PUR-2083-0001',
        supplierName: 'ABC Suppliers Ltd',
        reason: 'Goods returned to supplier due to defect',
        taxableAmount: 2000,
        vatAmount: 260,
      },
      businessId,
      ownerUserId
    )

    expect(dn).toBeDefined()
    expect(dn.debitNoteNumber).toMatch(/^DN-/)
    expect(dn.taxableAmount).toBe(2000)
    expect(dn.vatAmount).toBe(260)
    expect(dn.totalAmount).toBe(2260)
    expect(dn.businessId).toBe(businessId)
  })

  it('2. Should reject Debit Note with zero or negative taxable amount', async () => {
    await expect(
      debitNoteService.createDebitNote(
        {
          reason: 'Invalid amount',
          taxableAmount: -100,
        },
        businessId,
        ownerUserId
      )
    ).rejects.toThrow(/Taxable amount must be a positive number/i)
  })

  it('3. Should adjust supplier outstanding payable balance when specified', async () => {
    // Create supplier
    const supplier = await supplierService.createSupplier(
      {
        name: 'Himalayan Wholesale Traders',
        phone: '9851099887',
      },
      businessId,
      ownerUserId
    )

    // Set initial outstanding payable for testing
    await supplierService.updateSupplier(supplier.$id, { outstandingPayable: 10000 }, businessId, ownerUserId)

    // Issue Debit Note with balance adjustment
    await debitNoteService.createDebitNote(
      {
        supplierId: supplier.$id,
        reason: 'Purchase return adjustment',
        taxableAmount: 2000, // 2000 + 260 VAT = 2260 total reduction
        adjustSupplierBalance: true,
      },
      businessId,
      ownerUserId
    )

    const updatedSupplier = await supplierService.getSupplier(supplier.$id, businessId)
    expect(updatedSupplier?.outstandingPayable).toBe(10000 - 2260)
  })

  it('4. Should enforce tenant isolation on listing debit notes', async () => {
    const bizX = 'biz_tenant_X'
    const bizY = 'biz_tenant_Y'

    await debitNoteService.createDebitNote(
      {
        reason: 'Tenant X debit note',
        taxableAmount: 800,
      },
      bizX,
      ownerUserId
    )

    const listX = await debitNoteService.listDebitNotes(bizX)
    const listY = await debitNoteService.listDebitNotes(bizY)

    expect(listX.length).toBeGreaterThan(0)
    expect(listY.find((dn) => dn.businessId === bizX)).toBeUndefined()
  })
})
