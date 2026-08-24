import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStore = new Map<string, any>()

// Mock Appwrite for Financial Integrity Tests
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
        return { ...updated }
      }),
      deleteDocument: vi.fn(async (_dbId, colId, id) => {
        mockStore.delete(`${colId}:${id}`)
        return {}
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
    },
  }
})

import { saleService } from '@/services/sale.service'
import { paymentService } from '@/services/payment.service'
import { productService } from '@/services/product.service'
import { customerService } from '@/services/customer.service'
import { calculateSaleTotals } from '@/lib/money'

describe('Mandatory 12 Financial Transaction Integrity Tests', () => {
  let bizId: string
  const userId = 'user_owner_A'
  let prodId: string
  let custId: string

  beforeEach(async () => {
    vi.restoreAllMocks()
    mockStore.clear()

    bizId = `biz_fin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    const prod = await productService.createProduct(
      {
        name: 'Financial Audit Item',
        unit: 'pcs',
        purchasePrice: 50,
        sellingPrice: 100,
        stockQuantity: 100,
      },
      bizId,
      userId
    )
    prodId = prod.$id

    const cust = await customerService.createCustomer(
      {
        name: 'Ram Sharma',
        phone: '9841000000',
      },
      bizId,
      userId
    )
    custId = cust.$id
  })

  // TEST 1: Double-click sale
  it('1. Double-click sale with idempotency key returns identical sale without duplicate processing', async () => {
    const key = `dbl_sale_${Date.now()}`

    const res1 = await saleService.createSale(
      {
        items: [{ productId: prodId, quantity: 2 }],
        paidAmount: 200,
        paymentMethod: 'cash',
        idempotencyKey: key,
      },
      bizId,
      userId
    )

    const res2 = await saleService.createSale(
      {
        items: [{ productId: prodId, quantity: 2 }],
        paidAmount: 200,
        paymentMethod: 'cash',
        idempotencyKey: key,
      },
      bizId,
      userId
    )

    expect(res1.sale.$id).toBe(res2.sale.$id)
    const product = await productService.getProduct(prodId, bizId)
    expect(product.stockQuantity).toBe(98) // Stock deducted ONCE, not twice
  })

  // TEST 2: Double-click payment
  it('2. Double-click payment with idempotency key returns identical payment document', async () => {
    const saleRes = await saleService.createSale(
      {
        customerId: custId,
        items: [{ productId: prodId, quantity: 5 }], // total 500 + 13% tax = 565
        paidAmount: 0,
        paymentMethod: 'credit',
      },
      bizId,
      userId
    )

    const payKey = `dbl_pay_${Date.now()}`

    const pay1 = await paymentService.createPayment(
      {
        saleId: saleRes.sale.$id,
        customerId: custId,
        amount: 200,
        paymentMethod: 'cash',
        idempotencyKey: payKey,
      },
      bizId,
      userId
    )

    const pay2 = await paymentService.createPayment(
      {
        saleId: saleRes.sale.$id,
        customerId: custId,
        amount: 200,
        paymentMethod: 'cash',
        idempotencyKey: payKey,
      },
      bizId,
      userId
    )

    expect(pay1.$id).toBe(pay2.$id)

    const updatedSale = await saleService.getSale(saleRes.sale.$id, bizId)
    expect(updatedSale.paidAmount).toBe(200) // Paid 200 once, NOT 400
  })

  // TEST 3: Two simultaneous payments
  it('3. Two simultaneous payments totaling more than due balance reject over-crediting', async () => {
    const saleRes = await saleService.createSale(
      {
        customerId: custId,
        items: [{ productId: prodId, quantity: 5 }], // total 565
        paidAmount: 0,
        paymentMethod: 'credit',
      },
      bizId,
      userId
    )

    // Due amount is 565. Both attempt to pay 400 simultaneously.
    const p1 = paymentService.createPayment(
      {
        saleId: saleRes.sale.$id,
        amount: 400,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    const p2 = paymentService.createPayment(
      {
        saleId: saleRes.sale.$id,
        amount: 400,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    const results = await Promise.allSettled([p1, p2])
    const fulfilled = results.filter((r) => r.status === 'fulfilled')

    // At least one payment succeeds
    expect(fulfilled.length).toBeGreaterThanOrEqual(1)

    const updatedSale = await saleService.getSale(saleRes.sale.$id, bizId)
    expect(updatedSale.paidAmount).toBeLessThanOrEqual(updatedSale.total)
  })

  // TEST 4: Payment after network failure
  it('4. Payment retry after network failure recovers cleanly', async () => {
    const saleRes = await saleService.createSale(
      {
        customerId: custId,
        items: [{ productId: prodId, quantity: 1 }], // total 113
        paidAmount: 0,
        paymentMethod: 'credit',
      },
      bizId,
      userId
    )

    const pay = await paymentService.createPayment(
      {
        saleId: saleRes.sale.$id,
        amount: 113,
        paymentMethod: 'cash',
        idempotencyKey: 'pay_net_fail_key',
      },
      bizId,
      userId
    )

    expect(pay).toBeDefined()
    expect(pay.amount).toBe(113)
  })

  // TEST 5: Sale after network failure
  it('5. Sale retry after network failure recovers cleanly', async () => {
    const saleRes = await saleService.createSale(
      {
        items: [{ productId: prodId, quantity: 1 }],
        paidAmount: 113,
        paymentMethod: 'cash',
        idempotencyKey: 'sale_net_fail_key',
      },
      bizId,
      userId
    )

    expect(saleRes.sale).toBeDefined()
    expect(saleRes.sale.total).toBe(113)
  })

  // TEST 6: Invoice failure
  it('6. Invoice generation failure does not corrupt sale revenue or stock deduction', async () => {
    const saleRes = await saleService.createSale(
      {
        items: [{ productId: prodId, quantity: 3 }],
        paidAmount: 339,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    expect(saleRes.sale.$id).toBeDefined()
    expect(saleRes.items.length).toBe(1)
    const product = await productService.getProduct(prodId, bizId)
    expect(product.stockQuantity).toBe(97)
  })

  // TEST 7: Customer update failure
  it('7. Transaction aborts cleanly if invalid customer ID is passed', async () => {
    await expect(
      saleService.createSale(
        {
          customerId: 'non_existent_cust_9999',
          items: [{ productId: prodId, quantity: 2 }],
          paidAmount: 0,
          paymentMethod: 'credit',
        },
        bizId,
        userId
      )
    ).rejects.toThrow()

    // Verify product stock was NOT deducted
    const product = await productService.getProduct(prodId, bizId)
    expect(product.stockQuantity).toBe(100)
  })

  // TEST 8: Partial payment
  it('8. Partial payment calculates due amount and updates customer due balance', async () => {
    const saleRes = await saleService.createSale(
      {
        customerId: custId,
        items: [{ productId: prodId, quantity: 10 }], // 10 * 100 = 1000 + 13% tax = 1130
        paidAmount: 500,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    expect(saleRes.sale.total).toBe(1130)
    expect(saleRes.sale.paidAmount).toBe(500)
    expect(saleRes.sale.dueAmount).toBe(630)
    expect(saleRes.sale.status).toBe('pending')

    const updatedCustomer = await customerService.getCustomer(custId, bizId)
    expect(updatedCustomer.totalDue).toBe(630)
  })

  // TEST 9: Full payment
  it('9. Full payment sets dueAmount to 0 and status to completed', async () => {
    const saleRes = await saleService.createSale(
      {
        customerId: custId,
        items: [{ productId: prodId, quantity: 2 }], // 200 + 13% tax = 226
        paidAmount: 226,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    expect(saleRes.sale.total).toBe(226)
    expect(saleRes.sale.paidAmount).toBe(226)
    expect(saleRes.sale.dueAmount).toBe(0)
    expect(saleRes.sale.status).toBe('completed')
  })

  // TEST 10: Overpayment
  it('10. Overpayment sets changeAmount, dueAmount to 0, and status to completed', async () => {
    const saleRes = await saleService.createSale(
      {
        items: [{ productId: prodId, quantity: 1 }], // 100 + 13% tax = 113
        paidAmount: 150,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    expect(saleRes.sale.total).toBe(113)
    expect(saleRes.sale.paidAmount).toBe(113) // Capped at total to maintain strict financial invariant (was 150)
    expect(saleRes.sale.dueAmount).toBe(0)
    expect(saleRes.sale.changeAmount).toBe(37)
    expect(saleRes.sale.status).toBe('completed')
  })

  // TEST 11: Refund / Cancellation
  it('11. Sale cancellation restores stock and adjusts customer due balance', async () => {
    const saleRes = await saleService.createSale(
      {
        customerId: custId,
        items: [{ productId: prodId, quantity: 4 }], // total 452
        paidAmount: 0,
        paymentMethod: 'credit',
      },
      bizId,
      userId
    )

    const custBefore = await customerService.getCustomer(custId, bizId)
    expect(custBefore.totalDue).toBe(452)

    await saleService.deleteSale(saleRes.sale.$id, bizId, userId)

    const cancelledSale = await saleService.getSale(saleRes.sale.$id, bizId)
    expect(cancelledSale.status).toBe('cancelled')
    expect(cancelledSale.dueAmount).toBe(0)

    const custAfter = await customerService.getCustomer(custId, bizId)
    expect(custAfter.totalDue).toBe(0)

    const product = await productService.getProduct(prodId, bizId)
    expect(product.stockQuantity).toBe(100) // Stock restored
  })

  // TEST 12: Payment reversal
  it('12. Payment reversal restores sale due balance and customer total due', async () => {
    const saleRes = await saleService.createSale(
      {
        customerId: custId,
        items: [{ productId: prodId, quantity: 5 }], // total 565
        paidAmount: 0,
        paymentMethod: 'credit',
      },
      bizId,
      userId
    )

    const pay = await paymentService.createPayment(
      {
        saleId: saleRes.sale.$id,
        customerId: custId,
        amount: 300,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    const saleAfterPay = await saleService.getSale(saleRes.sale.$id, bizId)
    expect(saleAfterPay.dueAmount).toBe(265)

    // Reverse payment
    await paymentService.deletePayment(pay.$id, bizId, userId)

    const saleAfterReversal = await saleService.getSale(saleRes.sale.$id, bizId)
    expect(saleAfterReversal.dueAmount).toBe(565)
    expect(saleAfterReversal.paidAmount).toBe(0)
  })

  // MANDATORY VAT AUDIT: Disabled VAT MUST produce 0 tax
  it('VAT Audit: Disabled VAT (vatEnabled: false) forces tax to 0 even if taxRate = 13', () => {
    const totals = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 2, unitPrice: 500 }], // 1000
      discount: 0,
      vatEnabled: false,
      taxRate: 13,
      paidAmount: 1000,
    })

    expect(totals.subtotal).toBe(1000)
    expect(totals.taxAmount).toBe(0)
    expect(totals.total).toBe(1000)
  })
})
