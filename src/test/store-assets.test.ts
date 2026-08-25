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
      STORE_ASSETS: 'store_assets',
      FINANCIAL_SEQUENCES: 'financial_sequences',
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_owner_asset_901' })),
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

import { assetService } from '@/services/asset.service'

describe('Store Asset Management Tests', () => {
  const businessId = 'biz_asset_test_901'
  const ownerUserId = 'user_owner_asset_901'

  beforeEach(() => {
    mockStore.clear()
  })

  it('1. Should create a valid store asset with default ACTIVE status', async () => {
    const asset = await assetService.createAsset(
      {
        name: 'Inverter 1500VA Luminous',
        serialNumber: 'INV-80912',
        category: 'Electrical Equipment',
        cost: 32000,
        purchaseDate: '2026-08-25',
      },
      businessId,
      ownerUserId
    )

    expect(asset).toBeDefined()
    expect(asset.name).toBe('Inverter 1500VA Luminous')
    expect(asset.cost).toBe(32000)
    expect(asset.status).toBe('ACTIVE')
    expect(asset.businessId).toBe(businessId)
  })

  it('2. Should reject asset creation with empty name or negative cost', async () => {
    await expect(
      assetService.createAsset(
        {
          name: '',
          cost: 1000,
        },
        businessId,
        ownerUserId
      )
    ).rejects.toThrow(/Asset name is required/i)

    await expect(
      assetService.createAsset(
        {
          name: 'Thermal Receipt Printer',
          cost: -500,
        },
        businessId,
        ownerUserId
      )
    ).rejects.toThrow(/Asset cost must be a non-negative number/i)
  })

  it('3. Should update asset details and status to MAINTENANCE or DISPOSED', async () => {
    const asset = await assetService.createAsset(
      {
        name: 'Deep Freezer 300L',
        cost: 45000,
      },
      businessId,
      ownerUserId
    )

    const updated = await assetService.updateAsset(
      asset.$id,
      {
        status: 'MAINTENANCE',
        notes: 'Compressor service required',
      },
      businessId,
      ownerUserId
    )

    expect(updated.status).toBe('MAINTENANCE')
    expect(updated.notes).toBe('Compressor service required')
  })

  it('4. Should enforce tenant isolation on asset listing and deletion', async () => {
    const bizA = 'biz_tenant_asset_A'
    const bizB = 'biz_tenant_asset_B'

    await assetService.createAsset(
      { name: 'POS Scanner Biz A', cost: 5000 },
      bizA,
      ownerUserId
    )

    const listA = await assetService.listAssets(bizA)
    const listB = await assetService.listAssets(bizB)

    expect(listA.length).toBe(1)
    expect(listB.find((a) => a.businessId === bizA)).toBeUndefined()
  })
})
