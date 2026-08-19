import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite Account & Databases for unit testing Credit / Udha module
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
import { customerService } from '@/services/customer.service'
import { saleService } from '@/services/sale.service'
import { paymentService } from '@/services/payment.service'

describe('Credit / Udha Management Module Tests', () => {
  const bizA = 'business_A'
  const bizB = 'business_B'
  const user1 = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('records customer payments and updates due balance across sale and customer', async () => {
    const prod = await productService.createProduct(
      { name: 'Cement Bag', sku: 'CEM-01', unit: 'bag', purchasePrice: 500, sellingPrice: 700, stockQuantity: 100 },
      bizA,
      user1
    )

    const cust = await customerService.createCustomer(
      { name: 'Hari Bahadur', phone: '9800000001' },
      bizA,
      user1
    )

    // Create a credit sale of 10 bags @ Rs. 700 = Rs. 7000 total (tax 0). Paid Rs. 2000 -> Due Rs. 5000
    const saleRes = await saleService.createSale(
      {
        customerId: cust.$id,
        items: [{ productId: prod.$id, quantity: 10, unitPrice: 700, discount: 0 }],
        taxRate: 0,
        paidAmount: 2000,
        paymentMethod: 'cash',
      } as any,
      bizA,
      user1
    )

    expect(saleRes.sale.dueAmount).toBe(5000)

    const updatedCust1 = await customerService.getCustomer(cust.$id, bizA)
    expect(updatedCust1.totalDue).toBe(5000)

    // Record a payment of Rs. 3000 against this sale
    const payment = await paymentService.createPayment(
      {
        saleId: saleRes.sale.$id,
        customerId: cust.$id,
        amount: 3000,
        paymentMethod: 'eSewa',
        referenceNumber: 'ESEWA-12345',
      },
      bizA,
      user1
    )

    expect(payment.amount).toBe(3000)

    // Verify Sale due balance is now Rs. 2000
    const updatedSale = await saleService.getSale(saleRes.sale.$id, bizA)
    expect(updatedSale.paidAmount).toBe(5000)
    expect(updatedSale.dueAmount).toBe(2000)
    expect(updatedSale.status).toBe('pending')

    // Verify Customer total due is now Rs. 2000
    const updatedCust2 = await customerService.getCustomer(cust.$id, bizA)
    expect(updatedCust2.totalDue).toBe(2000)

    // Record final payment of Rs. 2000
    await paymentService.createPayment(
      {
        saleId: saleRes.sale.$id,
        customerId: cust.$id,
        amount: 2000,
        paymentMethod: 'cash',
      },
      bizA,
      user1
    )

    const completedSale = await saleService.getSale(saleRes.sale.$id, bizA)
    expect(completedSale.dueAmount).toBe(0)
    expect(completedSale.status).toBe('completed')

    const settledCust = await customerService.getCustomer(cust.$id, bizA)
    expect(settledCust.totalDue).toBe(0)
  })

  it('rejects payments greater than remaining due balance', async () => {
    const prod = await productService.createProduct(
      { name: 'Paint Can', sku: 'PNT-01', unit: 'can', purchasePrice: 1000, sellingPrice: 1500, stockQuantity: 20 },
      bizA,
      user1
    )

    const saleRes = await saleService.createSale(
      {
        items: [{ productId: prod.$id, quantity: 2, unitPrice: 1500, discount: 0 }],
        taxRate: 0,
        paidAmount: 1000,
        paymentMethod: 'cash',
      } as any,
      bizA,
      user1
    )

    // Due amount is 2000. Trying to pay 3000 MUST fail
    await expect(
      paymentService.createPayment(
        {
          saleId: saleRes.sale.$id,
          amount: 3000,
          paymentMethod: 'cash',
        },
        bizA,
        user1
      )
    ).rejects.toThrow(/cannot exceed remaining due balance/)
  })

  it('enforces tenant isolation for credit and payments', async () => {
    const prodA = await productService.createProduct(
      { name: 'Item A', sku: 'SKU-A', unit: 'pcs', purchasePrice: 100, sellingPrice: 200, stockQuantity: 10 },
      bizA,
      user1
    )
    const prodB = await productService.createProduct(
      { name: 'Item B', sku: 'SKU-B', unit: 'pcs', purchasePrice: 100, sellingPrice: 200, stockQuantity: 10 },
      bizB,
      user1
    )

    const saleA = await saleService.createSale(
      { items: [{ productId: prodA.$id, quantity: 1, unitPrice: 200, discount: 0 }], taxRate: 0, paidAmount: 50, paymentMethod: 'cash' } as any,
      bizA,
      user1
    )
    const saleB = await saleService.createSale(
      { items: [{ productId: prodB.$id, quantity: 1, unitPrice: 200, discount: 0 }], taxRate: 0, paidAmount: 50, paymentMethod: 'cash' } as any,
      bizB,
      user1
    )

    await paymentService.createPayment({ saleId: saleA.sale.$id, amount: 25, paymentMethod: 'cash' }, bizA, user1)
    await paymentService.createPayment({ saleId: saleB.sale.$id, amount: 25, paymentMethod: 'cash' }, bizB, user1)

    const ledgerA = await paymentService.getCreditLedger(bizA)
    const ledgerB = await paymentService.getCreditLedger(bizB)

    expect(ledgerA.some((item) => item.saleId === saleA.sale.$id)).toBe(true)
    expect(ledgerB.some((item) => item.saleId === saleB.sale.$id)).toBe(true)
  })
})
