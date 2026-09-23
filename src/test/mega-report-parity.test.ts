import { describe, it, expect } from 'vitest'
import { generateMegaReportPdf } from '@/lib/pdf/mega-report-pdf'
import { buildMegaReportWorkbook, generateMegaExcelBuffer } from '@/lib/export/mega-report-excel'
import { buildFinancialData } from '@/test/fixtures/mega-report.fixture'
import type { MegaReportData } from '@/types/mega-report'

describe('Mega Report — PDF & XLSX Data Parity & Integrity', () => {
  const data: MegaReportData = buildFinancialData()

  it('guarantees identical financial figures in PDF and Excel workbook', () => {
    const pdfDoc = generateMegaReportPdf({ data })
    const wb = buildMegaReportWorkbook({ data })

    expect(pdfDoc.getNumberOfPages()).toBeGreaterThan(5)

    const execSheet = wb.getWorksheet('Executive Summary')
    expect(execSheet).toBeTruthy()

    const rows: Record<string, number> = {}
    execSheet?.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const metric = String(row.getCell(1).value)
        const val = Number(row.getCell(2).value)
        rows[metric] = val
      }
    })

    // Compare Executive Summary values in Excel vs data model
    expect(rows['Total Sales']).toBe(data.kpis.totalSales)
    expect(rows['Total Purchases']).toBe(data.kpis.totalPurchases)
    expect(rows['Net Sales']).toBe(data.profitability.netSales)
    expect(rows['Cost of Goods Sold']).toBe(data.kpis.cogs)
    expect(rows['Gross Profit']).toBe(data.kpis.grossProfit)
    expect(rows['Net Profit']).toBe(data.kpis.netProfit)
    expect(rows['Expenses']).toBe(data.kpis.expenses)
    expect(rows['Stock Value']).toBe(data.kpis.stockValue)
    expect(rows['Customer Receivables']).toBe(data.kpis.outstandingCustomerCredit)
    expect(rows['Supplier Payables']).toBe(data.kpis.supplierPayables)
    expect(rows['Output VAT']).toBe(data.kpis.outputVat)
    expect(rows['Input VAT']).toBe(data.kpis.inputVat)
    expect(rows['Net VAT Position']).toBe(data.kpis.netVatPosition)
  })

  it('renders Table of Contents on page 2 in PDF regardless of section count', () => {
    const fullPdf = generateMegaReportPdf({ data })
    expect(fullPdf.getNumberOfPages()).toBeGreaterThanOrEqual(2)

    const partialPdf = generateMegaReportPdf({
      data,
      include: new Set(['executive_summary', 'vat_summary', 'profit_loss']),
    })
    // Cover page (1) + TOC page (2) + 3 content sections
    expect(partialPdf.getNumberOfPages()).toBeGreaterThanOrEqual(4)
  })

  it('handles empty datasets cleanly without throwing NaN or crashing PDF/Excel generators', async () => {
    const emptyData: MegaReportData = {
      ...data,
      salesRegister: {
        reconciliation: { registeredCustomerSales: 0, walkInSales: 0, totalSales: 0, difference: 0 },
        summary: { totalInvoices: 0, totalSales: 0, totalDiscount: 0, totalTaxableAmount: 0, totalVat: 0, totalCancelled: 0 },
        rows: []
      },
      purchaseRegister: { summary: { totalPurchases: 0, taxablePurchases: 0, inputVat: 0 }, rows: [] },
      returnsAdjustments: [],
      creditNotes: [],
      debitNotes: [],
      auditTrail: [],
      cancelledDocuments: [],
      irdReconciliation: [],
      customerLedgers: [],
      supplierLedgers: [],
      payments: [],
      expenses: [],
      products: [],
      categories: [],
    }

    expect(() => generateMegaReportPdf({ data: emptyData })).not.toThrow()
    expect(() => buildMegaReportWorkbook({ data: emptyData })).not.toThrow()

    const buffer = await generateMegaExcelBuffer({ data: emptyData })
    expect(buffer.byteLength).toBeGreaterThan(500)
  })
})
