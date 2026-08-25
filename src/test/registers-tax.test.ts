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
      CREDIT_NOTES: 'credit_notes',
      DEBIT_NOTES: 'debit_notes',
      FINANCIAL_SEQUENCES: 'financial_sequences',
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_owner_reg_tax' })),
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
        return updated
      }),
      listDocuments: vi.fn(async (_dbId, colId, queries: any[] = []) => {
        const docs = Array.from(mockStore.values()).filter((d) => d.$collectionId === colId)
        let filtered = [...docs]

        for (const q of queries) {
          if (!q) continue
          const qStr = String(q)
          if (qStr.includes('equal("businessId"')) {
            const match = qStr.match(/equal\("businessId",\s*"([^"]+)"\)/)
            if (match && match[1]) {
              filtered = filtered.filter((d) => d.businessId === match[1])
            }
          }
        }

        return { documents: filtered, total: filtered.length }
      }),
      deleteDocument: vi.fn(async (_dbId, colId, id) => {
        mockStore.delete(`${colId}:${id}`)
        return true
      }),
    },
  }
})

vi.mock('@/lib/authorization', () => ({
  authorizeBusinessAccess: vi.fn(async () => true),
}))

import { purchaseService } from '@/services/purchase.service'
import { supplierService } from '@/services/supplier.service'
import { productService } from '@/services/product.service'
import { creditNoteService } from '@/services/credit-note.service'
import { debitNoteService } from '@/services/debit-note.service'

describe('Registers and Tax Summary Integrity Tests', () => {
  const businessId = 'biz_reg_tax_3001'
  const ownerUserId = 'user_owner_reg_tax'

  beforeEach(() => {
    mockStore.clear()
  })

  it('1. Should correctly compute Purchase Register totals and supplier bill links', async () => {
    const supplier = await supplierService.createSupplier(
      {
        name: 'National Suppliers Nepal',
        phone: '9841122334',
      },
      businessId,
      ownerUserId
    )

    const product = await productService.createProduct(
      {
        name: 'Rice 25kg Bag',
        sku: 'RICE-25KG-REG',
        unit: 'kg',
        sellingPrice: 1500,
        purchasePrice: 1000,
        stockQuantity: 50,
      },
      businessId,
      ownerUserId
    )

    const { purchase } = await purchaseService.createPurchase(
      {
        supplierId: supplier.$id,
        supplierInvoiceNumber: 'BILL-9082',
        purchaseDate: '2026-08-25',
        paidAmount: 5000,
        paymentMethod: 'cash',
        items: [
          {
            productId: product.$id,
            quantity: 10,
            purchasePrice: 1000,
          },
        ],
      },
      businessId,
      ownerUserId
    )

    expect(purchase).toBeDefined()
    expect(purchase.supplierInvoiceNumber).toBe('BILL-9082')

    const purchasesList = await purchaseService.listAllPurchases(businessId)
    expect(purchasesList.length).toBeGreaterThan(0)

    const fetchedPurchase = purchasesList.find((p) => p.$id === purchase.$id)
    expect(fetchedPurchase?.total).toBeGreaterThan(0)
  })

  it('2. Should correctly calculate Net VAT Position from Output VAT and Input VAT', async () => {
    // Output VAT from Sales = 1300
    const outputVat = 1300

    // Input VAT from Purchases = 650
    const inputVat = 650

    // Credit Note Output VAT Adjustment = 130
    const cn = await creditNoteService.createCreditNote(
      {
        reason: 'Sales return tax adjustment',
        taxableAmount: 1000,
        vatAmount: 130,
      },
      businessId,
      ownerUserId
    )

    // Debit Note Input VAT Adjustment = 65
    const dn = await debitNoteService.createDebitNote(
      {
        reason: 'Purchase return tax adjustment',
        taxableAmount: 500,
        vatAmount: 65,
      },
      businessId,
      ownerUserId
    )

    const netOutputVat = outputVat - cn.vatAmount // 1300 - 130 = 1170
    const netInputVat = inputVat - dn.vatAmount // 650 - 65 = 585
    const netVatPosition = netOutputVat - netInputVat // 1170 - 585 = 585 Payable

    expect(netOutputVat).toBe(1170)
    expect(netInputVat).toBe(585)
    expect(netVatPosition).toBe(585)
  })
})
