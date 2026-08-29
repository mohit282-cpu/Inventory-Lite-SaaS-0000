import { describe, it, expect } from 'vitest'
import { Business } from '@/types'
import {
  safeText,
  formatNpr,
  formatNumber,
  sanitizeFilename,
  generateSalesRegisterPdf,
  generatePurchaseRegisterPdf,
  generateVatSummaryPdf,
  generateCustomerLedgerPdf,
  generateSupplierLedgerPdf,
  generateExpenseReportPdf,
  generateProfitCogsPdf,
  generateInvoicePdf,
  generateStockLedgerPdf,
} from '@/lib/pdf'

const mockBusiness: Business = {
  $id: 'biz_123',
  $createdAt: '2026-01-01T00:00:00.000Z',
  $updatedAt: '2026-01-01T00:00:00.000Z',
  $collectionId: 'businesses',
  $databaseId: 'inventory_lite_db',
  $permissions: [],
  name: 'Kathmandu Retail Traders',
  ownerId: 'user_123',
  address: 'New Road, Kathmandu',
  phone: '9841000000',
  currency: 'NPR',
  timezone: 'Asia/Kathmandu',
  taxRegistrationType: 'VAT',
  taxRegistrationNumber: '123456789',
  vatNumber: '123456789',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function assertValidPdf(doc: any) {
  expect(doc).toBeDefined()
  expect(typeof doc.output).toBe('function')
  const buf: ArrayBuffer = doc.output('arraybuffer')
  expect(buf.byteLength).toBeGreaterThan(0)
  // Verify PDF magic header present in output bytes.
  const bytes = new Uint8Array(buf)
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
  expect(magic).toBe('%PDF')
}

describe('PDF Design System — formatters & safe text', () => {
  it('safeText never renders NaN, Infinity, undefined, or null', () => {
    expect(safeText(undefined)).toBe('-')
    expect(safeText(null)).toBe('-')
    expect(safeText(Number.NaN)).toBe('-')
    expect(safeText(Number.POSITIVE_INFINITY)).toBe('-')
    expect(safeText(Number.NEGATIVE_INFINITY)).toBe('-')
    expect(safeText(123.45)).toBe('123.45')
    expect(safeText('')).toBe('-')
  })

  it('money formatter always returns a finite NPR value', () => {
    expect(formatNpr(undefined)).toBe('Rs. 0.00')
    expect(formatNpr(Number.NaN)).toBe('Rs. 0.00')
    expect(formatNpr(1234.5)).toBe('Rs. 1,234.50')
    expect(formatNumber(1000000)).toBe('1,000,000')
  })

  it('sanitizeFilename strips illegal filename characters', () => {
    expect(sanitizeFilename('Shop & Store / 100% * Quality?')).toBe('Shop___Store___100____Quality_')
  })
})

describe('PDF Design System — every report generator produces a valid PDF (regression: vertical word wrap)', () => {
  it('Sales Register — no crash, valid PDF', () => {
    const longCustomer = 'A very long customer company name Limited Liability Partnership Trading Enterprise'
    const doc = generateSalesRegisterPdf({
      business: mockBusiness,
      summary: { totalInvoices: 2, totalSales: 1000, totalDiscount: 50, totalTaxableAmount: 900, totalVat: 117, totalCancelled: 0 },
      rows: [
        { date: '2026-08-01', invoiceNumber: 'INV-2026-0001', customerName: longCustomer, taxableAmount: 900, discount: 50, vat: 117, total: 1000, paidAmount: 1000, outstanding: 0, paymentStatus: 'PAID' },
        { date: '2026-08-02', invoiceNumber: 'INV-2026-0002', customerName: 'Walk-in Customer', taxableAmount: 130, discount: 0, vat: 17, total: 147, paidAmount: 0, outstanding: 147, paymentStatus: 'UNPAID' },
      ],
      yearLabel: '2083/84',
      dateFrom: '2026-08-01',
      dateTo: '2026-09-01',
    })
    assertValidPdf(doc)
  })

  it('Purchase Register — no crash, valid PDF', () => {
    const doc = generatePurchaseRegisterPdf({
      business: mockBusiness,
      summary: { totalPurchases: 5000, taxablePurchases: 4200, inputVat: 546 },
      rows: [
        { date: '2026-08-01', purchaseReference: 'PUR-2026-0001', supplierName: 'Imported Goods Trading House Suppliers Kathmandu', taxableAmount: 4200, discount: 0, vatAmount: 546, total: 4746, paidAmount: 4746, outstanding: 0, paymentStatus: 'PAID' },
      ],
      yearLabel: '2083/84',
    })
    assertValidPdf(doc)
  })

  it('VAT Summary — no crash, valid PDF', () => {
    const doc = generateVatSummaryPdf({
      business: mockBusiness,
      data: { taxableSales: 100000, nonTaxableSales: 0, outputVat: 13000, taxablePurchases: 60000, nonTaxablePurchases: 0, inputVat: 7800, netVatPosition: 5200, vatRate: 13, status: 'PAYABLE' },
      yearLabel: '2083/84',
    })
    assertValidPdf(doc)
  })

  it('Customer Ledger — no crash, valid PDF', () => {
    const doc = generateCustomerLedgerPdf({
      business: mockBusiness,
      customers: [
        {
          customerName: 'A Long Customer Business Name Enterprises Manufacturing wholesaler Retail distribution',
          invoicesTotal: 50000,
          paymentsTotal: 20000,
          returnsTotal: 0,
          closingBalance: 30000,
          reconciliationStatus: 'OUTSTANDING_DUE',
          aging: { days0To30: 10000, days31To60: 20000, days61To90: 0, days90Plus: 0 },
        },
      ],
      yearLabel: '2083/84',
    })
    assertValidPdf(doc)
  })

  it('Supplier Ledger — no crash, valid PDF', () => {
    const doc = generateSupplierLedgerPdf({
      business: mockBusiness,
      suppliers: [
        {
          supplierName: 'Supplier Import Export Trading House Limited',
          purchasesTotal: 80000,
          paymentsTotal: 30000,
          closingPayable: 50000,
          reconciliationStatus: 'OUTSTANDING_PAYABLE',
          aging: { days0To30: 20000, days31To60: 30000, days61To90: 0, days90Plus: 0 },
        },
      ],
      yearLabel: '2083/84',
    })
    assertValidPdf(doc)
  })

  it('Expense Report — no crash, valid PDF', () => {
    const doc = generateExpenseReportPdf({
      business: mockBusiness,
      expenses: [
        {
          $id: 'exp_1',
          $createdAt: '2026-08-01T00:00:00.000Z',
          $updatedAt: '2026-08-01T00:00:00.000Z',
          $collectionId: 'expenses',
          $databaseId: 'inventory_lite_db',
          $permissions: [],
          businessId: 'biz_123',
          title: 'Electricity bill for the month of Shrawan 2083 commercial store premises Kathmandu',
          category: 'Utilities',
          description: 'NEA bill',
          amount: 25000,
          date: '2026-08-01',
          createdBy: 'user_123',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      yearLabel: '2083/84',
    })
    assertValidPdf(doc)
  })

  it('Profit/COGS — no crash, valid PDF', () => {
    const doc = generateProfitCogsPdf({
      business: mockBusiness,
      profit: { totalRevenue: 100000, cogs: 60000, grossProfit: 40000, totalExpenses: 15000, netProfit: 25000, netMarginPercent: 25, totalSalesCount: 120 },
      monthly: [
        { label: 'Shrawan', revenue: 40000, expenses: 8000, profit: 32000 },
        { label: 'Bhadra', revenue: 60000, expenses: 7000, profit: 53000 },
      ],
      yearLabel: '2083/84',
    })
    assertValidPdf(doc)
  })

  it('Invoice — no crash, valid PDF with repeating narrow description wrapping', () => {
    const doc = generateInvoicePdf({
      business: mockBusiness,
      invoiceNumber: 'INV-2026-0001',
      date: '2026-08-01',
      dueDate: '2026-09-01',
      customer: { name: 'John Doe Trading Concern Sumit', phone: '9841000000', pan: '123456789' },
      items: [
        { name: 'A very long detailed product description that must wrap naturally across a narrow column', sku: 'SKU-0001', quantity: 10, price: 1500 },
        { name: 'Rice 25kg Basmati Premium Quality Long Grain', sku: 'SKU-0002', quantity: 5, price: 3200 },
      ],
      subtotal: 31000,
      discount: 1000,
      vatAmount: 3900,
      taxableAmount: 30000,
      total: 33900,
      paidAmount: 20000,
      dueAmount: 13900,
      paymentMethod: 'Cash',
      note: 'Thank you for your business. Please make payment within the due date.',
    })
    assertValidPdf(doc)
  })

  it('Stock Ledger — no crash on large dataset, valid PDF', () => {
    const movements: any[] = Array.from({ length: 200 }, (_, i) => ({
      $id: `mov_${i}`,
      $createdAt: '2026-08-01T10:00:00.000Z',
      $updatedAt: '2026-08-01T10:00:00.000Z',
      $collectionId: 'stock_movements',
      $databaseId: 'inventory_lite_db',
      $permissions: [],
      businessId: 'biz_123',
      productId: 'prod_1',
      type: i % 2 === 0 ? 'stock_in' : 'stock_out',
      quantity: i + 1,
      previousQuantity: i * 10,
      newQuantity: (i + 1) * 10,
      reason: 'Routine stock movement entry for reconciliation audit purposes that may exceed column width',
      createdBy: 'user_123',
      createdAt: '2026-08-01T10:00:00.000Z',
    }))
    const doc = generateStockLedgerPdf({
      business: mockBusiness,
      movements,
      products: [
        {
          ...(mockBusiness as any),
          $collectionId: 'products',
          businessId: 'biz_123',
          name: 'Wai Wai Noodles',
          sku: 'WAI-001',
          unit: 'pcs',
          purchasePrice: 20,
          sellingPrice: 25,
          stockQuantity: 100,
          isActive: true,
        },
      ],
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      generatedBy: 'Owner User',
    })
    assertValidPdf(doc)
    // Multi-page content should trigger the total-pages finalize without crashing.
    expect((doc as any).getNumberOfPages()).toBeGreaterThan(1)
  })
})
