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
      get: vi.fn(async () => ({ $id: 'user_owner_cogs' })),
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
import { expenseService } from '@/services/expense.service'
import { analyticsService } from '@/services/analytics.service'
import { salesReturnService } from '@/services/sales-return.service'

describe('Feature 5 — Proper COGS + Profit Calculation Tests', () => {
  const businessId = 'business_cogs_test'
  const userId = 'user_owner_cogs'

  let prodAId: string
  let prodBId: string

  beforeEach(async () => {
    mockStore.clear()
    // Setup owner membership in mockStore
    mockStore.set('business_members:mem_owner', {
      $id: 'mem_owner',
      $collectionId: 'business_members',
      businessId,
      userId,
      role: 'owner',
    })

    // Product A: Selling Rs. 600, Cost Rs. 400
    const prodA = await productService.createProduct(
      {
        name: 'Product A (Electronics)',
        sku: `PRODA-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        unit: 'pcs',
        purchasePrice: 400,
        sellingPrice: 600,
        stockQuantity: 50,
        isActive: true,
      },
      businessId,
      userId
    )
    prodAId = prodA.$id

    // Product B: Selling Rs. 1000, Cost Rs. 700
    const prodB = await productService.createProduct(
      {
        name: 'Product B (Gadget)',
        sku: `PRODB-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        unit: 'pcs',
        purchasePrice: 700,
        sellingPrice: 1000,
        stockQuantity: 50,
        isActive: true,
      },
      businessId,
      userId
    )
    prodBId = prodB.$id
  })

  it('1. Should calculate basic COGS, Gross Profit, and Net Profit correctly', async () => {
    // Sell 10 units of Product A (600 x 10 = Rs. 6000 revenue; COGS: 400 x 10 = Rs. 4000)
    await saleService.createSale(
      {
        items: [{ productId: prodAId, quantity: 10, unitPrice: 600 }],
        paidAmount: 6000,
        paymentMethod: 'cash',
        vatEnabled: false,
      },
      businessId,
      userId
    )

    // Record expense of Rs. 500
    await expenseService.createExpense(
      {
        title: 'Shop Rent',
        category: 'rent',
        amount: 500,
        date: new Date().toISOString().slice(0, 10),
      },
      businessId,
      userId
    )

    const report = await analyticsService.getProfitEstimateReport(businessId)

    // Expected: Revenue 6000, COGS 4000, Gross Profit 2000, Expenses 500, Net Profit 1500
    expect(report.grossSales).toBe(6000)
    expect(report.netSales).toBe(6000)
    expect(report.cogs).toBe(4000)
    expect(report.grossProfit).toBe(2000)
    expect(report.totalExpenses).toBe(500)
    expect(report.netProfit).toBe(1500)
  })

  it('2. Should adjust COGS and Net Sales when sales returns occur', async () => {
    // Sell 10 units of Product A (6000 revenue, 4000 COGS)
    const saleResult = await saleService.createSale(
      {
        items: [{ productId: prodAId, quantity: 10, unitPrice: 600 }],
        paidAmount: 6000,
        paymentMethod: 'cash',
        vatEnabled: false,
      },
      businessId,
      userId
    )
    const saleItem = saleResult.items[0]

    // Return 2 units (Returned revenue: 2 x 600 = 1200; Returned COGS: 2 x 400 = 800)
    await salesReturnService.createSalesReturn(
      {
        saleId: saleResult.sale.$id,
        items: [{ saleItemId: saleItem.$id, productId: prodAId, quantity: 2 }],
        reason: 'Customer returned 2 units',
        refundMethod: 'cash',
      },
      businessId,
      userId
    )

    const report = await analyticsService.getProfitEstimateReport(businessId)

    // Expected:
    // Gross Sales = 6000, Sales Returns = 1200, Net Sales = 4800
    // Gross COGS = 4000, Returned COGS = 800, Net COGS = 3200 (8 units x 400)
    // Gross Profit = 4800 - 3200 = 1600
    expect(report.grossSales).toBe(6000)
    expect(report.salesReturns).toBe(1200)
    expect(report.netSales).toBe(4800)
    expect(report.cogs).toBe(3200)
    expect(report.grossProfit).toBe(1600)
  })

  it('3. Should exclude cancelled sales completely from COGS and Profit metrics', async () => {
    // Sale 1: 5 units of Product B (5 x 1000 = 5000 revenue; 5 x 700 = 3500 COGS)
    await saleService.createSale(
      {
        items: [{ productId: prodBId, quantity: 5, unitPrice: 1000 }],
        paidAmount: 5000,
        paymentMethod: 'cash',
        vatEnabled: false,
      },
      businessId,
      userId
    )

    // Sale 2: 5 units of Product B (5000 revenue; 3500 COGS) - WILL BE CANCELLED
    const sale2 = await saleService.createSale(
      {
        items: [{ productId: prodBId, quantity: 5, unitPrice: 1000 }],
        paidAmount: 5000,
        paymentMethod: 'cash',
        vatEnabled: false,
      },
      businessId,
      userId
    )

    // Cancel Sale 2
    await saleService.cancelSale(sale2.sale.$id, businessId, userId, 'Accidental duplicate sale')

    const report = await analyticsService.getProfitEstimateReport(businessId)

    // Sale 2 must be excluded: Revenue 5000, COGS 3500, Gross Profit 1500
    expect(report.netSales).toBe(5000)
    expect(report.cogs).toBe(3500)
    expect(report.grossProfit).toBe(1500)
  })
})
