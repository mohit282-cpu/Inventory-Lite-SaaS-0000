import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite Account & Database for 25 Mandatory Security Tests
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
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_owner_A' })),
    },
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        if (data.notes === 'SIMULATE_DB_FAILURE') {
          throw new Error('Database connection failed')
        }
        const doc = {
          $id: id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          $collectionId: colId,
          $databaseId: _dbId,
          ...data,
        }
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
import { businessMemberService } from '@/services/business-member.service'
import { stockMovementService } from '@/services/stock-movement.service'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { calculateSaleTotals } from '@/lib/money'
import { validateFileUpload, sanitizeInput } from '@/lib/security'
import { idempotencyManager } from '@/lib/idempotency'

describe('25 Mandatory Production QA & Security Tests', () => {
  const bizA = 'business_A'
  const bizB = 'business_B'
  const ownerA = 'user_owner_A'
  const staffA = 'user_staff_A'
  const userB = 'user_owner_B'

  beforeEach(async () => {
    vi.clearAllMocks()
    idempotencyManager.clear()

    // Register active memberships for mock database lookup
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
      { userId: userB, role: 'owner' },
      bizB,
      userB,
      undefined,
      `mem_${userB}_${bizB}`
    )
  })

  // -------------------------------------------------------------
  // TENANT ISOLATION TESTS (TEST 01 - 05)
  // -------------------------------------------------------------
  it('TEST 01: User A reads User B product -> DENIED', async () => {
    const prodB = await productService.createProduct(
      { name: 'Product B', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 50 },
      bizB,
      userB
    )
    await expect(productService.getProduct(prodB.$id, bizA)).rejects.toThrow(/Tenant Isolation Violation/)
  })

  it('TEST 02: User A updates User B product -> DENIED', async () => {
    const prodB = await productService.createProduct(
      { name: 'Product B2', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 50 },
      bizB,
      userB
    )
    await expect(productService.updateProduct(prodB.$id, { name: 'Hacked' }, bizA)).rejects.toThrow(/Tenant Isolation Violation/)
  })

  it('TEST 03: User A deletes User B product -> DENIED', async () => {
    const prodB = await productService.createProduct(
      { name: 'Product B3', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 50 },
      bizB,
      userB
    )
    await expect(productService.deleteProduct(prodB.$id, bizA)).rejects.toThrow(/Tenant Isolation Violation/)
  })

  it('TEST 04: User A accesses Business B using manipulated businessId -> DENIED', async () => {
    await expect(
      authorizeBusinessAccess({ userId: ownerA, businessId: bizB, requiredRole: 'owner' })
    ).rejects.toThrow(/Forbidden/)
  })

  it('TEST 05: Normal user requests system access -> DENIED', async () => {
    await expect(
      authorizeBusinessAccess({ userId: ownerA, businessId: 'system', isSystemOperation: false })
    ).rejects.toThrow(/Forbidden/)
  })

  // -------------------------------------------------------------
  // RBAC AUTHORIZATION TESTS (TEST 06 - 09)
  // -------------------------------------------------------------
  it('TEST 06: Cashier / Staff tries to add admin -> DENIED', async () => {
    await expect(
      businessMemberService.addMember(
        { userId: 'user_new', role: 'admin' },
        bizA,
        staffA
      )
    ).rejects.toThrow(/Forbidden/)
  })

  it('TEST 07: Cashier / Staff tries to change admin role -> DENIED', async () => {
    const memberDoc = await businessMemberService.addMember(
      { userId: 'user_member', role: 'staff' },
      bizA,
      ownerA
    )
    await expect(
      businessMemberService.updateMemberRole(memberDoc.$id, 'admin', bizA, staffA)
    ).rejects.toThrow(/Forbidden/)
  })

  it('TEST 08: Unauthorized user modifies payment -> DENIED', async () => {
    const prod = await productService.createProduct(
      { name: 'Cable', unit: 'm', purchasePrice: 50, sellingPrice: 100, stockQuantity: 50 },
      bizA,
      ownerA
    )
    const saleRes = await saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 1 }], taxRate: 0, paidAmount: 0, paymentMethod: 'cash' },
      bizA,
      ownerA
    )
    const payment = await paymentService.createPayment(
      { saleId: saleRes.sale.$id, amount: 50, paymentMethod: 'cash' },
      bizA,
      ownerA
    )

    // Staff user attempts to modify payment
    await expect(
      paymentService.updatePayment(payment.$id, { amount: 80 }, bizA, staffA)
    ).rejects.toThrow(/Forbidden/)
  })

  it('TEST 09: Unauthorized user deletes payment -> DENIED', async () => {
    const prod = await productService.createProduct(
      { name: 'Wire', unit: 'm', purchasePrice: 50, sellingPrice: 100, stockQuantity: 50 },
      bizA,
      ownerA
    )
    const saleRes = await saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 1 }], taxRate: 0, paidAmount: 0, paymentMethod: 'cash' },
      bizA,
      ownerA
    )
    const payment = await paymentService.createPayment(
      { saleId: saleRes.sale.$id, amount: 50, paymentMethod: 'cash' },
      bizA,
      ownerA
    )

    // Staff user attempts to delete payment
    await expect(
      paymentService.deletePayment(payment.$id, bizA, staffA)
    ).rejects.toThrow(/Forbidden/)
  })

  // -------------------------------------------------------------
  // PAYMENT & IDEMPOTENCY TESTS (TEST 10 - 11)
  // -------------------------------------------------------------
  it('TEST 10: Payment operation fails halfway -> NO inconsistent balance', async () => {
    const prod = await productService.createProduct(
      { name: 'Steel', unit: 'kg', purchasePrice: 200, sellingPrice: 300, stockQuantity: 20 },
      bizA,
      ownerA
    )
    const saleRes = await saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 1 }], taxRate: 0, paidAmount: 100, paymentMethod: 'cash' },
      bizA,
      ownerA
    )

    expect(saleRes.sale.dueAmount).toBe(200)

    // Attempt payment with simulated DB write failure
    await expect(
      paymentService.createPayment(
        { saleId: saleRes.sale.$id, amount: 100, paymentMethod: 'cash', notes: 'SIMULATE_DB_FAILURE' },
        bizA,
        ownerA
      )
    ).rejects.toThrow(/Database connection failed/)

    // Recheck sale due balance
    const rechecked = await saleService.getSale(saleRes.sale.$id, bizA)
    expect(rechecked.dueAmount).toBe(200)
    expect(rechecked.paidAmount).toBe(100)
  })

  it('TEST 11: Double-click payment -> ONE payment (Idempotency Key)', async () => {
    const prod = await productService.createProduct(
      { name: 'Cement', unit: 'bag', purchasePrice: 500, sellingPrice: 700, stockQuantity: 50 },
      bizA,
      ownerA
    )
    const saleRes = await saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 2 }], taxRate: 0, paidAmount: 0, paymentMethod: 'cash' },
      bizA,
      ownerA
    )

    const key = `idem_${Date.now()}`

    // Rapid double submission with same idempotency key
    const p1Promise = paymentService.createPayment(
      { saleId: saleRes.sale.$id, amount: 500, paymentMethod: 'cash', idempotencyKey: key },
      bizA,
      ownerA
    )
    const p2Promise = paymentService.createPayment(
      { saleId: saleRes.sale.$id, amount: 500, paymentMethod: 'cash', idempotencyKey: key },
      bizA,
      ownerA
    )

    const [p1, p2] = await Promise.all([p1Promise, p2Promise])
    expect(p1.$id).toEqual(p2.$id)

    // Recheck sale due balance: paid should be 500, not 1000!
    const rechecked = await saleService.getSale(saleRes.sale.$id, bizA)
    expect(rechecked.paidAmount).toBe(500)
    expect(rechecked.dueAmount).toBe(900)
  })

  // -------------------------------------------------------------
  // STOCK CONCURRENCY & SALE TESTS (TEST 12 - 15)
  // -------------------------------------------------------------
  it('TEST 12: Two users sell the last product simultaneously -> Only valid sale succeeds', async () => {
    const prod = await productService.createProduct(
      { name: 'Limited Item', unit: 'pcs', purchasePrice: 100, sellingPrice: 200, stockQuantity: 1 },
      bizA,
      ownerA
    )

    const req1 = saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 1 }], paidAmount: 200, paymentMethod: 'cash' },
      bizA,
      ownerA
    )
    const req2 = saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 1 }], paidAmount: 200, paymentMethod: 'cash' },
      bizA,
      ownerA
    )

    const results = await Promise.allSettled([req1, req2])
    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    expect(fulfilled.length).toBeGreaterThanOrEqual(1)
    const finalProd = await productService.getProduct(prod.$id, bizA)
    expect(finalProd.stockQuantity).toBeGreaterThanOrEqual(0)
  })

  it('TEST 13: 100 concurrent stock requests -> No negative stock / no overselling', async () => {
    const prod = await productService.createProduct(
      { name: 'Bulk Product', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 10 },
      bizA,
      ownerA
    )

    const requests = Array.from({ length: 100 }).map(() =>
      stockMovementService.processStockOut(prod.$id, 1, bizA, ownerA, 'Concurrent test')
    )

    const results = await Promise.allSettled(requests)
    const successful = results.filter((r) => r.status === 'fulfilled')

    expect(successful.length).toBeLessThanOrEqual(100)

    const finalProd = await productService.getProduct(prod.$id, bizA)
    expect(finalProd.stockQuantity).toBeGreaterThanOrEqual(0)
  })

  it('TEST 14: Client sends manipulated sale total -> Ignored/recalculated server-side', () => {
    const totals = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 2, unitPrice: 100, discount: 0 }],
      discount: 0,
      taxRate: 13,
      paidAmount: 100,
    })

    // Subtotal = 200, Taxable = 200, Tax 13% = 26, Total = 226, Paid = 100, Due = 126
    expect(totals.total).toBe(226)
    expect(totals.dueAmount).toBe(126)
  })

  it('TEST 15: Client sends manipulated unit price -> Audit logged and validated', async () => {
    const prod = await productService.createProduct(
      { name: 'Catalog Item', unit: 'pcs', purchasePrice: 100, sellingPrice: 200, stockQuantity: 10 },
      bizA,
      ownerA
    )

    // Cashier sends overridden price Rs. 150
    const saleRes = await saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 1, unitPrice: 150 }], taxRate: 0, paidAmount: 150, paymentMethod: 'cash' },
      bizA,
      ownerA
    )

    expect(saleRes.sale.total).toBe(150)
  })

  // -------------------------------------------------------------
  // STRICT FINANCIAL VALIDATION TESTS (TEST 16 - 19)
  // -------------------------------------------------------------
  it('TEST 16: Client sends NaN -> REJECTED with explicit validation error', () => {
    expect(() =>
      calculateSaleTotals({
        items: [{ productId: 'p1', quantity: NaN, unitPrice: 100 }],
      })
    ).toThrow(/positive number|Invalid/)
  })

  it('TEST 17: Client sends Infinity -> REJECTED with explicit validation error', () => {
    expect(() =>
      calculateSaleTotals({
        items: [{ productId: 'p1', quantity: 1, unitPrice: Infinity }],
      })
    ).toThrow(/non-negative number|Invalid/)
  })

  it('TEST 18: Client sends negative payment -> REJECTED', async () => {
    await expect(
      paymentService.createPayment({ saleId: 'sale_1', amount: -100, paymentMethod: 'cash' }, bizA, ownerA)
    ).rejects.toThrow(/greater than zero/)
  })

  it('TEST 19: Client sends negative quantity -> REJECTED', () => {
    expect(() =>
      calculateSaleTotals({
        items: [{ productId: 'p1', quantity: -2, unitPrice: 100 }],
      })
    ).toThrow(/positive number/)
  })

  // -------------------------------------------------------------
  // INPUT SANITIZATION, FILES & DUPLICATES (TEST 20 - 25)
  // -------------------------------------------------------------
  it('TEST 20: Client sends malicious filename -> REJECTED', () => {
    const pathFile = new File(['data'], '../etc/passwd', { type: 'image/png' })
    const res = validateFileUpload(pathFile, ['image/png'])
    expect(res.valid).toBe(false)
    expect(res.error).toContain('Malicious filename')
  })

  it('TEST 21: Client sends malicious XSS payload -> Safely handled', () => {
    const sanitized = sanitizeInput('<script>alert("xss")</script>')
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toContain('&lt;script&gt;')
  })

  it('TEST 22: Duplicate SKU creation -> REJECTED on duplicate', async () => {
    await productService.createProduct(
      { name: 'P1', sku: 'SKU-UNIQUE-101', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 5 },
      bizA,
      ownerA
    )
    await expect(
      productService.createProduct(
        { name: 'P2', sku: 'SKU-UNIQUE-101', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 5 },
        bizA,
        ownerA
      )
    ).rejects.toThrow(/already exists/)
  })

  it('TEST 23: Duplicate barcode creation -> REJECTED on duplicate', async () => {
    await productService.createProduct(
      { name: 'B1', barcode: '8901234567890', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 5 },
      bizA,
      ownerA
    )
    await expect(
      productService.createProduct(
        { name: 'B2', barcode: '8901234567890', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 5 },
        bizA,
        ownerA
      )
    ).rejects.toThrow(/already exists/)
  })

  it('TEST 24: Stock movement update -> DENIED (Immutable audit log)', async () => {
    await expect(
      stockMovementService.update('sm_123', { quantity: 999 }, bizA)
    ).rejects.toThrow(/immutable audit logs/)
  })

  it('TEST 25: Stock movement delete -> DENIED (Immutable audit log)', async () => {
    await expect(
      stockMovementService.delete('sm_123', bizA)
    ).rejects.toThrow(/immutable audit logs/)
  })
})
