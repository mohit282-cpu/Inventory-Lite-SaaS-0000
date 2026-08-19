import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite Account & Databases for unit testing products & categories
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

import { categoryService } from '@/services/category.service'
import { productService } from '@/services/product.service'
import { stockMovementService } from '@/services/stock-movement.service'

describe('Products & Categories Module Tests', () => {
  const bizA = 'business_A'
  const bizB = 'business_B'
  const user1 = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates and lists categories under strict business tenant isolation', async () => {
    const catA = await categoryService.createCategory({ name: 'Beverages', description: 'Drinks' }, bizA, user1)
    expect(catA.name).toBe('Beverages')
    expect(catA.businessId).toBe(bizA)

    const catB = await categoryService.createCategory({ name: 'Groceries', description: 'Food items' }, bizB, user1)
    expect(catB.name).toBe('Groceries')
    expect(catB.businessId).toBe(bizB)

    // Business A should only list Beverages
    const listA = await categoryService.listCategories(bizA)
    expect(listA.length).toBe(1)
    expect(listA[0].name).toBe('Beverages')

    // Business B should only list Groceries
    const listB = await categoryService.listCategories(bizB)
    expect(listB.length).toBe(1)
    expect(listB[0].name).toBe('Groceries')
  })

  it('creates product and automatically records opening stock movement', async () => {
    const product = await productService.createProduct(
      {
        name: 'Real Mango Juice 1L',
        sku: 'SKU-MANGO-001',
        unit: 'pcs',
        purchasePrice: 200,
        sellingPrice: 260,
        stockQuantity: 50,
        lowStockThreshold: 10,
      },
      bizA,
      user1
    )

    expect(product.name).toBe('Real Mango Juice 1L')
    expect(product.sku).toBe('SKU-MANGO-001')
    expect(product.stockQuantity).toBe(50)

    // Stock movements list should contain initial opening stock movement
    const movements = await stockMovementService.listMovements(bizA, { productId: product.$id })
    expect(movements.length).toBeGreaterThan(0)
    expect(movements[0].type).toBe('stock_in')
    expect(movements[0].quantity).toBe(50)
  })

  it('rejects duplicate SKU within the same business', async () => {
    await productService.createProduct(
      {
        name: 'Wai Wai Noodles',
        sku: 'SKU-WAIWAI',
        unit: 'pkt',
        purchasePrice: 18,
        sellingPrice: 20,
        stockQuantity: 100,
      },
      bizA,
      user1
    )

    // Attempting to create duplicate SKU for Business A must throw an error
    await expect(
      productService.createProduct(
        {
          name: 'Wai Wai Noodles 2',
          sku: 'SKU-WAIWAI',
          unit: 'pkt',
          purchasePrice: 18,
          sellingPrice: 20,
          stockQuantity: 10,
        },
        bizA,
        user1
      )
    ).rejects.toThrow(/already exists/)
  })

  it('enforces multi-tenant isolation for products across businesses', async () => {
    await productService.createProduct(
      {
        name: 'Biz A Product',
        sku: 'SKU-BIZA',
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        stockQuantity: 10,
      },
      bizA,
      user1
    )

    await productService.createProduct(
      {
        name: 'Biz B Product',
        sku: 'SKU-BIZB',
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        stockQuantity: 10,
      },
      bizB,
      user1
    )

    const listA = await productService.listProducts(bizA)
    const listB = await productService.listProducts(bizB)

    expect(listA.some((p) => p.sku === 'SKU-BIZA')).toBe(true)
    expect(listA.some((p) => p.sku === 'SKU-BIZB')).toBe(false)

    expect(listB.some((p) => p.sku === 'SKU-BIZB')).toBe(true)
    expect(listB.some((p) => p.sku === 'SKU-BIZA')).toBe(false)
  })
})
