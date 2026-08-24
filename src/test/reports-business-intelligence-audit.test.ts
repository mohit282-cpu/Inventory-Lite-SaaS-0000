import { describe, it, expect } from 'vitest'
import { analyzeBusinessHealth } from '@/lib/report-auditor'
import { Sale, Invoice, Customer, Product } from '@/types'

describe('Reports Business Intelligence & Audit Center Engine', () => {
  const mockCustomer: Customer = {
    $id: 'c1',
    $collectionId: 'customers',
    $databaseId: 'db',
    $createdAt: '2026-01-01',
    $updatedAt: '2026-01-01',
    $permissions: [],
    businessId: 'biz1',
    name: 'Ram Thapa',
    phone: '9841000000',
    totalDue: 1500,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }

  const mockProduct: Product = {
    $id: 'p1',
    $collectionId: 'products',
    $databaseId: 'db',
    $createdAt: '2026-01-01',
    $updatedAt: '2026-01-01',
    $permissions: [],
    businessId: 'biz1',
    name: 'Basmati Rice 20kg',
    sku: 'RICE-01',
    unit: 'bag',
    purchasePrice: 2000,
    sellingPrice: 2500,
    stockQuantity: 10,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }

  it('classifies clean transactions as OK', () => {
    const sales: Sale[] = [
      {
        $id: 's1',
        $collectionId: 'sales',
        $databaseId: 'db',
        $createdAt: '2026-01-01',
        $updatedAt: '2026-01-01',
        $permissions: [],
        businessId: 'biz1',
        subtotal: 2000,
        discount: 0,
        tax: 0,
        total: 2000,
        paidAmount: 2000,
        dueAmount: 0,
        status: 'completed',
        saleNumber: 'SALE-001',
        invoiceNumber: 'INV-001',
        paymentMethod: 'cash',
        createdBy: 'user1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]

    const invoices: Invoice[] = [
      {
        $id: 'inv1',
        $collectionId: 'invoices',
        $databaseId: 'db',
        $createdAt: '2026-01-01',
        $updatedAt: '2026-01-01',
        $permissions: [],
        businessId: 'biz1',
        invoiceNumber: 'INV-001',
        saleId: 's1',
        subtotal: 2000,
        discount: 0,
        tax: 0,
        total: 2000,
        paidAmount: 2000,
        dueAmount: 0,
        status: 'paid',
        issueDate: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]

    const summary = analyzeBusinessHealth(sales, invoices, [mockCustomer], [], [mockProduct])
    expect(summary.overallStatus).toBe('ok')
    expect(summary.dataQuality).toBe('good')
    expect(summary.issuesCount.action_required).toBe(0)
  })

  it('detects payment variance as Needs Review with exact difference details and action steps', () => {
    const sales: Sale[] = [
      {
        $id: 's2',
        $collectionId: 'sales',
        $databaseId: 'db',
        $createdAt: '2026-01-01',
        $updatedAt: '2026-01-01',
        $permissions: [],
        businessId: 'biz1',
        subtotal: 2068,
        discount: 0,
        tax: 0,
        total: 2068,
        paidAmount: 2070, // Rs. 2 difference, no changeAmount field specified
        dueAmount: 0,
        status: 'completed',
        saleNumber: 'SALE-002',
        invoiceNumber: 'INV-002',
        customerName: 'Sita Rai',
        paymentMethod: 'cash',
        createdBy: 'user1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]

    const summary = analyzeBusinessHealth(sales, [], [], [], [])
    expect(summary.overallStatus).toBe('needs_review')
    expect(summary.issuesCount.needs_review).toBeGreaterThan(0)

    const paymentIssue = summary.issues.find((i) => i.category === 'payment_reconciliation')
    expect(paymentIssue).toBeDefined()
    expect(paymentIssue?.severity).toBe('needs_review')
    expect(paymentIssue?.title).toBe('Payment amount needs review')
    expect(paymentIssue?.affectedRecords[0].details?.expected).toBe(2068)
    expect(paymentIssue?.affectedRecords[0].details?.recorded).toBe(2070)
    expect(paymentIssue?.affectedRecords[0].details?.difference).toBe(2)
    expect(paymentIssue?.affectedRecords[0].url).toBe('/app/sales/s2')
  })

  it('does NOT flag payment reconciliation error when change is returned to customer (Total: 2068, Received: 2070, Change: 2)', () => {
    const sales: Sale[] = [
      {
        $id: 's_change_ok',
        $collectionId: 'sales',
        $databaseId: 'db',
        $createdAt: '2026-01-01',
        $updatedAt: '2026-01-01',
        $permissions: [],
        businessId: 'biz1',
        subtotal: 2068,
        discount: 0,
        tax: 0,
        total: 2068,
        paidAmount: 2070,
        changeAmount: 2, // Customer received Rs. 2 change
        dueAmount: 0,
        status: 'completed',
        saleNumber: 'SALE-003',
        invoiceNumber: 'INV-003',
        customerName: 'Gita Shrestha',
        paymentMethod: 'cash',
        createdBy: 'user1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]

    const summary = analyzeBusinessHealth(sales, [], [], [], [])
    const paymentIssue = summary.issues.find((i) => i.category === 'payment_reconciliation')
    expect(paymentIssue).toBeDefined()
    expect(paymentIssue?.severity).toBe('ok')
    expect(summary.overallStatus).toBe('ok')
  })

  it('detects duplicate invoices as Action Required', () => {
    const invoices: Invoice[] = [
      {
        $id: 'inv1',
        $collectionId: 'invoices',
        $databaseId: 'db',
        $createdAt: '2026-01-01',
        $updatedAt: '2026-01-01',
        $permissions: [],
        businessId: 'biz1',
        invoiceNumber: 'INV-001',
        saleId: 's1',
        subtotal: 1000,
        total: 1000,
        paidAmount: 1000,
        dueAmount: 0,
        status: 'paid',
        issueDate: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        $id: 'inv2',
        $collectionId: 'invoices',
        $databaseId: 'db',
        $createdAt: '2026-01-02',
        $updatedAt: '2026-01-02',
        $permissions: [],
        businessId: 'biz1',
        invoiceNumber: 'INV-001', // DUPLICATE!
        saleId: 's2',
        subtotal: 1500,
        total: 1500,
        paidAmount: 1500,
        dueAmount: 0,
        status: 'paid',
        issueDate: '2026-01-02',
        createdAt: '2026-01-02',
        updatedAt: '2026-01-02',
      },
    ]

    const summary = analyzeBusinessHealth([], invoices, [], [], [])
    expect(summary.overallStatus).toBe('action_required')

    const dupIssue = summary.issues.find((i) => i.category === 'duplicate_invoice')
    expect(dupIssue).toBeDefined()
    expect(dupIssue?.severity).toBe('action_required')
    expect(dupIssue?.affectedCount).toBe(2)
  })

  it('detects invoice sequence gaps as Needs Review', () => {
    const invoices: Invoice[] = [
      {
        $id: 'inv1',
        $collectionId: 'invoices',
        $databaseId: 'db',
        $createdAt: '2026-01-01',
        $updatedAt: '2026-01-01',
        $permissions: [],
        businessId: 'biz1',
        invoiceNumber: 'INV-001',
        saleId: 's1',
        subtotal: 1000,
        total: 1000,
        paidAmount: 1000,
        dueAmount: 0,
        status: 'paid',
        issueDate: '2026-01-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        $id: 'inv3',
        $collectionId: 'invoices',
        $databaseId: 'db',
        $createdAt: '2026-01-03',
        $updatedAt: '2026-01-03',
        $permissions: [],
        businessId: 'biz1',
        invoiceNumber: 'INV-003', // Gap: INV-002 missing
        saleId: 's3',
        subtotal: 1200,
        total: 1200,
        paidAmount: 1200,
        dueAmount: 0,
        status: 'paid',
        issueDate: '2026-01-03',
        createdAt: '2026-01-03',
        updatedAt: '2026-01-03',
      },
    ]

    const summary = analyzeBusinessHealth([], invoices, [], [], [])
    const seqIssue = summary.issues.find((i) => i.category === 'invoice_sequence')
    expect(seqIssue).toBeDefined()
    expect(seqIssue?.severity).toBe('needs_review')
    expect(seqIssue?.affectedCount).toBe(1)
  })
})
