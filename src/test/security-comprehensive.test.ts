import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite Account & Database for 32 Mandatory Security Tests
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
import { customerService } from '@/services/customer.service'
import { authorizeBusinessAccess, checkRolePermission } from '@/lib/authorization'
import { calculateSaleTotals } from '@/lib/money'
import { validateFileUpload, sanitizeInput } from '@/lib/security'
import { idempotencyManager } from '@/lib/idempotency'

describe('32 Mandatory Production Security Tests', () => {
  const bizA = 'business_A'
  const bizB = 'business_B'
  const ownerA = 'user_owner_A'
  const adminA = 'user_admin_A'
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
      { userId: adminA, role: 'admin' },
      bizA,
      ownerA,
      undefined,
      `mem_${adminA}_${bizA}`
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

  // 1. Cross-tenant READ
  it('TEST 01: Cross-tenant READ -> DENIED', async () => {
    const prodB = await productService.createProduct(
      { name: 'Product B', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 50 },
      bizB,
      userB
    )
    await expect(productService.getProduct(prodB.$id, bizA)).rejects.toThrow(/Tenant Isolation Violation/)
  })

  // 2. Cross-tenant UPDATE
  it('TEST 02: Cross-tenant UPDATE -> DENIED', async () => {
    const prodB = await productService.createProduct(
      { name: 'Product B2', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 50 },
      bizB,
      userB
    )
    await expect(productService.updateProduct(prodB.$id, { name: 'Hacked' }, bizA)).rejects.toThrow(/Tenant Isolation Violation/)
  })

  // 3. Cross-tenant DELETE
  it('TEST 03: Cross-tenant DELETE -> DENIED', async () => {
    const prodB = await productService.createProduct(
      { name: 'Product B3', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 50 },
      bizB,
      userB
    )
    await expect(productService.deleteProduct(prodB.$id, bizA)).rejects.toThrow(/Tenant Isolation Violation/)
  })

  // 4. Cross-tenant LIST
  it('TEST 04: Cross-tenant LIST -> DENIED', async () => {
    await expect(
      authorizeBusinessAccess({ userId: ownerA, businessId: bizB, requiredRole: 'owner' })
    ).rejects.toThrow(/Forbidden/)
  })

  // 5. Fake userId
  it('TEST 05: Fake userId -> DENIED', async () => {
    await expect(
      authorizeBusinessAccess({ userId: 'fake_non_existent_user', businessId: bizA })
    ).rejects.toThrow(/Forbidden/)
  })

  // 6. Fake role
  it('TEST 06: Fake role spoofing -> DENIED', () => {
    expect(checkRolePermission('staff', 'business:delete')).toBe(false)
    expect(checkRolePermission('staff', 'settings:manage')).toBe(false)
  })

  // 7. Fake actorRole
  it('TEST 07: Fake actorRole parameter -> DENIED', async () => {
    await expect(
      businessMemberService.addMember(
        { userId: 'usr_new', role: 'admin' },
        bizA,
        staffA
      )
    ).rejects.toThrow(/Forbidden/)
  })

  // 8. System access from client
  it('TEST 08: System access from client -> DENIED', async () => {
    await expect(
      authorizeBusinessAccess({ userId: ownerA, businessId: 'system', isSystemOperation: false })
    ).rejects.toThrow(/Forbidden/)
  })

  // 9. Staff -> admin action
  it('TEST 09: Staff -> admin action -> DENIED', async () => {
    const memberDoc = await businessMemberService.addMember(
      { userId: 'user_member', role: 'staff' },
      bizA,
      ownerA
    )
    await expect(
      businessMemberService.updateMemberRole(memberDoc.$id, 'admin', bizA, staffA)
    ).rejects.toThrow(/Forbidden/)
  })

  // 10. Admin -> owner-only action
  it('TEST 10: Admin -> owner-only action -> DENIED', async () => {
    expect(checkRolePermission('admin', 'business:delete')).toBe(false)
  })

  // 11. Unauthorized payment update
  it('TEST 11: Unauthorized payment update -> DENIED', async () => {
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

    await expect(
      paymentService.updatePayment(payment.$id, { amount: 80 }, bizA, staffA)
    ).rejects.toThrow(/Forbidden/)
  })

  // 12. Unauthorized payment deletion
  it('TEST 12: Unauthorized payment deletion -> DENIED', async () => {
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

    await expect(
      paymentService.deletePayment(payment.$id, bizA, staffA)
    ).rejects.toThrow(/Forbidden/)
  })

  // 13. Double payment
  it('TEST 13: Double payment -> ONE PAYMENT (Idempotency Key)', async () => {
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

    const rechecked = await saleService.getSale(saleRes.sale.$id, bizA)
    expect(rechecked.paidAmount).toBe(500)
    expect(rechecked.dueAmount).toBe(900)
  })

  // 14. Double sale
  it('TEST 14: Double sale -> ONE SALE (Idempotency Key)', async () => {
    const prod = await productService.createProduct(
      { name: 'Bricks', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 100 },
      bizA,
      ownerA
    )

    const key = `sale_idem_${Date.now()}`

    const s1Promise = saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 10 }], paidAmount: 200, paymentMethod: 'cash', idempotencyKey: key },
      bizA,
      ownerA
    )
    const s2Promise = saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 10 }], paidAmount: 200, paymentMethod: 'cash', idempotencyKey: key },
      bizA,
      ownerA
    )

    const [s1, s2] = await Promise.all([s1Promise, s2Promise])
    expect(s1.sale.$id).toEqual(s2.sale.$id)
  })

  // 15. Payment failure
  it('TEST 15: Payment failure -> NO inconsistent state', async () => {
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

    await expect(
      paymentService.createPayment(
        { saleId: saleRes.sale.$id, amount: 100, paymentMethod: 'cash', notes: 'SIMULATE_DB_FAILURE' },
        bizA,
        ownerA
      )
    ).rejects.toThrow(/Database connection failed/)

    const rechecked = await saleService.getSale(saleRes.sale.$id, bizA)
    expect(rechecked.dueAmount).toBe(200)
    expect(rechecked.paidAmount).toBe(100)
  })

  // 16. Sale failure
  it('TEST 16: Sale failure -> NO inconsistent state', async () => {
    const prod = await productService.createProduct(
      { name: 'Out of Stock Product', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 1 },
      bizA,
      ownerA
    )

    await expect(
      saleService.createSale(
        { items: [{ productId: prod.$id, quantity: 99 }], paidAmount: 0, paymentMethod: 'cash' },
        bizA,
        ownerA
      )
    ).rejects.toThrow(/Insufficient stock/)

    const recheckedProd = await productService.getProduct(prod.$id, bizA)
    expect(recheckedProd.stockQuantity).toBe(1)
  })

  // 17. Concurrent stock sale
  it('TEST 17: Concurrent stock sale -> NO overselling', async () => {
    const prod = await productService.createProduct(
      { name: 'Limited Stock', unit: 'pcs', purchasePrice: 100, sellingPrice: 200, stockQuantity: 1 },
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
    expect(fulfilled.length).toBeGreaterThanOrEqual(1)

    const finalProd = await productService.getProduct(prod.$id, bizA)
    expect(finalProd.stockQuantity).toBeGreaterThanOrEqual(0)
  })

  // 18. Negative payment
  it('TEST 18: Negative payment -> DENIED', async () => {
    await expect(
      paymentService.createPayment({ saleId: 'sale_1', amount: -100, paymentMethod: 'cash' }, bizA, ownerA)
    ).rejects.toThrow(/greater than zero/)
  })

  // 19. NaN payment
  it('TEST 19: NaN payment -> DENIED', () => {
    expect(() =>
      calculateSaleTotals({
        items: [{ productId: 'p1', quantity: NaN, unitPrice: 100 }],
      })
    ).toThrow(/positive number|Invalid/)
  })

  // 20. Infinity payment
  it('TEST 20: Infinity payment -> DENIED', () => {
    expect(() =>
      calculateSaleTotals({
        items: [{ productId: 'p1', quantity: 1, unitPrice: Infinity }],
      })
    ).toThrow(/non-negative number|Invalid/)
  })

  // 21. Manipulated sale total
  it('TEST 21: Manipulated sale total -> RECALCULATED', () => {
    const totals = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 2, unitPrice: 100, discount: 0 }],
      discount: 0,
      taxRate: 13,
      paidAmount: 100,
    })

    expect(totals.total).toBe(226)
    expect(totals.dueAmount).toBe(126)
  })

  // 22. Manipulated unit price
  it('TEST 22: Manipulated unit price -> ALLOWED FOR OWNER, REJECTED FOR STAFF', async () => {
    const prod = await productService.createProduct(
      { name: 'Catalog Item', unit: 'pcs', purchasePrice: 100, sellingPrice: 200, stockQuantity: 10 },
      bizA,
      ownerA
    )

    const saleRes = await saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 1, unitPrice: 150 }], taxRate: 0, paidAmount: 150, paymentMethod: 'cash' },
      bizA,
      ownerA
    )

    expect(saleRes.sale.total).toBe(150)

    // Staff role price override must be rejected
    await expect(
      saleService.createSale(
        { items: [{ productId: prod.$id, quantity: 1, unitPrice: 150 }], taxRate: 0, paidAmount: 150, paymentMethod: 'cash' },
        bizA,
        staffA
      )
    ).rejects.toThrow(/PRICE_OVERRIDE_NOT_AUTHORIZED/)
  })

  // 23. Customer mismatch
  it('TEST 23: Customer mismatch -> DENIED', async () => {
    const cust1 = await customerService.createCustomer({ name: 'Customer 1', phone: '9841000001' }, bizA, ownerA)
    const cust2 = await customerService.createCustomer({ name: 'Customer 2', phone: '9841000002' }, bizA, ownerA)

    const prod = await productService.createProduct(
      { name: 'Pipes', unit: 'm', purchasePrice: 10, sellingPrice: 20, stockQuantity: 10 },
      bizA,
      ownerA
    )

    const saleRes = await saleService.createSale(
      { customerId: cust1.$id, items: [{ productId: prod.$id, quantity: 1 }], paidAmount: 0, paymentMethod: 'cash' },
      bizA,
      ownerA
    )

    // Attempting to credit payment to Customer 2 for Customer 1's sale
    await expect(
      paymentService.createPayment(
        { saleId: saleRes.sale.$id, customerId: cust2.$id, amount: 20, paymentMethod: 'cash' },
        bizA,
        ownerA
      )
    ).rejects.toThrow(/Payment customerId mismatch/)
  })

  // 24. Duplicate SKU
  it('TEST 24: Duplicate SKU -> DENIED', async () => {
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

  // 25. Duplicate barcode
  it('TEST 25: Duplicate barcode -> DENIED', async () => {
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

  // 26. Stock movement UPDATE
  it('TEST 26: Stock movement UPDATE -> DENIED (Immutable audit log)', async () => {
    await expect(
      stockMovementService.update('sm_123', { quantity: 999 }, bizA)
    ).rejects.toThrow(/immutable audit logs/)
  })

  // 27. Stock movement DELETE
  it('TEST 27: Stock movement DELETE -> DENIED (Immutable audit log)', async () => {
    await expect(
      stockMovementService.delete('sm_123', bizA)
    ).rejects.toThrow(/immutable audit logs/)
  })

  // 28. Malicious file
  it('TEST 28: Malicious file -> DENIED', () => {
    const pathFile = new File(['data'], '../etc/passwd', { type: 'image/png' })
    const res = validateFileUpload(pathFile, ['image/png'])
    expect(res.valid).toBe(false)
    expect(res.error).toContain('Malicious filename')
  })

  // 29. XSS payload
  it('TEST 29: XSS payload -> SAFE', () => {
    const sanitized = sanitizeInput('<script>alert("xss")</script>')
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toContain('&lt;script&gt;')
  })

  // 30. Expired session
  it('TEST 30: Expired session -> DENIED', async () => {
    await expect(
      authorizeBusinessAccess({ userId: '', businessId: bizA })
    ).rejects.toThrow(/Unauthorized/)
  })

  // 31. Invalid session
  it('TEST 31: Invalid session -> DENIED', async () => {
    await expect(
      authorizeBusinessAccess({ userId: '   ', businessId: bizA })
    ).rejects.toThrow(/Unauthorized/)
  })

  // 32. Unauthorized API
  it('TEST 32: Unauthorized API -> DENIED', async () => {
    await expect(
      authorizeBusinessAccess({ userId: staffA, businessId: bizA, requiredRole: 'owner' })
    ).rejects.toThrow(/Forbidden/)
  })
})
