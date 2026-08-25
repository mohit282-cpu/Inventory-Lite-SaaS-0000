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
      get: vi.fn(async () => ({ $id: 'user_owner_cancel' })),
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

describe('Feature 4 — Bill Cancellation / Void Tests', () => {
  const businessId = 'business_cancel_test'
  const userOwner = 'user_owner_cancel'
  const userStaff = 'user_staff_cashier'

  let prodId: string
  let customerId: string

  beforeEach(async () => {
    mockStore.clear()
    // Setup owner membership in mockStore
    mockStore.set('business_members:mem_owner', {
      $id: 'mem_owner',
      $collectionId: 'business_members',
      businessId,
      userId: userOwner,
      role: 'owner',
    })
    // Setup staff membership in mockStore
    mockStore.set('business_members:mem_staff', {
      $id: 'mem_staff',
      $collectionId: 'business_members',
      businessId,
      userId: userStaff,
      role: 'staff',
    })

    // Create test product with initial stock = 15
    const prod = await productService.createProduct(
      {
        name: 'Cancellable Item',
        sku: `ITEM-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        unit: 'pcs',
        purchasePrice: 100,
        sellingPrice: 300,
        stockQuantity: 15,
        isActive: true,
      },
      businessId,
      userOwner
    )
    prodId = prod.$id

    // Create customer
    const cust = await customerService.createCustomer(
      { name: 'Sita Sharma', phone: `9811${Math.floor(100000 + Math.random() * 900000)}` },
      businessId,
      userOwner
    )
    customerId = cust.$id
  })

  it('1. Should allow Owner/Admin to cancel a completed sale, restoring stock and customer due balance', async () => {
    // Create sale: 5 units @ 300 = 1500 total, paid 500, due 1000
    const saleResult = await saleService.createSale(
      {
        customerId,
        items: [{ productId: prodId, quantity: 5, unitPrice: 300 }],
        paidAmount: 500,
        paymentMethod: 'credit',
        vatEnabled: false,
      },
      businessId,
      userOwner
    )

    const sale = saleResult.sale

    // Stock decreased from 15 to 10
    let product = await productService.getProduct(prodId, businessId)
    expect(product.stockQuantity).toBe(10)

    // Customer due increased by 1000
    let customer = await customerService.getCustomer(customerId, businessId)
    expect(customer.totalDue).toBe(1000)

    // Owner cancels sale with mandatory reason
    const success = await saleService.cancelSale(
      sale.$id,
      businessId,
      userOwner,
      'Billed wrong items by accident'
    )
    expect(success).toBe(true)

    // Verify sale status is now 'cancelled'
    const cancelledSale = await saleService.getSale(sale.$id, businessId)
    expect(cancelledSale.status).toBe('cancelled')
    expect(cancelledSale.cancellationReason).toBe('Billed wrong items by accident')
    expect(cancelledSale.cancelledBy).toBe(userOwner)

    // Verify stock restored from 10 back to 15
    product = await productService.getProduct(prodId, businessId)
    expect(product.stockQuantity).toBe(15)

    // Verify customer due balance reversed back to 0
    customer = await customerService.getCustomer(customerId, businessId)
    expect(customer.totalDue).toBe(0)
  })

  it('2. Should reject bill cancellation by unauthorized staff members', async () => {
    const saleResult = await saleService.createSale(
      {
        items: [{ productId: prodId, quantity: 2, unitPrice: 300 }],
        paidAmount: 600,
        paymentMethod: 'cash',
      },
      businessId,
      userOwner
    )

    // Staff member trying to cancel must be rejected by RBAC check
    await expect(
      saleService.cancelSale(
        saleResult.sale.$id,
        businessId,
        userStaff,
        'Staff attempting unauthorized cancellation'
      )
    ).rejects.toThrow(/Required role \[owner, admin\]/)
  })

  it('3. Should require a non-empty cancellation reason', async () => {
    const saleResult = await saleService.createSale(
      {
        items: [{ productId: prodId, quantity: 1, unitPrice: 300 }],
        paidAmount: 300,
        paymentMethod: 'cash',
      },
      businessId,
      userOwner
    )

    await expect(
      saleService.cancelSale(saleResult.sale.$id, businessId, userOwner, '')
    ).rejects.toThrow(/Cancellation reason is required/)
  })

  it('4. Should reject cancelling an already cancelled bill transaction', async () => {
    const saleResult = await saleService.createSale(
      {
        items: [{ productId: prodId, quantity: 1, unitPrice: 300 }],
        paidAmount: 300,
        paymentMethod: 'cash',
      },
      businessId,
      userOwner
    )

    await saleService.cancelSale(saleResult.sale.$id, businessId, userOwner, 'First cancellation')

    await expect(
      saleService.cancelSale(saleResult.sale.$id, businessId, userOwner, 'Second cancellation')
    ).rejects.toThrow(/already been cancelled/)
  })
})
