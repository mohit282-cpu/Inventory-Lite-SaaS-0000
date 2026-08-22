import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite for Inventory Concurrency Tests
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
      PAYMENTS: 'payments',
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_owner_A' })),
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
        store.set(`${colId}:${doc.$id}`, doc)
        return doc
      }),
      getDocument: vi.fn(async (_dbId, colId, id) => {
        const doc = store.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        return { ...doc }
      }),
      updateDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = store.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        const updated = { ...doc, ...data, $updatedAt: new Date().toISOString() }
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
    },
  }
})

import { productService } from '@/services/product.service'
import { stockMovementService } from '@/services/stock-movement.service'
import { saleService } from '@/services/sale.service'

describe('Inventory Consistency & Concurrency Hardening Tests', () => {
  const bizId = 'biz_concurrency_test'
  const userId = 'user_owner_A'

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('Scenario: Initial stock = 10. Tx A sells 7, Tx B sells 7 simultaneously. Exactly one succeeds.', async () => {
    const product = await productService.createProduct(
      {
        name: 'Limited Stock Product',
        unit: 'pcs',
        purchasePrice: 100,
        sellingPrice: 150,
        stockQuantity: 10,
      },
      bizId,
      userId
    )

    // Execute 2 simultaneous sales of 7 items
    const salePromiseA = saleService.createSale(
      {
        items: [{ productId: product.$id, quantity: 7 }],
        paidAmount: 1050,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    const salePromiseB = saleService.createSale(
      {
        items: [{ productId: product.$id, quantity: 7 }],
        paidAmount: 1050,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    const results = await Promise.allSettled([salePromiseA, salePromiseB])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    // EXACTLY ONE TRANSACTION SUCCEEDS
    expect(fulfilled.length).toBe(1)
    expect(rejected.length).toBe(1)

    // Check rejection error message
    const rejectedError = (rejected[0] as PromiseRejectedResult).reason
    expect(rejectedError.message).toContain('Insufficient stock for product "Limited Stock Product"')

    // Verify final stock is exactly 3 (10 - 7) and NEVER negative
    const updatedProduct = await productService.getProduct(product.$id, bizId)
    expect(updatedProduct.stockQuantity).toBe(3)
  })

  it('Stock quantity can NEVER become negative', async () => {
    const product = await productService.createProduct(
      {
        name: 'Single Unit Product',
        unit: 'pcs',
        purchasePrice: 50,
        sellingPrice: 80,
        stockQuantity: 1,
      },
      bizId,
      userId
    )

    await expect(
      stockMovementService.processStockOut(product.$id, 5, bizId, userId, 'Attempt oversell')
    ).rejects.toThrow('Insufficient stock')

    await expect(
      productService.updateStockQuantity(product.$id, -5, bizId)
    ).rejects.toThrow('Stock quantity cannot be negative')

    const updatedProduct = await productService.getProduct(product.$id, bizId)
    expect(updatedProduct.stockQuantity).toBe(1)
  })

  it('Handles concurrent stock adjustments safely', async () => {
    const product = await productService.createProduct(
      {
        name: 'Adjustment Product',
        unit: 'kg',
        purchasePrice: 200,
        sellingPrice: 300,
        stockQuantity: 20,
      },
      bizId,
      userId
    )

    const adj1 = stockMovementService.processAdjustment(product.$id, 15, bizId, userId, 'Count audit A')
    const adj2 = stockMovementService.processAdjustment(product.$id, 12, bizId, userId, 'Count audit B')

    const results = await Promise.allSettled([adj1, adj2])
    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    expect(fulfilled.length).toBeGreaterThanOrEqual(1)

    const finalProd = await productService.getProduct(product.$id, bizId)
    expect(finalProd.stockQuantity).toBeGreaterThanOrEqual(0)
  })

  it('Executes compensating rollback on failed sale transaction', async () => {
    const product = await productService.createProduct(
      {
        name: 'Rollback Test Item',
        unit: 'box',
        purchasePrice: 10,
        sellingPrice: 20,
        stockQuantity: 5,
      },
      bizId,
      userId
    )

    // Attempt sale with invalid quantity
    await expect(
      saleService.createSale(
        {
          items: [{ productId: product.$id, quantity: -1 }],
          paidAmount: 20,
          paymentMethod: 'cash',
        },
        bizId,
        userId
      )
    ).rejects.toThrow()

    // Verify stock remains untouched at 5
    const finalProd = await productService.getProduct(product.$id, bizId)
    expect(finalProd.stockQuantity).toBe(5)
  })

  it('Idempotent sale request with same idempotencyKey prevents duplicate stock deduction', async () => {
    const product = await productService.createProduct(
      {
        name: 'Idempotency Item',
        unit: 'pcs',
        purchasePrice: 100,
        sellingPrice: 200,
        stockQuantity: 10,
      },
      bizId,
      userId
    )

    const idempotencyKey = `sale_idemp_key_${Date.now()}`

    const sale1 = await saleService.createSale(
      {
        items: [{ productId: product.$id, quantity: 2 }],
        paidAmount: 400,
        paymentMethod: 'cash',
        idempotencyKey,
      },
      bizId,
      userId
    )

    const sale2 = await saleService.createSale(
      {
        items: [{ productId: product.$id, quantity: 2 }],
        paidAmount: 400,
        paymentMethod: 'cash',
        idempotencyKey,
      },
      bizId,
      userId
    )

    // Duplicate request returns cached sale instance
    expect(sale1.sale.$id).toBe(sale2.sale.$id)

    // Stock deducted ONCE (10 - 2 = 8), NOT TWICE
    const finalProd = await productService.getProduct(product.$id, bizId)
    expect(finalProd.stockQuantity).toBe(8)
  })
})
