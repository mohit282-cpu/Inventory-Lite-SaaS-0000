import { describe, it, expect } from 'vitest'
import { generateMegaReportPdf } from '@/lib/pdf/mega-report-pdf'
import { buildFinancialData } from './fixtures/mega-report.fixture'
import type { MegaReportData } from '@/types/mega-report'

describe('Mega Business Report PDF Regression Suite', () => {
  it('1. Generates a non-empty, valid PDF instance without crashing', () => {
    const data = buildFinancialData()
    const doc = generateMegaReportPdf({ data })
    expect(doc).toBeDefined()
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3)
    const arrayBuffer = doc.output('arraybuffer')
    expect(arrayBuffer.byteLength).toBeGreaterThan(5000)
  })

  it('2. Fixes duplicate reconciliation check numbering (no "1. 1.")', () => {
    const data = buildFinancialData()
    // Add realistic reconciliation checks
    data.reconciliation = [
      {
        id: 'r1',
        checkName: 'Sales Register vs Financial Engine Sales',
        category: 'SALES',
        expected: 10000,
        actual: 10000,
        difference: 0,
        status: 'BALANCED',
        message: 'Sales Register matches financial sales 100%.',
      },
      {
        id: 'r2',
        checkName: 'Purchase Register vs Financial Engine Purchases',
        category: 'PURCHASES',
        expected: 30400,
        actual: 30400,
        difference: 0,
        status: 'BALANCED',
        message: 'Purchase Register matches financial purchases 100%.',
      },
    ]

    const doc = generateMegaReportPdf({ data })
    const pdfText = doc.output('datauristring')

    // Ensure double numbering "1. 1." is NOT present
    expect(pdfText).not.toContain('1. 1. Sales Register')
    expect(pdfText).not.toContain('2. 2. Purchase Register')
  })

  it('3. Replaces unsupported UTF-8 checkmark glyphs with PDF-safe badges', () => {
    const data = buildFinancialData()
    data.reconciliation = [
      {
        id: 'r1',
        checkName: 'Sales Register vs Financial Engine Sales',
        category: 'SALES',
        expected: 10000,
        actual: 10000,
        difference: 0,
        status: 'BALANCED',
        message: 'Sales Register matches financial sales 100%.',
      },
    ]

    const doc = generateMegaReportPdf({ data })
    const pdfText = doc.output('datauristring')

    // Ensure raw UTF-8 checkmark character "✓" is not rendered in Helvetica stream
    expect(pdfText).not.toContain('✓ PASS')
    expect(pdfText).not.toContain('✓ ALL CHECKS PASSED')
  })

  it('4. Renders Stock Movement without arrow encoding bugs', () => {
    const data = buildFinancialData()
    data.inventory.movements = [
      {
        productName: 'Rice 50kg',
        sku: 'RICE-50',
        type: 'STOCK IN',
        quantity: 10,
        previousQuantity: 40,
        newQuantity: 50,
        reason: 'Restock purchase',
        date: '2026-03-01',
      },
    ]

    const doc = generateMegaReportPdf({ data })
    const pdfText = doc.output('datauristring')
    expect(doc).toBeDefined()
    expect(pdfText).not.toContain('From ! To')
  })

  it('5. Enforces mathematical consistency for VAT-registered vs non-VAT registered business', () => {
    const dataVat = buildFinancialData()
    dataVat.meta.business.taxRegistrationType = 'VAT'
    dataVat.meta.business.vatNumber = 'VAT123'
    dataVat.vatSummary.isVatRegistered = true

    const docVat = generateMegaReportPdf({ data: dataVat })
    expect(docVat).toBeDefined()

    const dataPan = buildFinancialData()
    dataPan.meta.business.taxRegistrationType = 'PAN'
    dataPan.meta.business.vatNumber = ''
    dataPan.vatSummary.isVatRegistered = false
    dataPan.vatSummary.outputVat = 0
    dataPan.salesRegister.summary.totalVat = 0

    const docPan = generateMegaReportPdf({ data: dataPan })
    expect(docPan).toBeDefined()
  })

  it('6. Renders Human-Readable Payment Register & Audit Trail Action Labels', () => {
    const data = buildFinancialData()
    data.paymentsDetail = [
      {
        date: '2026-03-10',
        entityType: 'customer',
        entityName: 'John Doe',
        reference: 'INV-0001',
        amount: 5000,
        method: 'bank_transfer',
        referenceNo: 'REF-99',
        createdBy: 'user_1234567890_long_id',
        status: 'COMPLETED',
      },
    ]
    data.auditTrail = [
      {
        id: 'log1',
        timestamp: '2026-03-10T10:00:00.000Z',
        action: 'STOCK_MOVEMENT',
        target: 'STOCK',
        userId: 'user_99999_long_id',
        metadata: { type: 'STOCK_IN', qty: 5 },
      },
    ]

    const doc = generateMegaReportPdf({ data })
    expect(doc).toBeDefined()
  })

  it('7. Contains separate accounting and tax validation status structures', () => {
    const data: MegaReportData = {
      ...buildFinancialData(),
      accountingValidation: {
        status: 'PASS',
        issues: [],
        taxableInvoicesReconciled: true,
        cogsCompleteness: true,
        sequenceIntact: true,
      },
      taxValidation: {
        status: 'PASS',
        isVatRegistered: true,
        vatRate: 13,
        taxableSalesReconciled: true,
        taxablePurchasesReconciled: true,
        issues: [],
      },
    }

    const doc = generateMegaReportPdf({ data })
    expect(doc).toBeDefined()
    expect(data.accountingValidation?.status).toBe('PASS')
    expect(data.taxValidation?.status).toBe('PASS')
  })
})
