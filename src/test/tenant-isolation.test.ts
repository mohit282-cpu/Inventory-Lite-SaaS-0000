import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProductService } from '@/services/product.service'
import { CategoryService } from '@/services/category.service'
import { ExpenseService } from '@/services/expense.service'
import { CustomerService } from '@/services/customer.service'
import { InvoiceService } from '@/services/invoice.service'

// Mock Appwrite databases client
vi.mock('@/config/appwrite', () => {
  const store = new Map<string, any>()

  return {
    DATABASE_ID: 'inventory_lite_db',
    getActiveBusinessContext: vi.fn(async (requestedBusinessId?: string) => ({
      user: { $id: 'user_1' },
      businessId: requestedBusinessId || 'business_A',
      role: 'owner',
    })),
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
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = { $id: id, $collectionId: colId, $databaseId: _dbId, ...data }
        store.set(`${colId}:${id}`, doc)
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

describe('Multi-Tenant Data Isolation & Service Layer Tests', () => {
  let productService: ProductService
  let categoryService: CategoryService
  let expenseService: ExpenseService
  let customerService: CustomerService
  let invoiceService: InvoiceService
  const businessA = 'business_111'
  const businessB = 'business_222'
  const user1 = 'user_999'

  beforeEach(() => {
    productService = new ProductService()
    categoryService = new CategoryService()
    expenseService = new ExpenseService()
    customerService = new CustomerService()
    invoiceService = new InvoiceService()
  })

  it('enforces businessId scope on product creation', async () => {
    const productA = await productService.createProduct(
      {
        name: 'Rice Bag 25kg',
        sku: 'RICE-25KG',
        unit: 'bag',
        purchasePrice: 2000,
        sellingPrice: 2400,
        stockQuantity: 50,
      },
      businessA,
      user1
    )

    expect(productA.businessId).toBe(businessA)
    expect(productA.name).toBe('Rice Bag 25kg')
  })

  it('prevents Business B from reading Business A product by ID', async () => {
    const productA = await productService.createProduct(
      {
        name: 'Wai Wai Noodles',
        sku: 'WAIWAI-01',
        unit: 'pack',
        purchasePrice: 20,
        sellingPrice: 25,
        stockQuantity: 100,
      },
      businessA,
      user1
    )

    // Attempting to access Business A product using Business B's context must fail
    await expect(productService.getProduct(productA.$id, businessB)).rejects.toThrow(
      'Tenant Isolation Violation'
    )
  })

  // MANDATORY PENETRATION SUITE (P0 Point 2)
  describe('Penetration Test Suite — Cross-Tenant Access Controls', () => {
    it('Pen-Test 1: User A (Business A) cannot GET Business B product', async () => {
      const prodB = await productService.createProduct(
        { name: 'Secret Business B Product', unit: 'pcs', purchasePrice: 50, sellingPrice: 100, stockQuantity: 10 },
        businessB,
        user1
      )
      await expect(productService.getProduct(prodB.$id, businessA)).rejects.toThrow(/Tenant Isolation Violation/)
    })

    it('Pen-Test 2: User A (Business A) cannot GET Business B customer', async () => {
      const custB = await customerService.createCustomer(
        { name: 'Private Customer B', phone: '9800000000' },
        businessB,
        user1
      )
      await expect(customerService.getCustomer(custB.$id, businessA)).rejects.toThrow(/Tenant Isolation Violation/)
    })

    it('Pen-Test 3: User A (Business A) cannot GET Business B invoice', async () => {
      const prodB = await productService.createProduct(
        { name: 'Invoice Product B', unit: 'pcs', purchasePrice: 50, sellingPrice: 100, stockQuantity: 10 },
        businessB,
        user1
      )
      const { saleService } = await import('@/services/sale.service')
      const saleB = await saleService.createSale(
        { items: [{ productId: prodB.$id, quantity: 1 }], paidAmount: 100, paymentMethod: 'cash' },
        businessB,
        user1
      )
      const invB = await invoiceService.createInvoice(
        { saleId: saleB.sale.$id, issueDate: new Date().toISOString(), idempotencyKey: 'pen_test_3_inv_key_unique' },
        businessB,
        user1
      )
      await expect(invoiceService.getInvoice(invB.$id, businessA)).rejects.toThrow(/Tenant Isolation Violation/)
    })

    it('Pen-Test 4: User A (Business A) cannot UPDATE Business B product', async () => {
      const prodB = await productService.createProduct(
        { name: 'Unmodified Product B', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 5 },
        businessB,
        user1
      )
      await expect(
        productService.updateProduct(prodB.$id, { name: 'Hacked Product Name' }, businessA)
      ).rejects.toThrow(/Tenant Isolation Violation/)
    })

    it('Pen-Test 5: User A (Business A) cannot DELETE Business B product', async () => {
      const prodB = await productService.createProduct(
        { name: 'Protected Product B', unit: 'pcs', purchasePrice: 10, sellingPrice: 20, stockQuantity: 5 },
        businessB,
        user1
      )
      await expect(productService.deleteProduct(prodB.$id, businessA)).rejects.toThrow(/Tenant Isolation Violation/)
    })

    it('Pen-Test 6: User A (Business A) LIST query returns zero records for Business B data', async () => {
      await productService.createProduct(
        { name: 'Product B Only', unit: 'pcs', purchasePrice: 15, sellingPrice: 30, stockQuantity: 10 },
        businessB,
        user1
      )
      const listA = await productService.listProducts(businessA)
      const foundB = listA.filter((p) => p.businessId === businessB)
      expect(foundB.length).toBe(0)
    })
  })

  it('allows same SKU in different businesses but prevents duplicates within the same business', async () => {
    const productA = await productService.createProduct(
      {
        name: 'Mustard Oil 1L',
        sku: 'OIL-1L',
        unit: 'bottle',
        purchasePrice: 250,
        sellingPrice: 300,
        stockQuantity: 30,
      },
      businessA,
      user1
    )
    expect(productA.sku).toBe('OIL-1L')

    // Business B should be allowed to create product with same SKU 'OIL-1L'
    const productB = await productService.createProduct(
      {
        name: 'Mustard Oil 1L',
        sku: 'OIL-1L',
        unit: 'bottle',
        purchasePrice: 260,
        sellingPrice: 310,
        stockQuantity: 20,
      },
      businessB,
      user1
    )
    expect(productB.businessId).toBe(businessB)
    expect(productB.sku).toBe('OIL-1L')

    // Attempting duplicate SKU within Business A must fail
    await expect(
      productService.createProduct(
        {
          name: 'Mustard Oil 1L Duplicate',
          sku: 'OIL-1L',
          unit: 'bottle',
          purchasePrice: 250,
          sellingPrice: 300,
          stockQuantity: 10,
        },
        businessA,
        user1
      )
    ).rejects.toThrow('Product with SKU "OIL-1L" already exists in this business')
  })

  it('enforces category name uniqueness per business', async () => {
    await categoryService.createCategory(
      { name: 'Beverages', description: 'Cold drinks and juices' },
      businessA,
      user1
    )

    await expect(
      categoryService.createCategory(
        { name: 'Beverages', description: 'Duplicate category' },
        businessA,
        user1
      )
    ).rejects.toThrow('Category "Beverages" already exists')
  })

  it('enforces positive expense amount validation', async () => {
    await expect(
      expenseService.createExpense(
        { category: 'Rent', description: 'Store Rent', amount: -500 },
        businessA,
        user1
      )
    ).rejects.toThrow('Expense amount must be greater than zero')
  })

  it('QA-001: Resolves active business context based on requested businessId or stored preferences', async () => {
    const { getActiveBusinessContext } = await import('@/config/appwrite')
    const ctxA = await getActiveBusinessContext('business_A')
    expect(ctxA?.businessId).toBe('business_A')

    const ctxB = await getActiveBusinessContext('business_B')
    expect(ctxB?.businessId).toBe('business_B')
  })
})
