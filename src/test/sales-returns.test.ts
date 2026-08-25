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
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_owner_returns' })),
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
import { productService } from '@/services/product.service'
import { customerService } from '@/services/customer.service'
import { salesReturnService } from '@/services/sales-return.service'

describe('Feature 3 — Sales Return Workflow Tests', () => {
  const businessId = 'business_returns_test'
  const userId = 'user_owner_returns'

  let prodId: string
  let customerId: string

  beforeEach(async () => {
    mockStore.clear()
    // Create product with 20 items stock
    const prod = await productService.createProduct(
      {
        name: 'Returnable Widget',
        sku: `WIDGET-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        unit: 'pcs',
        purchasePrice: 200,
        sellingPrice: 500,
        stockQuantity: 20,
        isActive: true,
      },
      businessId,
      userId
    )
    prodId = prod.$id

    // Create customer
    const cust = await customerService.createCustomer(
      {
        name: 'Ram Shrestha',
        phone: `9800${Math.floor(100000 + Math.random() * 900000)}`,
      },
      businessId,
      userId
    )
    customerId = cust.$id
  })

  it('1. Should process a valid sales return, restore stock, and leave original sale unchanged', async () => {
    // 1. Sell 10 units on credit: Total Rs. 5000, Paid Rs. 2000, Due Rs. 3000
    const saleResult = await saleService.createSale(
      {
        customerId,
        items: [{ productId: prodId, quantity: 10, unitPrice: 500 }],
        paidAmount: 2000,
        paymentMethod: 'credit',
        vatEnabled: false,
      },
      businessId,
      userId
    )

    const sale = saleResult.sale
    const saleItem = saleResult.items[0]

    // Verify stock after sale: 20 - 10 = 10
    let product = await productService.getProduct(prodId, businessId)
    expect(product.stockQuantity).toBe(10)

    // Verify customer due before return: Rs. 3000
    let customer = await customerService.getCustomer(customerId, businessId)
    expect(customer.totalDue).toBe(3000)

    // 2. Return 2 units (Rs. 1000 value)
    const returnResult = await salesReturnService.createSalesReturn(
      {
        saleId: sale.$id,
        items: [
          {
            saleItemId: saleItem.$id,
            productId: prodId,
            quantity: 2,
          },
        ],
        reason: 'Customer returned damaged box',
        refundMethod: 'credit_adjustment',
      },
      businessId,
      userId
    )

    expect(returnResult.salesReturn.returnNumber).toContain('SR-')
    expect(returnResult.salesReturn.totalAmount).toBe(1000)

    // 3. Verify stock restored from 10 to 12
    product = await productService.getProduct(prodId, businessId)
    expect(product.stockQuantity).toBe(12)

    // 4. Verify customer due balance reduced by Rs. 1000 (from 3000 to 2000)
    customer = await customerService.getCustomer(customerId, businessId)
    expect(customer.totalDue).toBe(2000)

    // 5. Original sale document MUST remain unchanged and completed/pending
    const originalSale = await saleService.getSale(sale.$id, businessId)
    expect(originalSale.$id).toBe(sale.$id)
    expect(originalSale.total).toBe(5000)
  })

  it('2. Should reject return quantity that exceeds remaining returnable quantity', async () => {
    // Sell 5 units
    const saleResult = await saleService.createSale(
      {
        items: [{ productId: prodId, quantity: 5, unitPrice: 500 }],
        paidAmount: 2500,
        paymentMethod: 'cash',
      },
      businessId,
      userId
    )

    const saleItem = saleResult.items[0]

    // Attempting to return 6 units when only 5 were purchased must throw
    await expect(
      salesReturnService.createSalesReturn(
        {
          saleId: saleResult.sale.$id,
          items: [{ saleItemId: saleItem.$id, productId: prodId, quantity: 6 }],
          reason: 'Excess return test',
        },
        businessId,
        userId
      )
    ).rejects.toThrow(/exceeds remaining returnable quantity/)
  })

  it('3. Should reject duplicate return exceeding allowable total across multiple partial returns', async () => {
    // Sell 4 units
    const saleResult = await saleService.createSale(
      {
        items: [{ productId: prodId, quantity: 4, unitPrice: 500 }],
        paidAmount: 2000,
        paymentMethod: 'cash',
      },
      businessId,
      userId
    )
    const saleItem = saleResult.items[0]

    // First return: 3 units (success)
    await salesReturnService.createSalesReturn(
      {
        saleId: saleResult.sale.$id,
        items: [{ saleItemId: saleItem.$id, productId: prodId, quantity: 3 }],
        reason: 'First partial return',
      },
      businessId,
      userId
    )

    // Second return: 2 units (should fail because only 1 unit remains)
    await expect(
      salesReturnService.createSalesReturn(
        {
          saleId: saleResult.sale.$id,
          items: [{ saleItemId: saleItem.$id, productId: prodId, quantity: 2 }],
          reason: 'Second excessive partial return',
        },
        businessId,
        userId
      )
    ).rejects.toThrow(/exceeds remaining returnable quantity/)
  })
})
