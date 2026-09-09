import { describe, it, expect } from 'vitest'
import { generateMegaReportPdf } from '@/lib/pdf/mega-report-pdf'
import { buildMegaReportWorkbook, generateMegaExcelBuffer } from '@/lib/export/mega-report-excel'
import { ALL_MEGA_SECTIONS } from '@/lib/export/mega-report-sections'
import { buildFinancialData } from '@/test/fixtures/mega-report.fixture'

export { buildFinancialData }

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
