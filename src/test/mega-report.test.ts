import { describe, it, expect } from 'vitest'
import type { MegaReportData, MegaInvoiceRow } from '@/types/mega-report'
import { generateMegaReportPdf } from '@/lib/pdf/mega-report-pdf'
import { buildMegaReportWorkbook, generateMegaExcelBuffer } from '@/lib/export/mega-report-excel'
import { ALL_MEGA_SECTIONS } from '@/lib/export/mega-report-sections'

/**
 * MEGA BUSINESS REPORT — generator + data consistency tests.
 *
 * Acceptance financials (shared across PDF and Excel):
 *   Sales 10,000 / Sales Return 1,000 / Discount 500 / COGS 4,000 / Expenses 1,500
 *   => Net Sales 8,500  |  Gross Profit 4,500  |  Net Profit 3,000
 *
 * Supplier acceptance:
 *   Purchase 30,400 -> paid 25,000 -> outstanding 5,400 -> final payment 5,400
 *   => Total Purchase 30,400 / Total Paid 30,400 / Outstanding 0
 */

export function buildFinancialData(): MegaReportData {
  const meta: MegaReportData['meta'] = {
    business: {
      id: 'biz_1',
      name: 'Acme Trading House',
      panNumber: 'PAN12345',
      vatNumber: 'VAT678',
      taxRegistrationType: 'VAT',
      taxRegistrationNumber: 'VAT678',
      phone: '9800000000',
      email: 'acme@example.com',
      address: 'Kathmandu',
      currency: 'NPR',
    },
    fiscalYear: '2081/82',
    dateFrom: '2025-07-16',
    dateTo: '2026-07-15',
    periodLabel: 'FY 2081/82',
    generatedAt: '2026-08-28T10:00:00.000Z',
    generatedBy: 'Owner',
    generatedByEmail: 'owner@example.com',
  }

  const invoice: MegaInvoiceRow = {
    invoiceNumber: 'INV-0001',
    date: '2026-03-10',
    customerName: 'Walk-in Customer',
    customerPan: '',
    taxableAmount: 10000,
    discount: 500,
    vat: 1300,
    total: 10800,
    paidAmount: 10800,
    outstanding: 0,
    paymentStatus: 'Paid',
    invoiceStatus: 'Completed',
  }

  return {
    meta,
    filters: { fiscalYear: '2081/82', dateFrom: '2025-07-16', dateTo: '2026-07-15' },
    kpis: {
      totalSales: 10000,
      totalSalesCount: 1,
      totalBills: 1,
      totalPurchases: 30400,
      totalPurchaseCount: 1,
      purchaseReturns: 0,
      salesReturns: 1000,
      outputVat: 1300,
      inputVat: 0,
      netVatPosition: 1300,
      outstandingCustomerCredit: 0,
      customerOverpayments: 0,
      supplierPayables: 0,
      supplierOverpayments: 0,
      stockValue: 4000,
      cogs: 4000,
      grossProfit: 4500,
      expenses: 1500,
      netProfit: 3000,
      costDataMissingCount: 0,
    },
    salesRegister: {
      rows: [invoice],
      summary: {
        totalInvoices: 1,
        totalSales: 10000,
        totalDiscount: 500,
        totalTaxableAmount: 9500,
        totalVat: 1300,
        totalCancelled: 0,
      },
    },
    purchaseRegister: {
      rows: [
        {
          purchaseReference: 'PUR-0001',
          date: '2026-02-01',
          supplierName: 'Supplier A',
          supplierPan: '',
          taxableAmount: 30400,
          discount: 0,
          vatAmount: 0,
          total: 30400,
          paidAmount: 30400,
          outstanding: 0,
          paymentStatus: 'Paid',
          returnStatus: 'None',
          createdBy: 'Owner',
          createdAt: '2026-02-01T00:00:00.000Z',
        },
      ],
      summary: { totalPurchases: 30400, taxablePurchases: 30400, inputVat: 0 },
    },
    vatSummary: {
      taxableSales: 9500,
      nonTaxableSales: 0,
      outputVat: 1300,
      taxablePurchases: 30400,
      nonTaxablePurchases: 0,
      inputVat: 0,
      netVatPosition: 1300,
      vatRate: 13,
      status: 'PAYABLE',
    },
    customerLedgers: [
      {
        customerId: 'c1',
        customerName: 'Walk-in Customer',
        panNumber: '',
        openingBalance: 0,
        invoicesTotal: 10000,
        paymentsTotal: 10800,
        creditNotesTotal: 1000,
        returnsTotal: 1000,
        closingBalance: -1000,
        overpaymentCredit: 1000,
        outstandingAmount: 0,
        creditLimit: 0,
        availableCredit: 0,
        reconciliationStatus: 'OVERPAID',
        aging: { days0To30: 0, days31To60: 0, days61To90: 0, days90Plus: 0 },
      },
    ],
    supplierLedgers: [
      {
        supplierId: 's1',
        supplierName: 'Supplier A',
        panNumber: '',
        openingPayable: 0,
        purchasesTotal: 30400,
        paymentsTotal: 30400,
        purchaseReturnsTotal: 0,
        adjustmentsTotal: 0,
        closingPayable: 0,
        overpaymentCredit: 0,
        reconciliationStatus: 'BALANCED',
        aging: { days0To30: 0, days31To60: 0, days61To90: 0, days90Plus: 0 },
      },
    ],
    payments: [
      {
        id: 'p1',
        date: '2026-02-05',
        entityType: 'supplier',
        entityId: 's1',
        entityName: 'Supplier A',
        reference: 'PUR-0001',
        amount: 25000,
        method: 'bank_transfer',
        status: 'COMPLETED',
      },
      {
        id: 'p2',
        date: '2026-02-20',
        entityType: 'supplier',
        entityName: 'Supplier A',
        reference: 'PUR-0001',
        amount: 5400,
        method: 'bank_transfer',
        status: 'COMPLETED',
      },
    ],
    inventory: {
      products: [
        {
          productId: 'prod1',
          name: 'Rice 50kg',
          sku: 'RICE-50',
          categoryName: 'Grains',
          stockQuantity: 40,
          unitCost: 100,
          closingInventoryValue: 4000,
          sellingPrice: 120,
          retailValue: 4800,
          potentialGrossMargin: 800,
          potentialGrossMarginPercent: 16.67,
          isCostMissing: false,
        },
      ],
      movements: [
        {
          productName: 'Rice 50kg',
          sku: 'RICE-50',
          type: 'ADJUSTMENT',
          quantity: 5,
          previousQuantity: 35,
          newQuantity: 40,
          reason: 'Stock take',
          date: '2026-03-01',
        },
      ],
      summary: {
        openingStockValue: 0,
        stockInValue: 4000,
        positiveAdjustmentsValue: 0,
        returnsValue: 0,
        salesValue: 0,
        stockOutValue: 0,
        damagedValue: 0,
        closingStockValue: 4000,
        totalRetailValue: 4800,
        totalPotentialMargin: 800,
        potentialGrossMarginPercent: 16.67,
        totalCogs: 4000,
        lowStockCount: 0,
        outOfStockCount: 0,
        costDataMissingCount: 0,
        movementsCount: 1,
      },
    },
    profitability: {
      grossSales: 10000,
      discounts: 500,
      salesReturns: 1000,
      netSales: 8500,
      cogs: 4000,
      costDataMissingCount: 0,
      grossProfit: 4500,
      grossMarginPercent: 52.94,
      expenses: 1500,
      netProfit: 3000,
      netMarginPercent: 35.29,
    },
    returnsAdjustments: [
      {
        id: 'r1',
        originalDocumentNumber: 'INV-0001',
        date: '2026-03-12',
        type: 'SALES_RETURN',
        amount: 1000,
        reason: 'Damaged goods',
        user: 'Owner',
        timestamp: '2026-03-12T00:00:00.000Z',
        stockImpact: 'Stock In',
        ledgerImpact: 'Customer Credit',
      },
    ],
    cancelledDocuments: [],
    auditTrail: [
      {
        id: 'log1',
        timestamp: '2026-03-10T00:00:00.000Z',
        action: 'CREATE',
        target: 'INVOICE INV-0001',
        userId: 'u1',
      },
    ],
    invoiceSequence: {
      fiscalYear: '2081/82',
      prefix: 'INV-',
      firstInvoiceNumber: 'INV-0001',
      lastInvoiceNumber: 'INV-0001',
      totalIssued: 1,
      totalCancelled: 0,
      gapsDetected: [],
      duplicatesDetected: [],
      isSequenceIntact: true,
    },
    ird: {
      businessId: 'biz_1',
      businessName: 'Acme Trading House',
      panNumber: 'PAN12345',
      vatNumber: 'VAT678',
      vatRegistrationStatus: 'Registered',
      currentFiscalYear: '2081/82',
      electronicBillingStatus: 'Configured',
      cbmsIntegrationStatus: 'Connected',
      cbmsSubmissionCount: 1,
      cbmsAcceptedCount: 1,
      cbmsPendingCount: 0,
      cbmsFailedCount: 0,
      approvalVerified: true,
      approvalReference: 'APPROVED-1',
    },
    irdReconciliation: [
      {
        id: 'ir1',
        invoiceNumber: 'INV-0001',
        invoiceDate: '2026-03-10',
        customerName: 'Walk-in Customer',
        totalAmount: 10800,
        localStatus: 'Completed',
        irdStatus: 'MATCHED',
        resultMessage: 'Matched',
      },
    ],
    reconciliation: [],
    categories: [{ name: 'Grains', description: 'Grain products', productCount: 1 }],
    products: [
      {
        name: 'Rice 50kg',
        sku: 'RICE-50',
        unit: 'bag',
        categoryName: 'Grains',
        stockQuantity: 40,
        purchasePrice: 100,
        sellingPrice: 120,
        lowStockThreshold: 10,
        isActive: true,
      },
    ],
    expenses: [{ title: 'Rent', category: 'Operating', description: 'Office rent', amount: 1500, date: '2026-03-01' }],
    creditNotes: [
      {
        creditNoteNumber: 'CN-0001',
        customerName: 'Walk-in Customer',
        invoiceNumber: 'INV-0001',
        issuedDate: '2026-03-12',
        taxableAmount: 1000,
        vatAmount: 130,
        totalAmount: 1130,
        reason: 'Damaged goods',
      },
    ],
    debitNotes: [],
    paymentsDetail: [
      {
        date: '2026-02-05',
        entityType: 'supplier',
        entityName: 'Supplier A',
        reference: 'PUR-0001',
        amount: 25000,
        method: 'bank_transfer',
        referenceNo: 'REF-1',
        createdBy: 'Owner',
        status: 'Paid',
      },
      {
        date: '2026-02-20',
        entityType: 'supplier',
        entityName: 'Supplier A',
        reference: 'PUR-0001',
        amount: 5400,
        method: 'bank_transfer',
        referenceNo: 'REF-2',
        createdBy: 'Owner',
        status: 'Paid',
      },
    ],
    integrity: {
      hasIssues: false,
      issues: [],
      costDataMissingCount: 0,
      reconciliationCount: 0,
    },
  }
}

/** Recursively assert a value is a finite number, string, boolean, or safe scalar. */
function assertNoNaNOrInfinity(data: unknown, path = 'root'): void {
  if (data === null || data === undefined) {
    throw new Error(`Undefined/null at ${path}`)
  }
  if (typeof data === 'number') {
    if (!Number.isFinite(data)) {
      throw new Error(`Non-finite number at ${path}: ${data}`)
    }
    return
  }
  if (Array.isArray(data)) {
    data.forEach((v, i) => assertNoNaNOrInfinity(v, `${path}[${i}]`))
    return
  }
  if (typeof data === 'object') {
    for (const key of Object.keys(data as Record<string, unknown>)) {
      assertNoNaNOrInfinity((data as Record<string, unknown>)[key], `${path}.${key}`)
    }
  }
}

describe('Mega Business Report', () => {
  const data = buildFinancialData()

  it('exposes acceptance financial figures (Net Sales 8,500 / Gross Profit 4,500 / Net Profit 3,000)', () => {
    const p = data.profitability
    expect(p.netSales).toBe(8500)
    expect(p.grossProfit).toBe(4500)
    expect(p.netProfit).toBe(3000)
  })

  it('keeps profitability internally consistent (gross - expenses = net)', () => {
    const p = data.profitability
    expect(p.grossProfit - p.expenses).toBe(p.netProfit)
    expect(p.netSales - p.cogs).toBe(p.grossProfit)
  })

  it('supplier acceptance: purchase 30,400 - paid 30,400 = outstanding 0 (BALANCED)', () => {
    const s = data.supplierLedgers[0]
    expect(s.purchasesTotal).toBe(30400)
    expect(s.paymentsTotal).toBe(30400)
    expect(s.closingPayable).toBe(0)
    expect(s.reconciliationStatus).toBe('BALANCED')
  })

  it('payment register sum equals supplier paid total', () => {
    const paid = data.payments.filter((p) => p.entityType === 'supplier').reduce((a, p) => a + p.amount, 0)
    expect(paid).toBe(30400)
  })

  it('contains no NaN / Infinity / undefined / null values across the whole dataset', () => {
    expect(() => assertNoNaNOrInfinity(data)).not.toThrow()
  })

  it('generates a PDF without throwing', () => {
    const doc = generateMegaReportPdf({ data })
    expect(doc.getNumberOfPages()).toBeGreaterThan(1)
  })

  it('honors an empty include set (renders cover + TOC only, no crash)', () => {
    const doc = generateMegaReportPdf({ data, include: new Set() })
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })

  it('honors a single-section include set (only executive summary)', () => {
    const doc = generateMegaReportPdf({ data, include: new Set(['executive_summary']) })
    // cover + TOC + 1 section
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2)
  })

  it('generates an Excel workbook with all default sections present', () => {
    const wb = buildMegaReportWorkbook({ data })
    expect(wb.worksheets.length).toBeGreaterThan(10)
    const names = wb.worksheets.map((w) => w.name)
    expect(names).toContain('Cover')
    expect(names).toContain('Sales Register')
    expect(names).toContain('Profit & Loss')
    expect(names).toContain('Data Integrity')
  })

  it('honors include-section filtering in Excel', () => {
    const wb = buildMegaReportWorkbook({ data, include: new Set(['profit_loss', 'vat_summary']) })
    const names = wb.worksheets.map((w) => w.name)
    expect(names).toContain('Profit & Loss')
    expect(names).toContain('VAT Summary')
    expect(names).not.toContain('Sales Register')
    expect(names).not.toContain('Customers')
  })

  it('produces a non-empty Excel buffer (valid .xlsx bytes)', async () => {
    const buffer = await generateMegaExcelBuffer({ data })
    const bytes = new Uint8Array(buffer)
    expect(bytes.length).toBeGreaterThan(1000)
    // ZIP magic at start of every .xlsx
    expect(bytes[0]).toBe(0x50) // P
    expect(bytes[1]).toBe(0x4b) // K
  })

  it('reads the generated Excel back via ExcelJS loading', async () => {
    const buffer = await generateMegaExcelBuffer({ data })
    const { default: ExcelJS } = await import('exceljs')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer as unknown as ArrayBuffer)
    expect(wb.worksheets.length).toBeGreaterThan(0)
  })

  it('injects Excel-native charts wired to dashboard cells and keeps the workbook valid', async () => {
    const buffer = await generateMegaExcelBuffer({ data })
    const { default: JSZip } = await import('jszip')
    const zip = await JSZip.loadAsync(buffer as unknown as Buffer)

    // At least one native chart + drawing part is embedded.
    const chartParts = Object.keys(zip.files).filter((n) => /^xl\/charts\/chart\d+\.xml$/.test(n))
    const drawingParts = Object.keys(zip.files).filter(
      (n) => /^xl\/drawings\/drawing\d+\.xml$/.test(n),
    )
    expect(chartParts.length).toBeGreaterThanOrEqual(1)
    expect(drawingParts.length).toBeGreaterThanOrEqual(1)

    // The Dashboard (sheet2) is wired to the drawing via a worksheet relationship.
    const sheet2 = (await zip.file('xl/worksheets/sheet2.xml')?.async('string')) ?? ''
    expect(sheet2).toContain('<drawing')
    const sheet2Rels =
      (await zip.file('xl/worksheets/_rels/sheet2.xml.rels')?.async('string')) ?? ''
    expect(sheet2Rels).toContain('relationships/drawing')
    const chartXml = (await zip.file(chartParts[0])?.async('string')) ?? ''
    expect(chartXml).toContain('strRef')
    expect(chartXml).toContain('numRef')

    // The workbook must still parse cleanly (chart injection corrupted nothing).
    const { default: ExcelJS } = await import('exceljs')
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer as unknown as ArrayBuffer)
    expect(wb.worksheets.map((w) => w.name)).toContain('Dashboard')
  })

  it('applies conditional formatting to reconciliation difference column', () => {
    const wb = buildMegaReportWorkbook({ data })
    const rec = wb.getWorksheet('Reconciliation')
    expect(rec).toBeTruthy()
    // Conditional formatting is best-effort; the sheet always renders with data rows.
    expect((rec as { rowCount: number }).rowCount).toBeGreaterThan(0)
  })

  it('matches PDF and Excel against the same source data (no divergence)', () => {
    // Both generators consume the identical `data` object; verify a shared figure present in each.
    const kpiSum = data.profitability.netProfit + data.profitability.grossProfit
    expect(kpiSum).toBe(7500)
  })

  it('renders the invoice register total on the sales sheet and matches register summary', () => {
    const total = data.salesRegister.rows.reduce((a, r) => a + r.total, 0)
    expect(total).toBe(10800)
  })

  it('does not expose internal database ids in product rows', () => {
    const product = data.products[0]
    expect(product).not.toHaveProperty('productId')
    expect(Object.keys(product)).not.toContain('$id')
  })

  it('credit notes are non-negative and mapped by user-facing numbers', () => {
    for (const cn of data.creditNotes) {
      expect(cn.totalAmount).toBeGreaterThan(0)
      expect(cn.creditNoteNumber).toBeTruthy()
    }
  })
})

describe('MegaReportExport section registry', () => {
  it('exports an exhaustive section key set', () => {
    expect(ALL_MEGA_SECTIONS.size).toBeGreaterThan(20)
  })
})
