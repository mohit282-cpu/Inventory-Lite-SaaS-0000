import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite for Concurrency & Idempotency Hardening Tests
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
      EXPENSES: 'expenses',
      FINANCIAL_SEQUENCES: 'financial_sequences',
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
import { saleService } from '@/services/sale.service'
import { paymentService } from '@/services/payment.service'
import { invoiceService } from '@/services/invoice.service'
import { idempotencyManager } from '@/lib/idempotency'

describe('P0 & P1 Hardening: Concurrency, Idempotency, Payment Reversal & Invoice Tests', () => {
  const bizId = 'biz_p0_hardening_test'
  const userId = 'user_owner_A'

  beforeEach(() => {
    vi.restoreAllMocks()
    idempotencyManager.clear()
  })

  it('P0-1 Stock Concurrency Test: Initial stock = 10, 10 concurrent requests of qty = 7 (Repeated 50 iterations)', async () => {
    for (let iter = 0; iter < 50; iter++) {
      idempotencyManager.clear()
      const product = await productService.createProduct(
        {
          name: `Strict Stock Item Iter ${iter}`,
          unit: 'pcs',
          purchasePrice: 100,
          sellingPrice: 150,
          stockQuantity: 10,
        },
        bizId,
        userId
      )

      // Launch 10 concurrent requests, each requesting qty = 7
      const requests = Array.from({ length: 10 }, (_, i) =>
        saleService.createSale(
          {
            items: [{ productId: product.$id, quantity: 7 }],
            paidAmount: 1050,
            paymentMethod: 'cash',
            idempotencyKey: `sale_concurrency_iter_${iter}_req_${i}`,
          },
          bizId,
          userId
        )
      )

      const results = await Promise.allSettled(requests)
      const successful = results.filter((r) => r.status === 'fulfilled')
      const failed = results.filter((r) => r.status === 'rejected')

      // Exactly 1 sale must succeed, 9 must fail safely
      expect(successful.length).toBe(1)
      expect(failed.length).toBe(9)

      // Final stock must be exactly 3 (10 - 7 = 3)
      const updatedProduct = await productService.getProduct(product.$id, bizId)
      expect(updatedProduct.stockQuantity).toBe(3)
    }
  })

  it('P0-1 Stock Concurrency Test: Initial stock = 100, 100 concurrent requests with varying quantities', async () => {
    const product = await productService.createProduct(
      {
        name: 'Bulk Stock Item 100',
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 20,
        stockQuantity: 100,
      },
      bizId,
      userId
    )

    // Launch 100 concurrent requests requesting 1 to 5 units each
    const requests = Array.from({ length: 100 }, (_, i) =>
      saleService.createSale(
        {
          items: [{ productId: product.$id, quantity: (i % 5) + 1 }],
          paidAmount: ((i % 5) + 1) * 20,
          paymentMethod: 'cash',
          idempotencyKey: `bulk_req_${i}`,
        },
        bizId,
        userId
      )
    )

    const results = await Promise.allSettled(requests)
    const successfulSales = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value)

    const finalProduct = await productService.getProduct(product.$id, bizId)

    // Verify stock is non-negative
    expect(finalProduct.stockQuantity).toBeGreaterThanOrEqual(0)

    // Total deducted quantity must equal initial stock (100) minus final stock
    const totalDeductedQuantity = successfulSales.reduce(
      (sum, s) => sum + (s.items[0]?.quantity || 0),
      0
    )
    expect(totalDeductedQuantity).toBe(100 - finalProduct.stockQuantity)
  })

  it('P0-2 Persistent Idempotency Test: 100 concurrent identical sale requests produce exactly 1 sale', async () => {
    const product = await productService.createProduct(
      {
        name: 'Idempotent Sale Item',
        unit: 'pcs',
        purchasePrice: 50,
        sellingPrice: 100,
        stockQuantity: 50,
      },
      bizId,
      userId
    )

    const sharedKey = `shared_idemp_key_${Date.now()}`

    // Launch 100 concurrent identical requests with the SAME idempotencyKey
    const requests = Array.from({ length: 100 }, () =>
      saleService.createSale(
        {
          items: [{ productId: product.$id, quantity: 2 }],
          paidAmount: 200,
          paymentMethod: 'cash',
          idempotencyKey: sharedKey,
        },
        bizId,
        userId
      )
    )

    const results = await Promise.allSettled(requests)
    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled'
    )

    // All 100 requests complete successfully returning the SAME sale document ID
    expect(fulfilled.length).toBe(100)
    const firstSaleId = fulfilled[0].value.sale.$id
    for (const res of fulfilled) {
      expect(res.value.sale.$id).toBe(firstSaleId)
    }

    // Stock deducted ONCE (50 - 2 = 48), NOT 200 units
    const updatedProduct = await productService.getProduct(product.$id, bizId)
    expect(updatedProduct.stockQuantity).toBe(48)
  })

  it('P0-2 Idempotency Mismatch Test: Reusing same idempotencyKey with different payload is REJECTED', async () => {
    const product = await productService.createProduct(
      {
        name: 'Mismatch Test Item',
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 20,
        stockQuantity: 10,
      },
      bizId,
      userId
    )

    const reuseKey = `reuse_key_${Date.now()}`

    // First request with payload A
    const saleA = await saleService.createSale(
      {
        items: [{ productId: product.$id, quantity: 1 }],
        paidAmount: 20,
        paymentMethod: 'cash',
        idempotencyKey: reuseKey,
      },
      bizId,
      userId
    )
    expect(saleA.sale.$id).toBeDefined()

    // Second request with SAME key but DIFFERENT payload B (different quantity 5)
    await expect(
      saleService.createSale(
        {
          items: [{ productId: product.$id, quantity: 5 }],
          paidAmount: 100,
          paymentMethod: 'cash',
          idempotencyKey: reuseKey,
        },
        bizId,
        userId
      )
    ).rejects.toThrow('IDEMPOTENCY_KEY_REUSE_MISMATCH')
  })

  it('P1 Payment Integrity Test: Payment deletion executes non-destructive reversal (-amount)', async () => {
    const product = await productService.createProduct(
      {
        name: 'Reversal Item',
        unit: 'pcs',
        purchasePrice: 100,
        sellingPrice: 1000,
        stockQuantity: 10,
      },
      bizId,
      userId
    )

    const saleRes = await saleService.createSale(
      {
        items: [{ productId: product.$id, quantity: 1 }],
        vatEnabled: false,
        paidAmount: 0,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    const paymentDoc = await paymentService.createPayment(
      {
        saleId: saleRes.sale.$id,
        amount: 1000,
        paymentMethod: 'cash',
        notes: 'Initial Payment',
      },
      bizId,
      userId
    )

    expect(paymentDoc.amount).toBe(1000)

    // Execute payment reversal / deletePayment
    await paymentService.deletePayment(paymentDoc.$id, bizId, userId)

    // Verify original payment record remains in history marked VOIDED
    const originalPayment = await paymentService.getById<any>(paymentDoc.$id, bizId)
    expect(originalPayment.status).toBe('VOIDED')

    // Verify compensating reversal entry exists (-1000) with status REVERSED
    const allPayments = await paymentService.listPayments(bizId, { saleId: saleRes.sale.$id })
    const reversalEntry = allPayments.find((p) => p.amount === -1000)
    expect(reversalEntry).toBeDefined()
    expect(reversalEntry?.status).toBe('REVERSED')

    // Verify Sale due amount was restored to 1000
    const updatedSale = await saleService.getSale(saleRes.sale.$id, bizId)
    expect(updatedSale.dueAmount).toBe(1000)
    expect(updatedSale.paidAmount).toBe(0)
  })

  it('P1 Invoice Numbering Concurrency Test: 100 simultaneous invoice creations produce 100 unique invoice numbers', async () => {
    const product = await productService.createProduct(
      {
        name: 'Invoice Concurrency Item',
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 20,
        stockQuantity: 200,
      },
      bizId,
      userId
    )

    // Create 100 sales
    const sales = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        saleService.createSale(
          {
            items: [{ productId: product.$id, quantity: 1 }],
            paidAmount: 20,
            paymentMethod: 'cash',
            idempotencyKey: `inv_sale_key_${i}`,
          },
          bizId,
          userId
        )
      )
    )

    // Launch 100 simultaneous invoice creation requests
    const invoiceRequests = sales.map((s, idx) =>
      invoiceService.createInvoice(
        {
          saleId: s.sale.$id,
          issueDate: new Date().toISOString(),
          idempotencyKey: `inv_req_key_${idx}`,
        },
        bizId,
        userId
      )
    )

    const invoiceResults = await Promise.all(invoiceRequests)
    const invoiceNumbers = invoiceResults.map((inv) => inv.invoiceNumber)

    // Check all 100 invoice numbers are unique (Set size === 100)
    const uniqueNumbers = new Set(invoiceNumbers)
    expect(uniqueNumbers.size).toBe(100)
  })
})
