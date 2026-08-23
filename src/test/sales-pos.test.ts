import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite Account & Databases for unit testing sales & POS module
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
      EXPENSES: 'expenses',
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_123' })),
    },
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = { $id: id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, $collectionId: colId, $databaseId: _dbId, ...data }
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
        let filtered = Array.from(store.values()).filter(d => d.$collectionId === colId)
        for (const q of queries) {
          const qStr = typeof q === 'string' ? q : JSON.stringify(q)
          if (qStr.includes('equal')) {
            const fieldMatch = qStr.match(/equal\("([^"]+)"/) || qStr.match(/"attribute":"([^"]+)"/) || qStr.match(/attribute: '([^']+)'/)
            const valueMatch = qStr.match(/\["([^"]+)"\]/) || qStr.match(/"values":\s*\["([^"]+)"\]/) || qStr.match(/values: \['([^']+)'\]/)
            if (fieldMatch && valueMatch) {
              const field = fieldMatch[1]
              const val = valueMatch[1]
              filtered = filtered.filter(doc => doc[field] === val)
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
import { stockMovementService } from '@/services/stock-movement.service'

describe('Sales & POS Billing Module Tests', () => {
  const bizA = 'business_A'
  const bizB = 'business_B'
  const user1 = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('recalculates totals server-side and deducts product stock accurately', async () => {
    const prod = await productService.createProduct(
      {
        name: 'Basmati Rice 5kg',
        sku: 'RICE-5KG',
        unit: 'pkt',
        purchasePrice: 800,
        sellingPrice: 1000,
        stockQuantity: 50,
      },
      bizA,
      user1
    )

    const cust = await customerService.createCustomer(
      {
        name: 'Sita Sharma',
        phone: '9841112233',
      },
      bizA,
      user1
    )

    // Sell 2 pkts of Rice @ Rs. 1000 each = subtotal Rs. 2000
    // Tax 13% = Rs. 260 -> Total Rs. 2260
    // Paid Rs. 2000 -> Due Rs. 260
    const result = await saleService.createSale(
      {
        customerId: cust.$id,
        items: [
          {
            productId: prod.$id,
            quantity: 2,
            unitPrice: 1000,
            discount: 0,
          },
        ],
        discount: 0,
        taxRate: 13,
        paidAmount: 2000,
        paymentMethod: 'cash',
      },
      bizA,
      user1
    )

    expect(result.sale.subtotal).toBe(2000)
    expect(result.sale.total).toBe(2260)
    expect(result.sale.dueAmount).toBe(260)
    expect(result.sale.status).toBe('pending')

    // Stock should be deducted from 50 -> 48
    const updatedProd = await productService.getProduct(prod.$id, bizA)
    expect(updatedProd.stockQuantity).toBe(48)

    // Stock movement should be logged
    const movements = await stockMovementService.listMovements(bizA, { productId: prod.$id })
    expect(movements.some((m) => m.type === 'stock_out' && m.quantity === 2)).toBe(true)

    // Customer due balance should be updated
    const updatedCust = await customerService.getCustomer(cust.$id, bizA)
    expect(updatedCust.totalDue).toBe(260)
  })

  it('rejects sale if item quantity exceeds available stock', async () => {
    const prod = await productService.createProduct(
      {
        name: 'Limited Headset',
        sku: 'HEADSET-01',
        unit: 'pcs',
        purchasePrice: 2000,
        sellingPrice: 3000,
        stockQuantity: 3,
      },
      bizA,
      user1
    )

    // Attempting to sell 5 units when only 3 available MUST throw error
    await expect(
      saleService.createSale(
        {
          items: [
            {
              productId: prod.$id,
              quantity: 5,
              unitPrice: 3000,
              discount: 0,
            },
          ],
          paidAmount: 15000,
          paymentMethod: 'card',
        },
        bizA,
        user1
      )
    ).rejects.toThrow(/Insufficient stock/)
  })

  it('enforces tenant isolation for sales records', async () => {
    const prodA = await productService.createProduct(
      { name: 'Item A', sku: 'SKU-A', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 10 },
      bizA,
      user1
    )
    const prodB = await productService.createProduct(
      { name: 'Item B', sku: 'SKU-B', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 10 },
      bizB,
      user1
    )

    await saleService.createSale(
      { items: [{ productId: prodA.$id, quantity: 1, unitPrice: 20, discount: 0 }], paidAmount: 20, paymentMethod: 'cash' },
      bizA,
      user1
    )

    await saleService.createSale(
      { items: [{ productId: prodB.$id, quantity: 1, unitPrice: 20, discount: 0 }], paidAmount: 20, paymentMethod: 'cash' },
      bizB,
      user1
    )

    const salesA = await saleService.listSales(bizA)
    const salesB = await saleService.listSales(bizB)

    expect(salesA.every((s) => s.businessId === bizA)).toBe(true)
    expect(salesB.every((s) => s.businessId === bizB)).toBe(true)
  })

  it('automatically handles Appwrite Unknown attribute errors by stripping unconfigured optional attributes', async () => {
    const { databases } = await import('@/config/appwrite')
    let mockFailedOnce = false
    const originalCreate = databases.createDocument
    vi.spyOn(databases, 'createDocument').mockImplementation(async (dbId, colId, id, data, perms) => {
      if (!mockFailedOnce && colId === 'sales' && (data as any).invoiceStatus) {
        mockFailedOnce = true
        throw new Error('Invalid document structure: Unknown attribute: "invoiceStatus"')
      }
      return originalCreate(dbId, colId, id, data, perms)
    })

    const prod = await productService.createProduct(
      { name: 'Unknown Attr Test Item', sku: 'SKU-UNKN-ATTR', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 10 },
      bizA,
      user1
    )

    const saleResult = await saleService.createSale(
      { items: [{ productId: prod.$id, quantity: 1, unitPrice: 20, discount: 0 }], paidAmount: 20, paymentMethod: 'cash' },
      bizA,
      user1
    )

    expect(saleResult.sale.$id).toBeDefined()
    expect(mockFailedOnce).toBe(true)

  })
})

