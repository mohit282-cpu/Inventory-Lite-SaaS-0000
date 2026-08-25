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
      get: vi.fn(async () => ({ $id: 'user_owner_purchases' })),
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

import { supplierService } from '@/services/supplier.service'
import { purchaseService } from '@/services/purchase.service'
import { supplierPaymentService } from '@/services/supplier-payment.service'
import { productService } from '@/services/product.service'
import { stockMovementService } from '@/services/stock-movement.service'

describe('Feature 1 & Feature 2 — Supplier Management and Purchase Stock Intake Tests', () => {
  const businessA = 'business_purchases_A'
  const businessB = 'business_purchases_B'
  const userOwner = 'user_owner_purchases'

  let prod1Id: string

  beforeEach(async () => {
    mockStore.clear()
    // Create test product for businessA
    const prod = await productService.createProduct(
      {
        name: 'Test Heavy Cable',
        sku: `CABLE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        unit: 'pcs',
        purchasePrice: 500,
        sellingPrice: 800,
        stockQuantity: 10,
        isActive: true,
      },
      businessA,
      userOwner
    )
    prod1Id = prod.$id
  })

  it('1. Should create a supplier successfully with zero initial balances', async () => {
    const supplier = await supplierService.createSupplier(
      {
        name: 'Everest Supplies Pvt Ltd',
        phone: '9841000111',
        email: 'info@everest.com',
        panVatNumber: '600123456',
        address: 'Baneshwor, Kathmandu',
      },
      businessA,
      userOwner
    )

    expect(supplier.$id).toBeDefined()
    expect(supplier.name).toBe('Everest Supplies Pvt Ltd')
    expect(supplier.status).toBe('active')
    expect(supplier.totalPurchases).toBe(0)
    expect(supplier.totalPaid).toBe(0)
    expect(supplier.outstandingPayable).toBe(0)
  })

  it('2. Should reject duplicate supplier phone number within the same business', async () => {
    const phone = `98${Math.floor(10000000 + Math.random() * 90000000)}`
    await supplierService.createSupplier(
      { name: 'Supplier Alpha', phone },
      businessA,
      userOwner
    )

    await expect(
      supplierService.createSupplier({ name: 'Supplier Beta', phone }, businessA, userOwner)
    ).rejects.toThrow(/already exists/)
  })

  it('3. Should complete a purchase intake, increase stock, and update supplier payable balance', async () => {
    const supplier = await supplierService.createSupplier(
      { name: 'Hardware Wholesaler' },
      businessA,
      userOwner
    )

    const initialProduct = await productService.getProduct(prod1Id, businessA)
    const initialStock = initialProduct.stockQuantity

    // Purchase 5 units @ Rs. 500 = Rs. 2500 total, paid Rs. 1000, due Rs. 1500
    const result = await purchaseService.createPurchase(
      {
        supplierId: supplier.$id,
        supplierInvoiceNumber: 'INV-WH-001',
        items: [
          {
            productId: prod1Id,
            quantity: 5,
            purchasePrice: 500,
          },
        ],
        paidAmount: 1000,
        paymentMethod: 'bank_transfer',
      },
      businessA,
      userOwner
    )

    expect(result.purchase.purchaseNumber).toContain('PUR-')
    expect(result.purchase.subtotal).toBe(2500)
    expect(result.purchase.total).toBe(2500)
    expect(result.purchase.paidAmount).toBe(1000)
    expect(result.purchase.dueAmount).toBe(1500)

    // Verify product stock increased from 10 to 15
    const updatedProduct = await productService.getProduct(prod1Id, businessA)
    expect(updatedProduct.stockQuantity).toBe(initialStock + 5)

    // Verify stock movement log entry exists for purchase intake
    const history = await stockMovementService.getProductHistory(prod1Id, businessA)
    const purchaseMovement = history.find((h) => h.quantity === 5)
    expect(purchaseMovement).toBeDefined()
    expect(purchaseMovement?.type).toBe('stock_in')
    expect(purchaseMovement?.quantity).toBe(5)

    // Verify supplier payable balance updated
    const updatedSupplier = await supplierService.getSupplier(supplier.$id, businessA)
    expect(updatedSupplier.totalPurchases).toBe(2500)
    expect(updatedSupplier.totalPaid).toBe(1000)
    expect(updatedSupplier.outstandingPayable).toBe(1500)
  })

  it('4. Should record supplier payments and reduce outstanding payable balance', async () => {
    const supplier = await supplierService.createSupplier(
      { name: 'Nepal Distributors' },
      businessA,
      userOwner
    )

    // Purchase Rs. 5000, Paid Rs. 2000, Due Rs. 3000
    await purchaseService.createPurchase(
      {
        supplierId: supplier.$id,
        items: [{ productId: prod1Id, quantity: 10, purchasePrice: 500 }],
        paidAmount: 2000,
        paymentMethod: 'cash',
      },
      businessA,
      userOwner
    )

    // Record additional payment of Rs. 2000
    const payment = await supplierPaymentService.createSupplierPayment(
      {
        supplierId: supplier.$id,
        amount: 2000,
        paymentMethod: 'bank_transfer',
        referenceNumber: 'CHEQUE-9911',
      },
      businessA,
      userOwner
    )

    expect(payment.amount).toBe(2000)

    // Outstanding payable should now be Rs. 1000
    const updatedSupplier = await supplierService.getSupplier(supplier.$id, businessA)
    expect(updatedSupplier.totalPaid).toBe(4000)
    expect(updatedSupplier.outstandingPayable).toBe(1000)
  })

  it('5. Should prevent deleting suppliers with financial history', async () => {
    const supplier = await supplierService.createSupplier(
      { name: 'Protected Vendor' },
      businessA,
      userOwner
    )

    await purchaseService.createPurchase(
      {
        supplierId: supplier.$id,
        items: [{ productId: prod1Id, quantity: 2, purchasePrice: 500 }],
        paidAmount: 1000,
        paymentMethod: 'cash',
      },
      businessA,
      userOwner
    )

    await expect(
      supplierService.deleteSupplier(supplier.$id, businessA, userOwner)
    ).rejects.toThrow(/historical financial transactions cannot be deleted/)
  })

  it('6. Should enforce tenant isolation on purchases and suppliers', async () => {
    const supplierA = await supplierService.createSupplier(
      { name: 'Tenant A Supplier' },
      businessA,
      userOwner
    )

    // Accessing businessA supplier from businessB context must throw Tenant Isolation Violation
    await expect(
      supplierService.getSupplier(supplierA.$id, businessB)
    ).rejects.toThrow(/Tenant Isolation Violation/)
  })
})
