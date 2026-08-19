import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite Account & Databases for unit testing stock management
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

import { productService } from '@/services/product.service'
import { stockMovementService } from '@/services/stock-movement.service'

describe('Stock Management Module Tests', () => {
  const bizA = 'business_A'
  const bizB = 'business_B'
  const user1 = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('processes Stock In correctly and updates product quantity', async () => {
    const prod = await productService.createProduct(
      {
        name: 'Coca Cola 250ml',
        sku: 'SKU-COKE-250',
        unit: 'pcs',
        purchasePrice: 40,
        sellingPrice: 50,
        stockQuantity: 20,
      },
      bizA,
      user1
    )

    const movement = await stockMovementService.processStockIn(
      prod.$id,
      30,
      bizA,
      user1,
      'Supplier Delivery PO-101'
    )

    expect(movement.type).toBe('stock_in')
    expect(movement.previousQuantity).toBe(20)
    expect(movement.newQuantity).toBe(50)
    expect(movement.quantity).toBe(30)

    const updatedProd = await productService.getProduct(prod.$id, bizA)
    expect(updatedProd.stockQuantity).toBe(50)
  })

  it('processes Stock Out correctly and prevents negative stock', async () => {
    const prod = await productService.createProduct(
      {
        name: 'Red Bull 250ml',
        sku: 'SKU-REDBULL',
        unit: 'pcs',
        purchasePrice: 150,
        sellingPrice: 180,
        stockQuantity: 15,
      },
      bizA,
      user1
    )

    // Stock Out 5 units -> stock should become 10
    const movement = await stockMovementService.processStockOut(
      prod.$id,
      5,
      bizA,
      user1,
      'Customer order'
    )
    expect(movement.previousQuantity).toBe(15)
    expect(movement.newQuantity).toBe(10)

    const updatedProd = await productService.getProduct(prod.$id, bizA)
    expect(updatedProd.stockQuantity).toBe(10)

    // Attempting Stock Out of 20 units when only 10 available MUST fail (negative stock protection)
    await expect(
      stockMovementService.processStockOut(prod.$id, 20, bizA, user1, 'Excessive deduction')
    ).rejects.toThrow(/Insufficient stock/)
  })

  it('processes Stock Adjustment correctly', async () => {
    const prod = await productService.createProduct(
      {
        name: 'Cadbury Dairy Milk 50g',
        sku: 'SKU-DAIRYMILK',
        unit: 'pcs',
        purchasePrice: 60,
        sellingPrice: 80,
        stockQuantity: 100,
      },
      bizA,
      user1
    )

    // Adjust target stock down to 85 (e.g. 15 damaged)
    const movement = await stockMovementService.processAdjustment(
      prod.$id,
      85,
      bizA,
      user1,
      'Physical store audit'
    )

    expect(movement.type).toBe('adjustment')
    expect(movement.previousQuantity).toBe(100)
    expect(movement.newQuantity).toBe(85)
    expect(movement.quantity).toBe(15)

    const updatedProd = await productService.getProduct(prod.$id, bizA)
    expect(updatedProd.stockQuantity).toBe(85)
  })

  it('detects low stock and out of stock products correctly', async () => {
    await productService.createProduct(
      {
        name: 'Low Stock Coffee',
        sku: 'SKU-COFFEE-LOW',
        unit: 'pkt',
        purchasePrice: 300,
        sellingPrice: 400,
        stockQuantity: 3,
        lowStockThreshold: 10,
      },
      bizA,
      user1
    )

    await productService.createProduct(
      {
        name: 'High Stock Tea',
        sku: 'SKU-TEA-HIGH',
        unit: 'pkt',
        purchasePrice: 150,
        sellingPrice: 200,
        stockQuantity: 50,
        lowStockThreshold: 10,
      },
      bizA,
      user1
    )

    const lowStock = await productService.getLowStockProducts(bizA)
    expect(lowStock.some((p) => p.sku === 'SKU-COFFEE-LOW')).toBe(true)
    expect(lowStock.some((p) => p.sku === 'SKU-TEA-HIGH')).toBe(false)
  })

  it('enforces multi-tenant isolation on stock movements', async () => {
    const prodA = await productService.createProduct(
      {
        name: 'Product Biz A',
        sku: 'SKU-P-A',
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        stockQuantity: 10,
      },
      bizA,
      user1
    )

    const prodB = await productService.createProduct(
      {
        name: 'Product Biz B',
        sku: 'SKU-P-B',
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 15,
        stockQuantity: 10,
      },
      bizB,
      user1
    )

    await stockMovementService.processStockIn(prodA.$id, 5, bizA, user1, 'Intake A')
    await stockMovementService.processStockIn(prodB.$id, 5, bizB, user1, 'Intake B')

    const movsA = await stockMovementService.listMovements(bizA)
    const movsB = await stockMovementService.listMovements(bizB)

    expect(movsA.every((m) => m.businessId === bizA)).toBe(true)
    expect(movsB.every((m) => m.businessId === bizB)).toBe(true)
  })
})
