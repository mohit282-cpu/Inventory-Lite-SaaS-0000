import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map<string, any>()

vi.mock('@/config/appwrite', () => ({
  DATABASE_ID: 'test_db',
  COLLECTIONS: {
    CUSTOMERS: 'customers',
    SALES: 'sales',
    PRODUCTS: 'products',
    STOCK_MOVEMENTS: 'stock_movements',
    JOURNAL_ENTRIES: 'journal_entries',
    ACCOUNTS: 'accounts',
    BUSINESS_MEMBERS: 'business_members',
  },
  account: {
    get: vi.fn(async () => ({ $id: 'user_owner' })),
  },
  databases: {
    getDocument: vi.fn(async (_db, col, id) => {
      const doc = store.get(`${col}:${id}`)
      if (!doc) throw { code: 404, message: 'Not found', type: 'document_not_found' }
      return { ...doc }
    }),
    listDocuments: vi.fn(async (_db, col, queries = []) => {
      let docs = Array.from(store.values()).filter((d) => d.$collectionId === col)
      for (const q of queries) {
        const qStr = typeof q === 'string' ? q : JSON.stringify(q)
        if (qStr.includes('equal')) {
          const match = qStr.match(/equal\("([^"]+)",\s*\[?"?([^"\]]+)"?\]?\)/) ||
                        qStr.match(/"attribute":"([^"]+)".*?"values":\["([^"]+)"\]/)
          if (match) {
            docs = docs.filter((d) => String(d[match[1]]) === String(match[2]))
          }
        }
      }
      return { documents: docs, total: docs.length }
    }),
    createDocument: vi.fn(async (_db, col, id, data) => {
      const doc = { $id: id || `doc_${Date.now()}`, $collectionId: col, ...data }
      store.set(`${col}:${doc.$id}`, doc)
      return doc
    }),
    updateDocument: vi.fn(async (_db, col, id, data) => {
      const doc = store.get(`${col}:${id}`)
      const updated = { ...doc, ...data }
      store.set(`${col}:${id}`, updated)
      return updated
    }),
  },
}))

import { accountingReconciliationService } from '@/services/accounting-reconciliation.service'
import { customerService } from '@/services/customer.service'
import { productService } from '@/services/product.service'

describe('Accounting Reconciliation & Invariant Scanner Tests', () => {
  const bizId = 'biz_reconcile_test'

  beforeEach(() => {
    store.clear()
    vi.clearAllMocks()
  })

  it('detects customer due discrepancy without automatically mutating records', async () => {
    // Seed customer with recordedDue = 500
    const cust = {
      $id: 'cust_discrepancy_1',
      $collectionId: 'customers',
      businessId: bizId,
      name: 'Hari Bahadur',
      totalDue: 500,
      dueAmount: 500,
    }
    store.set(`customers:${cust.$id}`, cust)

    // Seed sales that only total 200 due
    const sale = {
      $id: 'sale_1',
      $collectionId: 'sales',
      businessId: bizId,
      customerId: cust.$id,
      status: 'pending',
      dueAmount: 200,
      total: 1000,
      paidAmount: 800,
    }
    store.set(`sales:${sale.$id}`, sale)

    // Execute scan
    const discrepancies = await accountingReconciliationService.reconcileCustomerBalances(bizId)

    // Must identify discrepancy
    expect(discrepancies.length).toBe(1)
    expect(discrepancies[0].customerId).toBe(cust.$id)
    expect(discrepancies[0].recordedDue).toBe(500)
    expect(discrepancies[0].calculatedDue).toBe(200)
    expect(discrepancies[0].difference).toBe(300)

    // Verification: ensure the customer record was NOT mutated automatically
    const unchangedCust = await customerService.getCustomer(cust.$id, bizId)
    expect(unchangedCust.totalDue).toBe(500)
  })

  it('detects stock quantity discrepancy against movement ledger without mutating catalog', async () => {
    // Seed product with catalog stock = 50
    const prod = {
      $id: 'prod_stock_discrepancy_1',
      $collectionId: 'products',
      businessId: bizId,
      name: 'Organic Honey',
      stockQuantity: 50,
    }
    store.set(`products:${prod.$id}`, prod)

    // Seed stock movement showing only 30 units in
    const movement = {
      $id: 'mov_1',
      $collectionId: 'stock_movements',
      businessId: bizId,
      productId: prod.$id,
      type: 'stock_in',
      quantity: 30,
    }
    store.set(`stock_movements:${movement.$id}`, movement)

    // Execute stock audit scan
    const stockDiscrepancies = await accountingReconciliationService.reconcileStockQuantities(bizId)

    expect(stockDiscrepancies.length).toBe(1)
    expect(stockDiscrepancies[0].productId).toBe(prod.$id)
    expect(stockDiscrepancies[0].catalogQuantity).toBe(50)
    expect(stockDiscrepancies[0].ledgerQuantity).toBe(30)
    expect(stockDiscrepancies[0].difference).toBe(20)

    // Verification: ensure the product stock was NOT silently altered
    const unchangedProd = await productService.getProduct(prod.$id, bizId)
    expect(unchangedProd.stockQuantity).toBe(50)
  })
})
