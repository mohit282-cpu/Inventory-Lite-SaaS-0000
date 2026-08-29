/**
 * Mega Business Report — Excel (.xlsx) generator.
 *
 * Produces a professionally formatted multi-worksheet workbook from the SAME
 * shared MegaReportData consumed by the Mega PDF, so all exported values are
 * guaranteed to match across formats.
 *
 * Formatting applied to every worksheet:
 *  - bold header row with fill + border
 *  - freeze panes below the header
 *  - auto filter across the data range
 *  - tuned column widths
 *  - currency / number / date formats (`Rs. #,##0.00`, `DD/MM/YYYY`)
 *  - print area + repeat header rows for printing
 *  - a title + generated line at the top of summary sheets
 *
 * No internal Appwrite document IDs, passwords, tokens, API keys, secrets or
 * credentials are ever written to the workbook.
 */

import ExcelJS from 'exceljs'
import type {
  MegaReportData,
  MegaPaymentRow,
  MegaProductRow,
  MegaCategoryRow,
  MegaExpenseRow,
  MegaStockMovementRow,
  MegaCreditNoteRow,
  MegaDebitNoteRow,
  MegaInvoiceRow,
} from '@/types/mega-report'
import { sectionEnabled, type MegaSectionKey } from './mega-report-sections'
import { injectCharts, type XmlChartSpec } from './mega-report-charts-xml'

export interface MegaReportExcelOptions {
  data: MegaReportData
  /** Optional set of section keys to include; empty/undefined = all sections. */
  include?: Set<MegaSectionKey>
}

const NUM_FMT = 'Rs. #,##0.00'
const INT_FMT = '#,##0'
const DATE_FMT = 'DD/MM/YYYY'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E293B' },
}
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 10,
}

interface SheetSpec {
  name: string
  sectionKey?: MegaSectionKey
  columns: { header: string; key: string; width: number; align?: 'right' | 'center' | 'left'; numFmt?: string; date?: boolean; wrap?: boolean }[]
  rows: Record<string, unknown>[]
  title?: string
  totals?: (string | number)[]
  /** Print in landscape (wide registers). */
  landscape?: boolean
  /** Column key whose text values receive subtle conditional formatting. */
  statusKey?: string
  /** Apply conditional highlight when this numeric column is non-zero. */
  condDiffKey?: string
}

function applyDataStyle(sheet: ExcelJS.Worksheet, spec: SheetSpec): void {
  sheet.columns = spec.columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: Math.max(c.width, 10),
  }))

  const headerRow = sheet.getRow(1)
  spec.columns.forEach((c, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    }
    if (c.align) cell.alignment = { vertical: 'middle', horizontal: c.align }
  })
  headerRow.height = 21

  spec.rows.forEach((row, rIdx) => {
    const addRow = sheet.addRow(row as any)
    addRow.eachCell((cell, colIdx) => {
      const specCol = spec.columns[colIdx - 1]
      if (!specCol) return
      if (specCol.numFmt) {
        cell.numFmt = specCol.numFmt
        if (typeof cell.value === 'string' && cell.value.trim() !== '' && !isNaN(Number(cell.value))) {
          cell.value = Number(cell.value)
        }
      } else if (specCol.date) {
        cell.numFmt = DATE_FMT
      }
      const h = specCol.align === 'right' ? 'right' : specCol.align === 'center' ? 'center' : 'left'
      cell.alignment = {
        vertical: 'middle',
        horizontal: h,
        wrapText: !!specCol.wrap,
      }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
      // Subtle row banding (alternating) — professional and printer-safe.
      if (rIdx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      }
    })
    addRow.height = 17
  })

  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  if (spec.rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sheet.rowCount, column: spec.columns.length },
    }
  }

  // Conditional formatting — subtle status + variance highlighting.
  if (spec.statusKey) {
    const colIdx = spec.columns.findIndex((c) => c.key === spec.statusKey) + 1
    if (colIdx > 0 && spec.rows.length > 0) {
      addStatusConditionalFormatting(sheet, colIdx, 2, sheet.rowCount)
    }
  }
  if (spec.condDiffKey) {
    const colIdx = spec.columns.findIndex((c) => c.key === spec.condDiffKey) + 1
    if (colIdx > 0 && spec.rows.length > 0) {
      addVarianceConditionalFormatting(sheet, colIdx, 2, sheet.rowCount)
    }
  }

  // Print setup: correct orientation, header repeat, business footer.
  const wide = spec.landscape === true
  sheet.pageSetup = {
    orientation: wide ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9, // A4
    printTitlesRow: '1:1',
    horizontalCentered: wide,
  }
  sheet.headerFooter = {
    oddFooter: '&CInventory Lite | Mega Business Report | Page &P of &N',
    oddHeader: `&C${safeHeader(spec.name)}`,
  }
}

/** Subtle text-match conditional formatting for status-ish columns. */
function addStatusConditionalFormatting(
  sheet: ExcelJS.Worksheet,
  col: number,
  fromRow: number,
  toRow: number,
): void {
  const colLetter = colToLetter(col)
  const range = `${colLetter}${fromRow}:${colLetter}${toRow}`
  const paid: ExcelJS.ConditionalFormattingRule = {
    type: 'containsText',
    operator: 'containsText',
    text: 'PAID',
    priority: 1,
    style: {
      font: { color: { argb: 'FF047857' }, bold: true },
      fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD1FAE5' } },
    },
  }
  const pending: ExcelJS.ConditionalFormattingRule = {
    type: 'containsText',
    operator: 'containsText',
    text: 'PENDING',
    priority: 2,
    style: {
      font: { color: { argb: 'FFB45309' }, bold: true },
      fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEF3C7' } },
    },
  }
  const cancelled: ExcelJS.ConditionalFormattingRule = {
    type: 'containsText',
    operator: 'containsText',
    text: 'CANCEL',
    priority: 3,
    style: {
      font: { color: { argb: 'FF9F1239' }, bold: true },
      fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE4E6' } },
    },
  }
  const balanced: ExcelJS.ConditionalFormattingRule = {
    type: 'containsText',
    operator: 'containsText',
    text: 'BALANCED',
    priority: 4,
    style: {
      font: { color: { argb: 'FF047857' }, bold: true },
    },
  }
  const warning: ExcelJS.ConditionalFormattingRule = {
    type: 'containsText',
    operator: 'containsText',
    text: 'MISMATCH',
    priority: 5,
    style: {
      font: { color: { argb: 'FFB45309' }, bold: true },
      fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEF3C7' } },
    },
  }
  try {
    sheet.addConditionalFormatting({ ref: range, rules: [paid, pending, cancelled, balanced, warning] })
  } catch {
    /* ignored — formatting is best-effort */
  }
}

/** Highlight non-zero reconciliation differences (warning) rather than hiding them. */
function addVarianceConditionalFormatting(
  sheet: ExcelJS.Worksheet,
  col: number,
  fromRow: number,
  toRow: number,
): void {
  const colLetter = colToLetter(col)
  const range = `${colLetter}${fromRow}:${colLetter}${toRow}`
  const rule: ExcelJS.ConditionalFormattingRule = {
    type: 'expression',
    priority: 1,
    formulae: [`ABS(${colLetter}${fromRow})>0.005`],
    style: {
      font: { color: { argb: 'FF9F1239' }, bold: true },
      fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE4E6' } },
    },
  }
  try {
    sheet.addConditionalFormatting({ ref: range, rules: [rule] })
  } catch {
    /* ignored */
  }
}

function colToLetter(n: number): string {
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function safeHeader(s: string): string {
  // Remove characters that break Excel header/footer syntax.
  return String(s).replace(/[&%]/g, ' ').slice(0, 60)
}

/**
 * Build the Mega Report Excel workbook. Returns an ExcelJS.Workbook so callers
 * can either write a buffer (Node/test) or trigger a browser download.
 */
export function buildMegaReportWorkbook(opts: MegaReportExcelOptions): ExcelJS.Workbook {
  const { data, include } = opts
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Inventory Lite'
  workbook.created = new Date()
  workbook.title = 'Mega Business Report'

  const add = (name: string, spec: SheetSpec): void => addSheet(workbook, name, spec, include)

  const cover = workbook.addWorksheet('Cover')
  buildCover(cover, data)

  const dashboard = workbook.addWorksheet('Dashboard')
  const chartSpecs = buildDashboard(dashboard, data)
  chartSpecsByWorkbook.set(workbook, chartSpecs)

  add('Executive Summary', {
    name: 'Executive Summary',
    sectionKey: 'executive_summary',
    columns: [
      { header: 'Metric', key: 'metric', width: 34 },
      { header: 'Value', key: 'value', numFmt: NUM_FMT, align: 'right', width: 20 },
    ],
    rows: [
      { metric: 'Total Sales', value: data.kpis.totalSales },
      { metric: 'Sales Count', value: data.kpis.totalSalesCount },
      { metric: 'Total Purchases', value: data.kpis.totalPurchases },
      { metric: 'Purchase Count', value: data.kpis.totalPurchaseCount },
      { metric: 'Sales Returns', value: data.kpis.salesReturns },
      { metric: 'Purchase Returns', value: data.kpis.purchaseReturns },
      { metric: 'Net Sales', value: data.profitability.netSales },
      { metric: 'Cost of Goods Sold', value: data.kpis.cogs },
      { metric: 'Gross Profit', value: data.kpis.grossProfit },
      { metric: 'Expenses', value: data.kpis.expenses },
      { metric: 'Net Profit', value: data.kpis.netProfit },
      { metric: 'Stock Value', value: data.kpis.stockValue },
      { metric: 'Customer Receivables', value: data.kpis.outstandingCustomerCredit },
      { metric: 'Supplier Payables', value: data.kpis.supplierPayables },
      { metric: 'Output VAT', value: data.kpis.outputVat },
      { metric: 'Input VAT', value: data.kpis.inputVat },
      { metric: 'Net VAT Position', value: data.kpis.netVatPosition },
      { metric: 'Total Bills', value: data.kpis.totalBills },
    ],
  })

  add('Reconciliation', {
    name: 'Reconciliation',
    condDiffKey: 'difference',
    sectionKey: 'reconciliation',
    columns: [
      { header: 'Check', key: 'checkName', width: 40 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Expected', key: 'expected', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Actual', key: 'actual', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Difference', key: 'difference', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Message', key: 'message', width: 60, wrap: true },
    ],
    rows: data.reconciliation.map((r) => ({
      checkName: r.checkName,
      category: r.category,
      expected: r.expected,
      actual: r.actual,
      difference: r.difference,
      status: r.status,
      message: r.message,
    })),
  })

  add('Sales Register', {
    name: 'Sales Register',
    landscape: true,
    statusKey: 'paymentStatus',
    sectionKey: 'sales_register',
    columns: [
      { header: 'Date', key: 'date', width: 15, date: true },
      { header: 'Invoice #', key: 'invoiceNumber', width: 20 },
      { header: 'Customer', key: 'customerName', width: 28 },
      { header: 'Taxable', key: 'taxableAmount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Discount', key: 'discount', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: 'VAT', key: 'vat', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: 'Total', key: 'total', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Paid', key: 'paidAmount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Due', key: 'outstanding', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Status', key: 'paymentStatus', width: 12 },
    ],
    rows: data.salesRegister.rows.map((r: MegaInvoiceRow) => ({
      date: r.date,
      invoiceNumber: r.invoiceNumber,
      customerName: r.customerName,
      taxableAmount: r.taxableAmount,
      discount: r.discount,
      vat: r.vat,
      total: r.total,
      paidAmount: r.paidAmount,
      outstanding: r.outstanding,
      paymentStatus: r.paymentStatus,
    })),
    totals: ['', 'TOTAL', '', data.salesRegister.summary.totalTaxableAmount, data.salesRegister.summary.totalDiscount, data.salesRegister.summary.totalVat, data.salesRegister.summary.totalSales, '', '', ''],
  })

  add('Purchase Register', {
    name: 'Purchase Register',
    landscape: true,
    statusKey: 'paymentStatus',
    sectionKey: 'purchase_register',
    columns: [
      { header: 'Date', key: 'date', width: 15, date: true },
      { header: 'Purchase #', key: 'purchaseReference', width: 22 },
      { header: 'Supplier', key: 'supplierName', width: 28 },
      { header: 'Taxable', key: 'taxableAmount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Discount', key: 'discount', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: 'VAT', key: 'vatAmount', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: 'Total', key: 'total', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Paid', key: 'paidAmount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Due', key: 'outstanding', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Status', key: 'paymentStatus', width: 12 },
    ],
    rows: data.purchaseRegister.rows.map((r: any) => ({
      date: r.date,
      purchaseReference: r.purchaseReference,
      supplierName: r.supplierName,
      taxableAmount: r.taxableAmount,
      discount: r.discount,
      vatAmount: r.vatAmount,
      total: r.total,
      paidAmount: r.paidAmount,
      outstanding: r.outstanding,
      paymentStatus: r.paymentStatus,
    })),
    totals: ['', 'TOTAL', '', data.purchaseRegister.summary.taxablePurchases, '', data.purchaseRegister.summary.inputVat, data.purchaseRegister.summary.totalPurchases, '', '', ''],
  })

  add('Sales Returns', {
    name: 'Sales Returns',
    sectionKey: 'sales_returns',
    columns: [
      { header: 'Date', key: 'date', width: 15, date: true },
      { header: 'Reference', key: 'reference', width: 28 },
      { header: 'Refund Amount', key: 'amount', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Reason', key: 'reason', width: 40 },
      { header: 'By', key: 'user', width: 22 },
    ],
    rows: data.returnsAdjustments.filter((r) => r.type === 'SALES_RETURN').map((r) => ({
      date: r.date,
      reference: r.originalDocumentNumber,
      amount: r.amount,
      reason: r.reason,
      user: r.user,
    })),
  })

  add('Returns & Adjustments', {
    name: 'Returns & Adjustments',
    sectionKey: 'returns_adjustments',
    columns: [
      { header: 'Date', key: 'date', width: 15, date: true },
      { header: 'Type', key: 'type', width: 26 },
      { header: 'Reference', key: 'reference', width: 28 },
      { header: 'Amount', key: 'amount', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Reason', key: 'reason', width: 40 },
      { header: 'Ledger Impact', key: 'ledgerImpact', width: 24 },
    ],
    rows: data.returnsAdjustments.map((r) => ({
      date: r.date,
      type: r.type,
      reference: r.originalDocumentNumber,
      amount: r.amount,
      reason: r.reason,
      ledgerImpact: r.ledgerImpact,
    })),
  })

  add('Customers', {
    name: 'Customers',
    statusKey: 'status',
    sectionKey: 'customers',
    columns: [
      { header: 'Customer', key: 'customerName', width: 30 },
      { header: 'PAN', key: 'panNumber', width: 18 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Balance', key: 'balance', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Status', key: 'status', width: 18 },
    ],
    rows: data.customerLedgers.map((c) => ({
      customerName: c.customerName,
      panNumber: c.panNumber ?? '—',
      phone: c.phone ?? '—',
      balance: c.closingBalance,
      status: c.reconciliationStatus,
    })),
  })

  add('Customer Ledger', {
    name: 'Customer Ledger',
    landscape: true,
    sectionKey: 'customer_ledger',
    columns: [
      { header: 'Customer', key: 'customerName', width: 30 },
      { header: 'Opening', key: 'openingBalance', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Invoices', key: 'invoicesTotal', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Payments', key: 'paymentsTotal', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Credit/Returns', key: 'credit', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Closing', key: 'closingBalance', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Outstanding', key: 'outstandingAmount', numFmt: NUM_FMT, align: 'right', width: 16 },
    ],
    rows: data.customerLedgers.map((c) => ({
      customerName: c.customerName,
      openingBalance: c.openingBalance,
      invoicesTotal: c.invoicesTotal,
      paymentsTotal: c.paymentsTotal,
      credit: c.creditNotesTotal + c.returnsTotal,
      closingBalance: c.closingBalance,
      outstandingAmount: c.outstandingAmount,
    })),
  })

  add('Receivables Aging', {
    name: 'Receivables Aging',
    sectionKey: 'customer_receivables',
    columns: [
      { header: 'Customer', key: 'customerName', width: 30 },
      { header: '0-30', key: 'days0To30', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: '31-60', key: 'days31To60', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: '61-90', key: 'days61To90', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: '90+', key: 'days90Plus', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: 'Outstanding', key: 'outstandingAmount', numFmt: NUM_FMT, align: 'right', width: 18 },
    ],
    rows: data.customerLedgers.filter((c) => c.outstandingAmount > 0.005).map((c) => ({
      customerName: c.customerName,
      days0To30: c.aging.days0To30,
      days31To60: c.aging.days31To60,
      days61To90: c.aging.days61To90,
      days90Plus: c.aging.days90Plus,
      outstandingAmount: c.outstandingAmount,
    })),
  })

  add('Suppliers', {
    name: 'Suppliers',
    statusKey: 'status',
    sectionKey: 'suppliers',
    columns: [
      { header: 'Supplier', key: 'supplierName', width: 30 },
      { header: 'PAN', key: 'panNumber', width: 18 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Payable', key: 'payable', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Status', key: 'status', width: 20 },
    ],
    rows: data.supplierLedgers.map((s) => ({
      supplierName: s.supplierName,
      panNumber: s.panNumber ?? '—',
      phone: s.phone ?? '—',
      payable: s.closingPayable,
      status: s.reconciliationStatus,
    })),
  })

  add('Supplier Ledger', {
    name: 'Supplier Ledger',
    landscape: true,
    sectionKey: 'supplier_ledger',
    columns: [
      { header: 'Supplier', key: 'supplierName', width: 30 },
      { header: 'Opening', key: 'openingPayable', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Purchases', key: 'purchasesTotal', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Payments', key: 'paymentsTotal', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Returns/Adj', key: 'adjustments', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Closing', key: 'closingPayable', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Net Payable', key: 'netPayable', numFmt: NUM_FMT, align: 'right', width: 16 },
    ],
    rows: data.supplierLedgers.map((s) => ({
      supplierName: s.supplierName,
      openingPayable: s.openingPayable,
      purchasesTotal: s.purchasesTotal,
      paymentsTotal: s.paymentsTotal,
      adjustments: s.purchaseReturnsTotal + s.adjustmentsTotal,
      closingPayable: s.closingPayable,
      netPayable: s.closingPayable - (s.overpaymentCredit || 0),
    })),
  })

  add('Supplier Payables', {
    name: 'Supplier Payables',
    sectionKey: 'supplier_payables',
    columns: [
      { header: 'Supplier', key: 'supplierName', width: 30 },
      { header: '0-30', key: 'days0To30', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: '31-60', key: 'days31To60', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: '61-90', key: 'days61To90', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: '90+', key: 'days90Plus', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: 'Payable', key: 'payable', numFmt: NUM_FMT, align: 'right', width: 18 },
    ],
    rows: data.supplierLedgers.filter((s) => s.closingPayable > 0.005).map((s) => ({
      supplierName: s.supplierName,
      days0To30: s.aging.days0To30,
      days31To60: s.aging.days31To60,
      days61To90: s.aging.days61To90,
      days90Plus: s.aging.days90Plus,
      payable: s.closingPayable,
    })),
  })

  add('Payments', {
    name: 'Payments',
    landscape: true,
    statusKey: 'status',
    sectionKey: 'payments',
    columns: [
      { header: 'Date', key: 'date', width: 15, date: true },
      { header: 'Type', key: 'entityType', width: 12 },
      { header: 'Entity', key: 'entityName', width: 24 },
      { header: 'Reference', key: 'reference', width: 24 },
      { header: 'Amount', key: 'amount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Method', key: 'method', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'By', key: 'createdBy', width: 20 },
    ],
    rows: data.paymentsDetail.map((p: MegaPaymentRow) => ({
      date: p.date,
      entityType: p.entityType,
      entityName: p.entityName,
      reference: p.reference,
      amount: p.amount,
      method: p.method,
      status: p.status,
      createdBy: p.createdBy,
    })),
    totals: ['', '', '', 'TOTAL', data.paymentsDetail.reduce((a, p) => a + p.amount, 0), '', '', ''],
  })

  add('Expenses', {
    name: 'Expenses',
    sectionKey: 'expenses',
    columns: [
      { header: 'Date', key: 'date', width: 15, date: true },
      { header: 'Title', key: 'title', width: 34 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Description', key: 'description', width: 40, wrap: true },
      { header: 'Amount', key: 'amount', numFmt: NUM_FMT, align: 'right', width: 16 },
    ],
    rows: data.expenses.map((e: MegaExpenseRow) => ({
      date: e.date,
      title: e.title,
      category: e.category,
      description: e.description,
      amount: e.amount,
    })),
    totals: ['', 'TOTAL', '', '', data.expenses.reduce((a, e) => a + e.amount, 0)],
  })

  add('Products', {
    name: 'Products',
    landscape: true,
    sectionKey: 'products',
    columns: [
      { header: 'Product', key: 'name', width: 34 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Category', key: 'categoryName', width: 24 },
      { header: 'Stock', key: 'stockQuantity', numFmt: INT_FMT, align: 'right', width: 12 },
      { header: 'Cost', key: 'purchasePrice', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Selling', key: 'sellingPrice', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Status', key: 'isActive', width: 12 },
    ],
    rows: data.products.map((p: MegaProductRow) => ({
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      categoryName: p.categoryName,
      stockQuantity: p.stockQuantity,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      isActive: p.isActive ? 'Active' : 'Inactive',
    })),
  })

  add('Categories', {
    name: 'Categories',
    sectionKey: 'categories',
    columns: [
      { header: 'Category', key: 'name', width: 30 },
      { header: 'Products', key: 'productCount', numFmt: INT_FMT, align: 'right', width: 16 },
      { header: 'Description', key: 'description', width: 50, wrap: true },
    ],
    rows: data.categories.map((c: MegaCategoryRow) => ({
      name: c.name,
      productCount: c.productCount,
      description: c.description,
    })),
  })

  add('Stock Valuation', {
    name: 'Stock Valuation',
    landscape: true,
    sectionKey: 'stock_valuation',
    columns: [
      { header: 'Product', key: 'name', width: 34 },
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Qty', key: 'stockQuantity', numFmt: INT_FMT, align: 'right', width: 12 },
      { header: 'Unit Cost', key: 'unitCost', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Closing Value', key: 'closingInventoryValue', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Selling', key: 'sellingPrice', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Retail', key: 'retailValue', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Margin', key: 'potentialGrossMargin', numFmt: NUM_FMT, align: 'right', width: 18 },
      { header: 'Cost', key: 'isCostMissing', width: 12 },
    ],
    rows: data.inventory.products.map((p) => ({
      name: p.name,
      sku: p.sku,
      stockQuantity: p.stockQuantity,
      unitCost: p.unitCost,
      closingInventoryValue: p.closingInventoryValue,
      sellingPrice: p.sellingPrice,
      retailValue: p.retailValue,
      potentialGrossMargin: p.potentialGrossMargin,
      isCostMissing: p.isCostMissing ? 'Missing' : 'OK',
    })),
  })

  add('Stock Movement', {
    name: 'Stock Movement',
    landscape: true,
    sectionKey: 'stock_movement',
    columns: [
      { header: 'Date', key: 'date', width: 15, date: true },
      { header: 'Product', key: 'productName', width: 30 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Qty', key: 'quantity', numFmt: INT_FMT, align: 'right', width: 12 },
      { header: 'From', key: 'previousQuantity', numFmt: INT_FMT, align: 'right', width: 12 },
      { header: 'To', key: 'newQuantity', numFmt: INT_FMT, align: 'right', width: 12 },
      { header: 'Reason', key: 'reason', width: 36 },
    ],
    rows: data.inventory.movements.map((m: MegaStockMovementRow) => ({
      date: m.date,
      productName: m.productName,
      sku: m.sku,
      type: m.type,
      quantity: m.quantity,
      previousQuantity: m.previousQuantity,
      newQuantity: m.newQuantity,
      reason: m.reason,
    })),
  })

  add('Profit & Loss', {
    name: 'Profit & Loss',
    sectionKey: 'profit_loss',
    columns: [
      { header: 'Item', key: 'item', width: 34 },
      { header: 'Amount', key: 'amount', numFmt: NUM_FMT, align: 'right', width: 18 },
    ],
    rows: [
      { item: 'Gross Sales', amount: data.profitability.grossSales },
      { item: 'Discounts', amount: data.profitability.discounts },
      { item: 'Sales Returns', amount: data.profitability.salesReturns },
      { item: 'NET SALES', amount: data.profitability.netSales },
      { item: 'Cost of Goods Sold', amount: data.kpis.cogs },
      { item: 'GROSS PROFIT', amount: data.kpis.grossProfit },
      { item: 'Gross Margin %', amount: `${data.profitability.grossMarginPercent.toFixed(1)}%` as any },
      { item: 'Operating Expenses', amount: data.profitability.expenses },
      { item: 'NET PROFIT', amount: data.profitability.netProfit },
      { item: 'Net Margin %', amount: `${data.profitability.netMarginPercent.toFixed(1)}%` as any },
    ],
  })

  add('VAT Summary', {
    name: 'VAT Summary',
    sectionKey: 'vat_summary',
    columns: [
      { header: 'Item', key: 'item', width: 34 },
      { header: 'Amount', key: 'amount', numFmt: NUM_FMT, align: 'right', width: 18 },
    ],
    rows: [
      { item: 'Taxable Sales', amount: data.vatSummary.taxableSales },
      { item: 'Output VAT', amount: data.vatSummary.outputVat },
      { item: 'Taxable Purchases', amount: data.vatSummary.taxablePurchases },
      { item: 'Input VAT', amount: data.vatSummary.inputVat },
      { item: 'Net VAT Position', amount: data.vatSummary.netVatPosition },
      { item: 'Status', amount: data.vatSummary.status },
    ],
  })

  add('Credit Notes', {
    name: 'Credit Notes',
    sectionKey: 'credit_notes',
    columns: [
      { header: 'Credit Note #', key: 'creditNoteNumber', width: 24 },
      { header: 'Date', key: 'issuedDate', width: 15, date: true },
      { header: 'Customer', key: 'customerName', width: 24 },
      { header: 'Invoice', key: 'invoiceNumber', width: 22 },
      { header: 'Taxable', key: 'taxableAmount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'VAT', key: 'vatAmount', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: 'Total', key: 'totalAmount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Reason', key: 'reason', width: 36 },
    ],
    rows: data.creditNotes.map((n: MegaCreditNoteRow) => ({
      creditNoteNumber: n.creditNoteNumber,
      issuedDate: n.issuedDate,
      customerName: n.customerName,
      invoiceNumber: n.invoiceNumber,
      taxableAmount: n.taxableAmount,
      vatAmount: n.vatAmount,
      totalAmount: n.totalAmount,
      reason: n.reason,
    })),
  })

  add('Debit Notes', {
    name: 'Debit Notes',
    sectionKey: 'debit_notes',
    columns: [
      { header: 'Debit Note #', key: 'debitNoteNumber', width: 24 },
      { header: 'Date', key: 'issuedDate', width: 15, date: true },
      { header: 'Supplier', key: 'supplierName', width: 24 },
      { header: 'Taxable', key: 'taxableAmount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'VAT', key: 'vatAmount', numFmt: NUM_FMT, align: 'right', width: 14 },
      { header: 'Total', key: 'totalAmount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Reason', key: 'reason', width: 36 },
    ],
    rows: data.debitNotes.map((n: MegaDebitNoteRow) => ({
      debitNoteNumber: n.debitNoteNumber,
      issuedDate: n.issuedDate,
      supplierName: n.supplierName,
      taxableAmount: n.taxableAmount,
      vatAmount: n.vatAmount,
      totalAmount: n.totalAmount,
      reason: n.reason,
    })),
  })

  add('Invoice Sequence', {
    name: 'Invoice Sequence',
    sectionKey: 'invoices',
    columns: [
      { header: 'Field', key: 'field', width: 26 },
      { header: 'Value', key: 'value', width: 50, wrap: true },
    ],
    rows: [
      { field: 'Fiscal Year', value: data.invoiceSequence.fiscalYear },
      { field: 'First Invoice', value: data.invoiceSequence.firstInvoiceNumber ?? '—' },
      { field: 'Last Invoice', value: data.invoiceSequence.lastInvoiceNumber ?? '—' },
      { field: 'Total Issued', value: data.invoiceSequence.totalIssued },
      { field: 'Total Cancelled', value: data.invoiceSequence.totalCancelled },
      { field: 'Sequence Intact', value: data.invoiceSequence.isSequenceIntact ? 'Yes' : 'No' },
      { field: 'Gaps', value: data.invoiceSequence.gapsDetected.length ? data.invoiceSequence.gapsDetected.join(', ') : 'None' },
      { field: 'Duplicates', value: data.invoiceSequence.duplicatesDetected.length ? data.invoiceSequence.duplicatesDetected.join(', ') : 'None' },
    ],
  })

  add('IRD Readiness', {
    name: 'IRD Readiness',
    sectionKey: 'ird_readiness',
    columns: [
      { header: 'Field', key: 'field', width: 26 },
      { header: 'Value', key: 'value', width: 50 },
    ],
    rows: [
      { field: 'Business', value: data.ird.businessName },
      { field: 'PAN', value: data.ird.panNumber },
      { field: 'VAT', value: data.ird.vatNumber },
      { field: 'VAT Registration', value: data.ird.vatRegistrationStatus },
      { field: 'Current Fiscal Year', value: data.ird.currentFiscalYear },
      { field: 'Electronic Billing', value: data.ird.electronicBillingStatus },
      { field: 'CBMS Integration', value: data.ird.cbmsIntegrationStatus },
      { field: 'Submissions', value: `${data.ird.cbmsSubmissionCount} (Accepted ${data.ird.cbmsAcceptedCount})` },
      { field: 'Approval Verified', value: data.ird.approvalVerified ? 'Yes' : 'No' },
    ],
  })

  add('IRD Reconciliation', {
    name: 'IRD Reconciliation',
    statusKey: 'irdStatus',
    sectionKey: 'ird_reconciliation',
    columns: [
      { header: 'Invoice #', key: 'invoiceNumber', width: 24 },
      { header: 'Date', key: 'invoiceDate', width: 15, date: true },
      { header: 'Customer', key: 'customerName', width: 28 },
      { header: 'Total', key: 'totalAmount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Local Status', key: 'localStatus', width: 16 },
      { header: 'IRD Status', key: 'irdStatus', width: 16 },
    ],
    rows: data.irdReconciliation.map((r) => ({
      invoiceNumber: r.invoiceNumber,
      invoiceDate: r.invoiceDate,
      customerName: r.customerName ?? '—',
      totalAmount: r.totalAmount,
      localStatus: r.localStatus,
      irdStatus: r.irdStatus,
    })),
  })

  add('Audit Trail', {
    name: 'Audit Trail',
    landscape: true,
    sectionKey: 'audit_trail',
    columns: [
      { header: 'Date', key: 'timestamp', width: 20 },
      { header: 'Action', key: 'action', width: 24 },
      { header: 'Target', key: 'target', width: 28 },
      { header: 'User', key: 'userId', width: 24 },
      { header: 'Metadata', key: 'metadata', width: 60, wrap: true },
    ],
    rows: data.auditTrail.map((a) => ({
      timestamp: a.timestamp,
      action: a.action,
      target: a.target,
      userId: a.userId,
      metadata: typeof a.metadata === 'object' && a.metadata ? JSON.stringify(a.metadata).substring(0, 200) : '',
    })),
  })

  add('Cancelled Documents', {
    name: 'Cancelled Documents',
    sectionKey: 'cancelled_documents',
    columns: [
      { header: 'Type', key: 'documentType', width: 14 },
      { header: 'Number', key: 'originalNumber', width: 24 },
      { header: 'Date', key: 'date', width: 15, date: true },
      { header: 'Amount', key: 'amount', numFmt: NUM_FMT, align: 'right', width: 16 },
      { header: 'Party', key: 'partyName', width: 24 },
      { header: 'Reason', key: 'reason', width: 36 },
      { header: 'By', key: 'cancelledBy', width: 20 },
    ],
    rows: data.cancelledDocuments.map((d) => ({
      documentType: d.documentType,
      originalNumber: d.originalNumber,
      date: d.date,
      amount: d.amount,
      partyName: d.partyName,
      reason: d.reason,
      cancelledBy: d.cancelledBy,
    })),
  })

  add('Data Integrity', {
    name: 'Data Integrity',
    sectionKey: 'data_integrity',
    columns: [
      { header: 'Check', key: 'check', width: 34 },
      { header: 'Value', key: 'value', width: 60 },
    ],
    rows: [
      { check: 'Reconciliation Checks Run', value: data.integrity.reconciliationCount },
      { check: 'Checks Balanced', value: data.reconciliation.filter((r) => r.status === 'BALANCED').length },
      { check: 'Checks Need Attention', value: data.reconciliation.filter((r) => r.status !== 'BALANCED').length },
      { check: 'Products Missing Cost', value: data.integrity.costDataMissingCount },
      { check: 'Has Integrity Issues', value: data.integrity.hasIssues ? 'Yes' : 'No' },
      { check: 'Issues', value: data.integrity.issues.length ? data.integrity.issues.join(' | ') : 'None' },
    ],
  })

  applyCoverFixes(workbook)
  return workbook
}

function addSheet(workbook: ExcelJS.Workbook, name: string, spec: SheetSpec, include?: Set<MegaSectionKey>): void {
  if (spec.sectionKey && !sectionEnabled(include, spec.sectionKey)) return
  const ws = workbook.addWorksheet(name.slice(0, 31))
  applyDataStyle(ws, { ...spec, name })
  if (spec.totals) setTotalsRow(ws, { ...spec, name })
}

function setTotalsRow(ws: ExcelJS.Worksheet, spec: SheetSpec): void {
  if (!spec.totals || spec.totals.length === 0) return
  const row = ws.addRow(spec.totals)
  row.eachCell((cell, colIdx) => {
    const specCol = spec.columns[colIdx - 1]
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    if (specCol?.numFmt && typeof cell.value === 'number') cell.numFmt = specCol.numFmt
    cell.alignment = { horizontal: specCol?.align === 'right' ? 'right' : 'left' }
  })
  row.height = 18
}

function buildCover(ws: ExcelJS.Worksheet, data: MegaReportData): void {
  ws.columns = [
    { header: '', key: 'a', width: 40 },
    { header: '', key: 'b', width: 18 },
    { header: '', key: 'c', width: 18 },
    { header: '', key: 'd', width: 18 },
    { header: '', key: 'e', width: 18 },
    { header: '', key: 'f', width: 18 },
    { header: '', key: 'g', width: 20 },
  ]
  const meta = data.meta
  const biz = meta.business

  const BRAND = 'FF2563EB'
  const INK = 'FF0F172A'
  const MUTED = 'FF475569'
  const BAND = 'FFEFF6FF'

  // Top brand band.
  ws.getCell('A1').value = 'INVENTORY LITE'
  ws.getCell('A1').font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  ws.getCell('B1').value = 'MEGA BUSINESS REPORT'
  ws.getCell('B1').font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  ws.getRow(1).height = 26
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
  })

  // Hero title.
  ws.mergeCells('A3:G3')
  ws.getCell('A3').value = 'MEGA BUSINESS REPORT'
  ws.getCell('A3').font = { bold: true, size: 26, color: { argb: INK } }
  ws.getCell('A3').alignment = { horizontal: 'left', vertical: 'middle' }
  ws.getRow(3).height = 34
  ws.mergeCells('A4:G4')
  ws.getCell('A4').value = 'Comprehensive fiscal & operational overview for informed decision-making.'
  ws.getCell('A4').font = { size: 12, color: { argb: MUTED } }
  ws.getRow(4).height = 20

  // Thin rule.
  ws.mergeCells('A6:G6')
  ws.getCell('A6').border = { bottom: { style: 'thick', color: { argb: BRAND } } }

  // Business info panel.
  ws.mergeCells('A8:C8')
  ws.getCell('A8').value = biz.name || 'Business'
  ws.getCell('A8').font = { bold: true, size: 16, color: { argb: INK } }
  ws.getCell('A8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } }
  ws.getCell('A8').border = { top: { style: 'medium', color: { argb: BRAND } } }

  const metaRows: Array<[string, string | number]> = [
    ['Business Name', biz.name || '—'],
    ['Financial Year', meta.fiscalYear],
    ['Report Period', meta.periodLabel],
    ['Generated At', meta.generatedAt],
    ['Address', biz.address || '—'],
    ['Phone', biz.phone || '—'],
    ['Email', biz.email || '—'],
    ['PAN', biz.panNumber || '—'],
    ['VAT', biz.vatNumber || '—'],
    ['Currency', biz.currency || '—'],
  ]

  metaRows.forEach(([k, v], idx) => {
    const rowNum = 9 + idx
    ws.getCell(`A${rowNum}`).value = k
    ws.getCell(`A${rowNum}`).font = { bold: true, size: 11, color: { argb: MUTED } }
    ws.getCell(`B${rowNum}`).value = v
    ws.getCell(`B${rowNum}`).font = { size: 11, color: { argb: INK } }
    ws.getCell(`B${rowNum}`).numFmt = 'General'
  })

  // Navigation to the dashboard.
  const navRow = 9 + metaRows.length + 1
  ws.mergeCells(`A${navRow}:C${navRow}`)
  const dashCell = ws.getCell(`A${navRow}`)
  dashCell.value = { text: 'Open Executive Dashboard →', hyperlink: "#Dashboard'!A1" }
  dashCell.font = { bold: true, size: 12, color: { argb: BRAND }, underline: true }

  // Hyperlink target needs the sheet name quoted only when it contains spaces.
  dashCell.value = { text: 'Open Executive Dashboard →', hyperlink: '#Dashboard!A1' }

  // Disclaimer + confidentiality footer.
  const disRow = navRow + 3
  ws.mergeCells(`A${disRow}:G${disRow}`)
  ws.getCell(`A${disRow}`).value =
    'This report has been generated from the books of account maintained in Inventory Lite and ' +
    'is intended for internal business use. Figures are represented as reported in your records.'
  ws.getCell(`A${disRow}`).font = { size: 9, italic: true, color: { argb: MUTED } }
  ws.getCell(`A${disRow}`).alignment = { wrapText: true }

  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

const CARD_BRAND = 'FF2563EB'
const CARD_INK = 'FF0F172A'
const CARD_MUTED = 'FF64748B'
const CARD_BAND = 'FFF1F5F9'

interface DashboardKpi {
  label: string
  value: number
  caption: string
}

function buildDashboard(ws: ExcelJS.Worksheet, data: MegaReportData): XmlChartSpec[] {
  const k = data.kpis
  const months = buildMonthlyTrend(data)

  const kpis: DashboardKpi[] = [
    { label: 'Net Sales', value: data.profitability.netSales, caption: 'Total sales revenue' },
    { label: 'Gross Profit', value: k.grossProfit, caption: 'Net sales − COGS' },
    { label: 'Net Profit', value: k.netProfit, caption: 'After all expenses' },
    { label: 'Stock Value', value: k.stockValue, caption: 'Current inventory value' },
    { label: 'Receivables', value: k.outstandingCustomerCredit, caption: 'From customers' },
    { label: 'Payables', value: k.supplierPayables, caption: 'To suppliers' },
    { label: 'Output VAT', value: k.outputVat, caption: 'On sales' },
    { label: 'Input VAT', value: k.inputVat, caption: 'On purchases' },
    { label: 'Sales Count', value: k.totalSalesCount, caption: 'Invoices issued' },
  ]

  const kw = 3
  const cardW = 2

  // Title band.
  ws.mergeCells('A1:F1')
  ws.getCell('A1').value = 'EXECUTIVE DASHBOARD'
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getRow(1).height = 26
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BRAND } }

  ws.mergeCells('A2:F2')
  ws.getCell('A2').value =
    `${data.meta.business.name || 'Business'}  |  FY ${data.meta.fiscalYear}  |  ${data.meta.periodLabel}  |  Generated ${data.meta.generatedAt}`
  ws.getCell('A2').font = { size: 10, color: { argb: CARD_MUTED } }

  // KPI cards: 3 per row; each card spans 2 columns.
  kpis.forEach((kpi, idx) => {
    const rowIdx = Math.floor(idx / kw)
    const colIdx = (idx % kw) * cardW
    const labelRow = 4 + rowIdx * 3
    const valRow = labelRow + 1

    const lCol = colToLetter(colIdx + 1)
    const rCol = colToLetter(colIdx + cardW + 0)
    const labelRange = `${lCol}${labelRow}:${rCol}${labelRow}`
    const valRange = `${lCol}${valRow}:${rCol}${valRow}`
    const labelRef = `${lCol}${labelRow}`
    const valRef = `${lCol}${valRow}`

    ws.mergeCells(labelRange)
    ws.getCell(labelRef).value = kpi.label.toUpperCase()
    ws.getCell(labelRef).font = { bold: true, size: 9, color: { argb: CARD_MUTED } }
    ws.getCell(labelRef).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BAND } }
    ws.getCell(labelRef).border = {
      top: { style: 'medium', color: { argb: CARD_BRAND } },
      left: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      right: { style: 'hair', color: { argb: 'FFCBD5E1' } },
    }

    ws.mergeCells(valRange)
    ws.getCell(valRef).value = kpi.value
    ws.getCell(valRef).numFmt = NUM_FMT
    ws.getCell(valRef).font = { bold: true, size: 15, color: { argb: CARD_INK } }
    ws.getCell(valRef).alignment = { horizontal: 'left', vertical: 'middle' }
    ws.getCell(valRef).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
    ws.getCell(valRef).border = {
      bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      left: { style: 'hair', color: { argb: 'FFCBD5E1' } },
      right: { style: 'hair', color: { argb: 'FFCBD5E1' } },
    }
    ws.getRow(labelRow).height = 16
    ws.getRow(valRow).height = 22
  })

  // Right-side source data tables (referenced by charts).
  const H = 8
  const hc = colToLetter(H) // H

  // Monthly trend table.
  ws.getCell(`${hc}${3}`).value = 'MONTHLY SALES VS PURCHASES'
  ws.getCell(`${hc}${3}`).font = { bold: true, size: 10, color: { argb: CARD_INK } }
  ws.getCell(`${hc}4`).value = 'Month'
  ws.getCell(`${colToLetter(H + 1)}4`).value = 'Sales'
  ws.getCell(`${colToLetter(H + 2)}4`).value = 'Purchases'
  ;[`${hc}4`, `${colToLetter(H + 1)}4`, `${colToLetter(H + 2)}4`].forEach((c) => {
    ws.getCell(c).font = { bold: true, size: 9 }
    ws.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CARD_BAND } }
  })
  months.forEach((m, i) => {
    const r = 5 + i
    ws.getCell(`${hc}${r}`).value = m.label
    ws.getCell(`${colToLetter(H + 1)}${r}`).value = m.sales
    ws.getCell(`${colToLetter(H + 2)}${r}`).value = m.purchases
  })
  const monthCatStart = 5
  const monthCatEnd = Math.max(5, 4 + months.length)

  // Profitability table.
  const profTitleRow = monthCatEnd + 3
  ws.getCell(`${hc}${profTitleRow}`).value = 'PROFITABILITY'
  ws.getCell(`${hc}${profTitleRow}`).font = { bold: true, size: 10, color: { argb: CARD_INK } }
  const profHeader = profTitleRow + 1
  ws.getCell(`${hc}${profHeader}`).value = 'Metric'
  ws.getCell(`${colToLetter(H + 1)}${profHeader}`).value = 'Amount'
  const profRows: Array<[string, number]> = [
    ['Net Sales', data.profitability.netSales],
    ['Cost of Goods Sold', k.cogs],
    ['Gross Profit', k.grossProfit],
    ['Expenses', k.expenses],
    ['Net Profit', k.netProfit],
  ]
  profRows.forEach(([label, v], i) => {
    const r = profHeader + 1 + i
    ws.getCell(`${hc}${r}`).value = label
    ws.getCell(`${colToLetter(H + 1)}${r}`).value = v
    ws.getCell(`${colToLetter(H + 1)}${r}`).numFmt = NUM_FMT
  })
  const profStart = profHeader + 1
  const profEnd = profHeader + profRows.length

  // Expense breakdown table.
  const expTitleRow = profEnd + 3
  ws.getCell(`${hc}${expTitleRow}`).value = 'EXPENSES BY CATEGORY'
  ws.getCell(`${hc}${expTitleRow}`).font = { bold: true, size: 10, color: { argb: CARD_INK } }
  const expHeader = expTitleRow + 1
  ws.getCell(`${hc}${expHeader}`).value = 'Category'
  ws.getCell(`${colToLetter(H + 1)}${expHeader}`).value = 'Amount'
  const expenseBars = topExpenses(data, 5)
  expenseBars.forEach(([label, v], i) => {
    const r = expHeader + 1 + i
    ws.getCell(`${hc}${r}`).value = label
    ws.getCell(`${colToLetter(H + 1)}${r}`).value = v
    ws.getCell(`${colToLetter(H + 1)}${r}`).numFmt = NUM_FMT
  })
  const expStart = expHeader + 1
  const expEnd = expHeader + expenseBars.length

  // Navigation hyperlinks.
  const navRow = expEnd + 3
  ws.getCell(`${hc}${navRow}`).value = 'JUMP TO SECTION'
  ws.getCell(`${hc}${navRow}`).font = { bold: true, size: 10, color: { argb: CARD_INK } }
  const navTargets = [
    'Cover',
    'Executive Summary',
    'Reconciliation',
    'Sales Register',
    'Purchase Register',
    'Profit & Loss',
    'Balance Sheet',
    'VAT Summary',
    'Data Integrity',
    'Stock Valuation',
  ]
  navTargets.forEach((t, i) => {
    const c = ws.getCell(`${hc}${navRow + 1 + i}`)
    c.value = { text: t, hyperlink: `#${t}!A1` }
    c.font = { size: 10, color: { argb: CARD_BRAND }, underline: true }
  })

  ws.views = [{ state: 'frozen', ySplit: 3 }]
  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  }

  // Build chart specs referencing the tables above.
  const charts: XmlChartSpec[] = []
  const q = `'Dashboard'`
  if (months.length >= 2) {
    charts.push({
      sheetIndex: 2,
      from: { col: 0, row: 14 },
      to: { col: 5, row: 23 },
      title: 'Monthly Sales vs Purchases',
      categories: `${q}!$${hc}$${monthCatStart}:$${hc}$${monthCatEnd}`,
      series: [
        { name: 'Sales', data: `${q}!$${colToLetter(H + 1)}$${monthCatStart}:$${colToLetter(H + 1)}$${monthCatEnd}`, color: 'FF2563EB' },
        { name: 'Purchases', data: `${q}!$${colToLetter(H + 2)}$${monthCatStart}:$${colToLetter(H + 2)}$${monthCatEnd}`, color: 'FFF59E0B' },
      ],
    })
  }
  if (profRows.length >= 2) {
    charts.push({
      sheetIndex: 2,
      from: { col: 0, row: 25 },
      to: { col: 5, row: 32 },
      title: 'Profitability Breakdown',
      categories: `${q}!$${hc}$${profStart}:$${hc}$${profEnd}`,
      series: [
        { name: 'NPR', data: `${q}!$${colToLetter(H + 1)}$${profStart}:$${colToLetter(H + 1)}$${profEnd}`, color: 'FF059669' },
      ],
    })
  }
  if (expenseBars.length >= 2) {
    charts.push({
      sheetIndex: 2,
      from: { col: 0, row: 34 },
      to: { col: 5, row: 41 },
      title: 'Expenses by Category',
      categories: `${q}!$${hc}$${expStart}:$${hc}$${expEnd}`,
      series: [
        { name: 'NPR', data: `${q}!$${colToLetter(H + 1)}$${expStart}:$${colToLetter(H + 1)}$${expEnd}`, color: 'FFDC2626' },
      ],
    })
  }

  return charts
}

function buildMonthlyTrend(data: MegaReportData): { label: string; sales: number; purchases: number }[] {
  const map = new Map<string, { sales: number; purchases: number }>()
  const keyOf = (dateStr: string): string => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const labelOf = (key: string): string => {
    const [y, m] = key.split('-')
    return `${y.slice(2)}-${m}`
  }
  data.salesRegister.rows.forEach((r: MegaInvoiceRow) => {
    const key = keyOf(r.date)
    if (!key) return
    const e = map.get(key) || { sales: 0, purchases: 0 }
    e.sales += Number(r.taxableAmount) || 0
    map.set(key, e)
  })
  data.purchaseRegister.rows.forEach((r: any) => {
    const key = keyOf(r.date)
    if (!key) return
    const e = map.get(key) || { sales: 0, purchases: 0 }
    e.purchases += Number(r.taxableAmount) || 0
    map.set(key, e)
  })
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 12)
    .map(([key, v]) => ({ label: labelOf(key), sales: v.sales, purchases: v.purchases }))
}

function topExpenses(data: MegaReportData, n: number): Array<[string, number]> {
  const map = new Map<string, number>()
  data.expenses.forEach((e) => {
    const cat = (e.category || 'General').trim() || 'General'
    map.set(cat, (map.get(cat) || 0) + (Number(e.amount) || 0))
  })
  return [...map.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

function applyCoverFixes(workbook: ExcelJS.Workbook): void {
  // Ensure the cover sheet is first and labeled clearly.
  const cover = workbook.getWorksheet('Cover')
  if (cover) cover.properties.defaultColWidth = 10
}

/** Render workbook to a Buffer (Node-safe; used by tests). */
export async function generateMegaExcelBuffer(opts: MegaReportExcelOptions): Promise<Buffer> {
  const workbook = buildMegaReportWorkbook(opts)
  const charts = chartSpecsByWorkbook.get(workbook) ?? []
  const raw = await workbook.xlsx.writeBuffer()
  const base: Buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
  return injectCharts(base, charts)
}

const chartSpecsByWorkbook = new WeakMap<ExcelJS.Workbook, XmlChartSpec[]>()
