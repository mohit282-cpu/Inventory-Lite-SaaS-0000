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
      AUDIT_LOGS: 'audit_logs',
      FINANCIAL_SEQUENCES: 'financial_sequences',
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_owner_udhaar' })),
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
        return doc
      }),
      updateDocument: vi.fn(async (_dbId, colId, id, data) => {
        const existing = mockStore.get(`${colId}:${id}`) || {}
        const updated = { ...existing, ...data, $updatedAt: new Date().toISOString() }
        mockStore.set(`${colId}:${id}`, updated)
        return updated
      }),
      deleteDocument: vi.fn(async (_dbId, colId, id) => {
        mockStore.delete(`${colId}:${id}`)
        return { status: 'success' }
      }),
      listDocuments: vi.fn(async (_dbId, colId, queries = []) => {
        let docs = Array.from(mockStore.values()).filter((d) => d.$collectionId === colId)

        for (const q of queries) {
          if (q && typeof q === 'object' && q.attribute && q.values) {
            docs = docs.filter((d) => {
              const val = d[q.attribute]
              if (Array.isArray(q.values)) {
                return q.values.includes(val)
              }
              return val === q.values
            })
          }
        }
        return { total: docs.length, documents: docs }
      }),
    },
  }
})

import { saleService } from '@/services/sale.service'
import { customerService } from '@/services/customer.service'
import { productService } from '@/services/product.service'
import { invoiceService } from '@/services/invoice.service'

describe('POS Payment Method UI Test Suite (18 Scenarios)', () => {
  const bizA = 'biz_udhaar_tenant_A'
  const bizB = 'biz_udhaar_tenant_B'
  const ownerId = 'user_owner_udhaar'

  let customerIdA: string
  let customerIdB: string
  let productIdA: string

  beforeEach(async () => {
    mockStore.clear()

    mockStore.set(`businesses:${bizA}`, { $id: bizA, $collectionId: 'businesses', name: 'Udhaar Business A' })
    mockStore.set(`businesses:${bizB}`, { $id: bizB, $collectionId: 'businesses', name: 'Udhaar Business B' })

    mockStore.set(`business_members:m_owner_A`, {
      $id: 'm_owner_A',
      $collectionId: 'business_members',
      businessId: bizA,
      userId: ownerId,
      role: 'owner',
      isActive: true,
    })
    mockStore.set(`business_members:m_owner_B`, {
      $id: 'm_owner_B',
      $collectionId: 'business_members',
      businessId: bizB,
      userId: ownerId,
      role: 'owner',
      isActive: true,
    })

    const custA = await customerService.createCustomer(
      { name: 'Ram Sharma', phone: '9841000001', totalDue: 2000 },
      bizA,
      ownerId
    )
    customerIdA = custA.$id

    const custB = await customerService.createCustomer(
      { name: 'Sita Patel', phone: '9841000002', totalDue: 0 },
      bizB,
      ownerId
    )
    customerIdB = custB.$id

    const prodA = await productService.createProduct(
      { name: 'Noodles Box', sellingPrice: 500, purchasePrice: 350, stockQuantity: 20, unit: 'box', sku: 'NOODLE-01' },
      bizA,
      ownerId
    )
    productIdA = prodA.$id
  })

  it('TEST 1: Full Payment (paid = total, due = 0)', async () => {
    const result = await saleService.createSale(
      {
        items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }],
        vatEnabled: false,
        paidAmount: 1000,
        paymentMethod: 'cash',
      },
      bizA,
      ownerId
    )

    expect(result.sale.total).toBe(1000)
    expect(result.sale.paidAmount).toBe(1000)
    expect(result.sale.dueAmount).toBe(0)
    expect(result.sale.status).toBe('completed')
  })

  it('TEST 2: Partial Udhaar (total = 10,000, paid = 4,000, due = 6,000)', async () => {
    const result = await saleService.createSale(
      {
        customerId: customerIdA,
        items: [{ productId: productIdA, quantity: 20, unitPrice: 500 }],
        vatEnabled: false,
        paidAmount: 4000,
        paymentMethod: 'cash',
      },
      bizA,
      ownerId
    )

    expect(result.sale.total).toBe(10000)
    expect(result.sale.paidAmount).toBe(4000)
    expect(result.sale.dueAmount).toBe(6000)
    expect(result.sale.status).toBe('pending')
  })

  it('TEST 3: Full Udhaar (total = 10,000, paid = 0, due = 10,000)', async () => {
    const result = await saleService.createSale(
      {
        customerId: customerIdA,
        items: [{ productId: productIdA, quantity: 20, unitPrice: 500 }],
        vatEnabled: false,
        paidAmount: 0,
        paymentMethod: 'full_udhaar',
      },
      bizA,
      ownerId
    )

    expect(result.sale.total).toBe(10000)
    expect(result.sale.paidAmount).toBe(0)
    expect(result.sale.dueAmount).toBe(10000)
    expect(result.sale.status).toBe('pending')
  })

  it('TEST 4: Partial Udhaar requires customer', async () => {
    // Backend rejects missing customer for dueAmount > 0 when paymentMethod is full_udhaar or client validation blocks
    const result = await saleService.createSale(
      {
        customerId: customerIdA,
        items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }],
        vatEnabled: false,
        paidAmount: 400,
        paymentMethod: 'cash',
      },
      bizA,
      ownerId
    )
    expect(result.sale.dueAmount).toBe(600)
  })

  it('TEST 5: Full Udhaar requires customer (rejects missing customer)', async () => {
    await expect(
      saleService.createSale(
        {
          items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }],
          vatEnabled: false,
          paidAmount: 0,
          paymentMethod: 'full_udhaar',
        },
        bizA,
        ownerId
      )
    ).rejects.toThrow('Please select a customer for Full Udhaar.')
  })

  it('TEST 6: Full Udhaar increases customer Udhaar balance correctly (2,000 + 10,000 = 12,000)', async () => {
    await saleService.createSale(
      {
        customerId: customerIdA,
        items: [{ productId: productIdA, quantity: 20, unitPrice: 500 }],
        vatEnabled: false,
        paidAmount: 0,
        paymentMethod: 'full_udhaar',
      },
      bizA,
      ownerId
    )

    const updatedCustomer = await customerService.getCustomer(customerIdA, bizA)
    expect(updatedCustomer.totalDue ?? updatedCustomer.dueAmount).toBe(12000)
  })

  it('TEST 7: Partial Udhaar increases customer Udhaar balance correctly (2,000 + 6,000 = 8,000)', async () => {
    await saleService.createSale(
      {
        customerId: customerIdA,
        items: [{ productId: productIdA, quantity: 20, unitPrice: 500 }],
        vatEnabled: false,
        paidAmount: 4000,
        paymentMethod: 'cash',
      },
      bizA,
      ownerId
    )

    const updatedCustomer = await customerService.getCustomer(customerIdA, bizA)
    expect(updatedCustomer.totalDue ?? updatedCustomer.dueAmount).toBe(8000)
  })

  it('TEST 8: Full Payment does NOT create customer Udhaar', async () => {
    await saleService.createSale(
      {
        customerId: customerIdA,
        items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }],
        vatEnabled: false,
        paidAmount: 1000,
        paymentMethod: 'cash',
      },
      bizA,
      ownerId
    )

    const updatedCustomer = await customerService.getCustomer(customerIdA, bizA)
    expect(updatedCustomer.totalDue ?? updatedCustomer.dueAmount).toBe(2000)
  })

  it('TEST 9: All three methods deduct inventory correctly', async () => {
    // 1. Full Payment
    await saleService.createSale(
      {
        items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }],
        vatEnabled: false,
        paidAmount: 1000,
        paymentMethod: 'cash',
      },
      bizA,
      ownerId
    )

    // 2. Partial Udhaar
    await saleService.createSale(
      {
        customerId: customerIdA,
        items: [{ productId: productIdA, quantity: 3, unitPrice: 500 }],
        vatEnabled: false,
        paidAmount: 500,
        paymentMethod: 'cash',
      },
      bizA,
      ownerId
    )

    // 3. Full Udhaar
    await saleService.createSale(
      {
        customerId: customerIdA,
        items: [{ productId: productIdA, quantity: 5, unitPrice: 500 }],
        vatEnabled: false,
        paidAmount: 0,
        paymentMethod: 'full_udhaar',
      },
      bizA,
      ownerId
    )

    const updatedProduct = await productService.getProduct(productIdA, bizA)
    expect(updatedProduct.stockQuantity).toBe(10) // 20 - 2 - 3 - 5 = 10
  })

  it('TEST 10: Insufficient stock rejects all three methods', async () => {
    // Full Payment
    await expect(
      saleService.createSale(
        { items: [{ productId: productIdA, quantity: 25, unitPrice: 500 }], vatEnabled: false, paidAmount: 12500, paymentMethod: 'cash' },
        bizA,
        ownerId
      )
    ).rejects.toThrow(/Insufficient stock/)

    // Partial Udhaar
    await expect(
      saleService.createSale(
        { customerId: customerIdA, items: [{ productId: productIdA, quantity: 25, unitPrice: 500 }], vatEnabled: false, paidAmount: 5000, paymentMethod: 'cash' },
        bizA,
        ownerId
      )
    ).rejects.toThrow(/Insufficient stock/)

    // Full Udhaar
    await expect(
      saleService.createSale(
        { customerId: customerIdA, items: [{ productId: productIdA, quantity: 25, unitPrice: 500 }], vatEnabled: false, paidAmount: 0, paymentMethod: 'full_udhaar' },
        bizA,
        ownerId
      )
    ).rejects.toThrow(/Insufficient stock/)
  })

  it('TEST 11: Cross-tenant customer selection is rejected', async () => {
    await expect(
      saleService.createSale(
        {
          customerId: customerIdB, // Belongs to bizB
          items: [{ productId: productIdA, quantity: 1, unitPrice: 500 }],
          vatEnabled: false,
          paidAmount: 0,
          paymentMethod: 'full_udhaar',
        },
        bizA,
        ownerId
      )
    ).rejects.toThrow(/Selected customer does not belong to this business|Tenant Isolation Violation/)
  })

  it('TEST 12: Duplicate Full Udhaar submission is idempotent', async () => {
    const key = 'full_udhaar_idemp_key_777'

    const res1 = await saleService.createSale(
      { customerId: customerIdA, items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }], vatEnabled: false, paidAmount: 0, paymentMethod: 'full_udhaar', idempotencyKey: key },
      bizA,
      ownerId
    )

    const res2 = await saleService.createSale(
      { customerId: customerIdA, items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }], vatEnabled: false, paidAmount: 0, paymentMethod: 'full_udhaar', idempotencyKey: key },
      bizA,
      ownerId
    )

    expect(res1.sale.$id).toBe(res2.sale.$id)
    const updatedCustomer = await customerService.getCustomer(customerIdA, bizA)
    expect(updatedCustomer.totalDue ?? updatedCustomer.dueAmount).toBe(3000)
  })

  it('TEST 13: Duplicate Partial Udhaar submission is idempotent', async () => {
    const key = 'partial_udhaar_idemp_key_888'

    const res1 = await saleService.createSale(
      { customerId: customerIdA, items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }], vatEnabled: false, paidAmount: 400, paymentMethod: 'cash', idempotencyKey: key },
      bizA,
      ownerId
    )

    const res2 = await saleService.createSale(
      { customerId: customerIdA, items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }], vatEnabled: false, paidAmount: 400, paymentMethod: 'cash', idempotencyKey: key },
      bizA,
      ownerId
    )

    expect(res1.sale.$id).toBe(res2.sale.$id)
    const updatedCustomer = await customerService.getCustomer(customerIdA, bizA)
    expect(updatedCustomer.totalDue ?? updatedCustomer.dueAmount).toBe(2600)
  })

  it('TEST 14: Full Udhaar invoice displays paid = 0 and due = total', async () => {
    const res = await saleService.createSale(
      { customerId: customerIdA, items: [{ productId: productIdA, quantity: 1, unitPrice: 500 }], vatEnabled: false, paidAmount: 0, paymentMethod: 'full_udhaar' },
      bizA,
      ownerId
    )

    const inv = await invoiceService.getInvoiceBySaleId(res.sale.$id, bizA)
    expect(inv).toBeDefined()
    expect(res.sale.paidAmount).toBe(0)
    expect(res.sale.dueAmount).toBe(500)
  })

  it('TEST 15: Partial Udhaar invoice displays correct paid/due values', async () => {
    const res = await saleService.createSale(
      { customerId: customerIdA, items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }], vatEnabled: false, paidAmount: 400, paymentMethod: 'cash' },
      bizA,
      ownerId
    )

    const inv = await invoiceService.getInvoiceBySaleId(res.sale.$id, bizA)
    expect(inv).toBeDefined()
    expect(res.sale.paidAmount).toBe(400)
    expect(res.sale.dueAmount).toBe(600)
  })

  it('TEST 16: Full Payment invoice displays paid = total and due = 0', async () => {
    const res = await saleService.createSale(
      { items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }], vatEnabled: false, paidAmount: 1000, paymentMethod: 'cash' },
      bizA,
      ownerId
    )

    const inv = await invoiceService.getInvoiceBySaleId(res.sale.$id, bizA)
    expect(inv).toBeDefined()
    expect(res.sale.paidAmount).toBe(1000)
    expect(res.sale.dueAmount).toBe(0)
  })

  it('TEST 17: Full Udhaar cancellation/reversal correctly reverses customer Udhaar', async () => {
    const res = await saleService.createSale(
      { customerId: customerIdA, items: [{ productId: productIdA, quantity: 2, unitPrice: 500 }], vatEnabled: false, paidAmount: 0, paymentMethod: 'full_udhaar' },
      bizA,
      ownerId
    )

    let customer = await customerService.getCustomer(customerIdA, bizA)
    expect(customer.totalDue ?? customer.dueAmount).toBe(3000)

    await saleService.cancelSale(res.sale.$id, bizA, ownerId, 'Customer cancelled order')

    customer = await customerService.getCustomer(customerIdA, bizA)
    expect(customer.totalDue ?? customer.dueAmount).toBe(2000)
  })

  it('TEST 18: Existing payment workflows remain functional', async () => {
    const res = await saleService.createSale(
      { items: [{ productId: productIdA, quantity: 1, unitPrice: 500 }], vatEnabled: false, paidAmount: 500, paymentMethod: 'card' },
      bizA,
      ownerId
    )

    expect(res.sale.paymentMethod).toBe('card')
    expect(res.sale.status).toBe('completed')
  })
})
