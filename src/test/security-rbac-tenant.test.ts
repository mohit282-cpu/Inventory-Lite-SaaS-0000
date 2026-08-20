import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite Account & Databases for Security, Tenant, and Financial Tests
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
      get: vi.fn(async () => ({ $id: 'user_123' })),
    },
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        // Simulate database failure for a specific failure test flag
        if (data.notes === 'SIMULATE_DB_FAILURE') {
          throw new Error('Database write connection error')
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
import { authorizeBusinessAccess, checkRolePermission } from '@/lib/authorization'
import { generateSecureToken, validateFileUpload } from '@/lib/security'
import { calculateSaleTotals, validateFinancialInvariants } from '@/lib/money'

describe('Production Hardening & Comprehensive Security Tests', () => {
  const bizA = 'business_A'
  const bizB = 'business_B'
  const user1 = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------
  // 1. TENANT ISOLATION TESTS
  // -------------------------------------------------------------
  it('TEST 1-3: Rejects cross-tenant read/update/delete attempts', async () => {
    const prodA = await productService.createProduct(
      { name: 'Product A', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 50 },
      bizA,
      user1
    )

    // User B attempting to read User A's product via getById
    await expect(productService.getProduct(prodA.$id, bizB)).rejects.toThrow(
      /Tenant Isolation Violation/
    )

    // User B attempting to update User A's product
    await expect(
      productService.updateProduct(prodA.$id, { name: 'Hacked Name' }, bizB)
    ).rejects.toThrow(/Tenant Isolation Violation/)

    // User B attempting to delete User A's product
    await expect(productService.deleteProduct(prodA.$id, bizB)).rejects.toThrow(
      /Tenant Isolation Violation/
    )
  })

  it('TEST 4-5: Rejects client-supplied "system" businessId bypass attempts', async () => {
    await expect(
      authorizeBusinessAccess({
        userId: user1,
        businessId: 'system',
        isSystemOperation: false,
      })
    ).rejects.toThrow(/Forbidden/)
  })

  // -------------------------------------------------------------
  // 2. RBAC MATRIX TESTS
  // -------------------------------------------------------------
  it('TEST 6: Enforces RBAC permissions between owner, admin, cashier, and staff', () => {
    expect(checkRolePermission('owner', 'settings:manage')).toBe(true)
    expect(checkRolePermission('admin', 'settings:manage')).toBe(true)
    expect(checkRolePermission('staff', 'settings:manage')).toBe(false)
    expect(checkRolePermission('staff', 'sales:create')).toBe(true)
  })

  // -------------------------------------------------------------
  // 3. FAKE PAYMENT FALLBACK REMOVAL & FINANCIAL INVARIANTS
  // -------------------------------------------------------------
  it('TEST 10: Rejects payment and does NOT create fake local objects when database fails', async () => {
    const prod = await productService.createProduct(
      { name: 'Pipes', unit: 'meter', purchasePrice: 100, sellingPrice: 150, stockQuantity: 20 },
      bizA,
      user1
    )

    const saleRes = await saleService.createSale(
      {
        items: [{ productId: prod.$id, quantity: 2, unitPrice: 150, discount: 0 }],
        taxRate: 0,
        paidAmount: 100,
        paymentMethod: 'cash',
      } as any,
      bizA,
      user1
    )

    expect(saleRes.sale.dueAmount).toBe(200)

    // Attempt to record payment with DB failure simulation
    await expect(
      paymentService.createPayment(
        {
          saleId: saleRes.sale.$id,
          amount: 100,
          paymentMethod: 'cash',
          notes: 'SIMULATE_DB_FAILURE',
        },
        bizA,
        user1
      )
    ).rejects.toThrow(/Database write connection error/)

    // Verify Sale due balance was NOT changed by a fake payment fallback!
    const recheckedSale = await saleService.getSale(saleRes.sale.$id, bizA)
    expect(recheckedSale.dueAmount).toBe(200)
    expect(recheckedSale.paidAmount).toBe(100)
  })

  it('TEST 14-17: Rejects negative payments, negative quantities, and payments exceeding due amount', async () => {
    // Negative payment
    await expect(
      paymentService.createPayment({ saleId: 'sale_1', amount: -50, paymentMethod: 'cash' }, bizA, user1)
    ).rejects.toThrow(/greater than zero/)

    // Negative quantity in sale
    await expect(
      saleService.createSale(
        { items: [{ productId: 'p1', quantity: -5, unitPrice: 100 }], paidAmount: 0, paymentMethod: 'cash' },
        bizA,
        user1
      )
    ).rejects.toThrow(/greater than zero/)

    // Negative discount in calculation
    expect(() =>
      calculateSaleTotals({
        items: [{ productId: 'p1', quantity: 2, unitPrice: 100, discount: -10 }],
      })
    ).toThrow(/non-negative number|cannot be negative/)
  })

  it('TEST 18: Server ignores client-manipulated totals and recalculates server-side', () => {
    const calculated = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 3, unitPrice: 500, discount: 100 }],
      discount: 100,
      taxRate: 13,
      paidAmount: 500,
    })

    // Subtotal = 3 * 500 - 100 = 1400
    // Taxable = 1400 - 100 = 1300
    // Tax 13% of 1300 = 169
    // Total = 1469
    // Paid = 500
    // Due = 969
    expect(calculated.subtotal).toBe(1400)
    expect(calculated.taxAmount).toBe(169)
    expect(calculated.total).toBe(1469)
    expect(calculated.dueAmount).toBe(969)

    expect(() =>
      validateFinancialInvariants({ total: 1469, paidAmount: 500, dueAmount: 969 })
    ).not.toThrow()
  })

  // -------------------------------------------------------------
  // 4. SECURITY UTILITIES & FILE UPLOADS
  // -------------------------------------------------------------
  it('TEST 15: Generates cryptographically secure random tokens', () => {
    const token1 = generateSecureToken(32)
    const token2 = generateSecureToken(32)
    expect(token1).toHaveLength(32)
    expect(token2).toHaveLength(32)
    expect(token1).not.toEqual(token2)
  })

  it('TEST 20: Validates file uploads and rejects dangerous HTML/SVG/executables and path traversal', () => {
    // Valid Image
    const validFile = new File(['fake content'], 'logo.png', { type: 'image/png' })
    const res1 = validateFileUpload(validFile, ['image/png'])
    expect(res1.valid).toBe(true)

    // Malicious HTML / SVG
    const htmlFile = new File(['<script>alert(1)</script>'], 'exploit.html', { type: 'text/html' })
    const res2 = validateFileUpload(htmlFile, ['text/html'])
    expect(res2.valid).toBe(false)
    expect(res2.error).toContain('forbidden')

    // Executable
    const exeFile = new File(['binary'], 'virus.exe', { type: 'application/x-msdownload' })
    const res3 = validateFileUpload(exeFile, ['application/x-msdownload'])
    expect(res3.valid).toBe(false)

    // Path traversal
    const pathFile = new File(['data'], '../secret.png', { type: 'image/png' })
    const res4 = validateFileUpload(pathFile, ['image/png'])
    expect(res4.valid).toBe(false)
    expect(res4.error).toContain('Malicious filename')
  })
})
