/**
 * Mega Business Report — PDF generator.
 *
 * Produces a single professional A4 PDF from the shared MegaReportData so the
 * PDF and Excel exports are guaranteed to match (both consume getMegaReportData).
 *
 * Layout:
 *  - Cover page (portrait) with business identity, fiscal year, period.
 *  - Table of contents.
 *  - Portrait pages for summaries / statements.
 *  - Landscape pages for wide registers / ledgers.
 *  - Shared footer on every page:
 *      "Inventory Lite | <Business> | Report: Mega Business Report |
 *       Generated <date> | Page X of Y"
 *
 * All values are formatted through the design-system formatters and pass
 * through safeText so no NaN / Infinity / undefined / null ever renders.
 */

import jsPDF from 'jspdf'
import type { MegaReportData, MegaInvoiceRow } from '@/types/mega-report'
import { safeText, truncateText } from '@/lib/pdf/fonts'
import {
  formatNpr,
  formatNumber,
  formatBsDate,
  formatBsDateTime,
  formatSignedQuantity,
  formatPercent,
  sanitizeFilename,
} from '@/lib/pdf/formatters'
import { createPdf, finalizePdf } from '@/lib/pdf/components/page'
import { drawSummaryCard, drawTotalsBar } from '@/lib/pdf/components/summary'
import { drawMetadata } from '@/lib/pdf/components/metadata'
import { drawTable } from '@/lib/pdf/components/table'
import { PDF_COLORS, PDF_SPACING } from '@/lib/pdf/theme'
import { sectionEnabled, type MegaSectionKey } from '@/lib/export/mega-report-sections'
import { drawBarChart, drawHorizontalBars } from '@/lib/pdf/mega-report-charts'

export interface MegaReportPdfOptions {
  data: MegaReportData
  /** Optional set of section keys to include; empty/undefined = all sections. */
  include?: Set<MegaSectionKey>
}

type Page = jsPDF

/** Add a new page in a given orientation, draw the page header, and return the y-cursor. */
function nextPage(doc: Page, orientation: 'portrait' | 'landscape', data?: MegaReportData): number {
  doc.addPage('a4', orientation)
  if (data) drawPageHeader(doc, data, doc.getNumberOfPages())
  return PDF_SPACING.pageMargin
}

/** Professional slim header on every content page (business + report + FY + rule). */
function drawPageHeader(doc: Page, data: MegaReportData, pageNumber: number): void {
  const meta = data.meta
  const biz = meta.business
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
  doc.text(truncateText(safeText(biz.name), 55), margin, 8)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text('MEGA BUSINESS REPORT', pageWidth / 2, 8, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.text(`FY ${safeText(meta.fiscalYear)}`, pageWidth - margin, 8, { align: 'right' })

  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.setLineWidth(0.3)
  doc.line(margin, 11, pageWidth - margin, 11)

  // Page number top-right in muted tiny text
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(PDF_COLORS.ink300[0], PDF_COLORS.ink300[1], PDF_COLORS.ink300[2])
  doc.text(String(pageNumber), pageWidth - margin, 11.6, { align: 'right' })
}

/** Footer drawn on every content page via the global pass. */
function drawPageFooter(doc: Page, data: MegaReportData, pageNumber: number): void {
  const biz = data.meta.business
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = PDF_SPACING.pageMargin

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(
    `Inventory Lite | ${truncateText(safeText(biz.name), 60)} | Generated ${formatBsDateTime(data.meta.generatedAt)}`,
    margin,
    pageHeight - 7,
  )
  doc.text(
    `Page ${pageNumber} of {totalPages}`,
    pageWidth - margin,
    pageHeight - 7,
    { align: 'right' },
  )
}

/** Draw a bold section header banner. Returns the y below it. */
function drawSectionTitle(doc: Page, y: number, title: string, subtitle?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin

  // Full-width accent rule above the title.
  doc.setFillColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.rect(margin, y, pageWidth - margin * 2, 0.8, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.text(truncateText(safeText(title), 95), margin, y + 6)

  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text(truncateText(safeText(subtitle), 160), margin, y + 11)
  }

  return y + (subtitle ? 16 : 12)
}

function safeDate(v?: string): string {
  return v ? formatBsDate(v) : '—'
}

export function generateMegaReportPdf(opts: MegaReportPdfOptions): jsPDF {
  const { data, include } = opts
  const inc = (key: MegaSectionKey): boolean => sectionEnabled(include, key)
  const meta = data.meta

  const doc = createPdf({ orientation: 'portrait' }) as Page
  // Draws the slim header on every page a table occupies (incl. continuation pages).
  const pageHook = (payload: { pageNumber: number }): void => drawPageHeader(doc, data, payload.pageNumber)
  const sectionPages: number[] = []

  // ------------------------------------------------ COVER
  coverPage(doc, data)
  // ------------------------------------------------ TABLE OF CONTENTS
  const tocY = nextPage(doc, 'portrait', data)
  drawTocPage(doc, tocY, data)

  // ------------------------------------------------ 1. EXECUTIVE SUMMARY
  let y = nextPage(doc, 'portrait', data)
  if (inc('executive_summary')) {
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '1. EXECUTIVE SUMMARY', 'Key headline figures for the selected period')
  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Fiscal Year', value: meta.fiscalYear },
      { label: 'Period', value: meta.periodLabel },
      { label: 'Generated', value: formatBsDate(meta.generatedAt) },
    ],
  })
  y = drawKpiGrid(doc, y, data)
  y = drawExecutiveCharts(doc, y, data)

  }
  // ------------------------------------------------ 2. FINANCIAL OVERVIEW / RECONCILIATION
  if (inc('reconciliation')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '2. FINANCIAL RECONCILIATION SUMMARY', 'Cross-report integrity checks')
  y = drawReconciliationSummary(doc, y, data)

  }
  // ------------------------------------------------ 3. SALES REGISTER (wide)
  if (inc('sales_register')) {
  y = nextPage(doc, 'landscape', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '3. SALES REGISTER', 'All sales invoices in the selected period')
  y = drawSalesRegister(doc, y, data, pageHook)

  }
  // ------------------------------------------------ 4. PURCHASE REGISTER (wide)
  if (inc('purchase_register')) {
  y = nextPage(doc, 'landscape', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '4. PURCHASE REGISTER', 'All purchases in the selected period')
  y = drawPurchaseRegister(doc, y, data, pageHook)

  }
  // ------------------------------------------------ 5. SALES RETURNS
  if (inc('sales_returns')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '5. SALES RETURNS', 'Customer returns and adjustments')
  y = drawReturns(doc, y, data)

  }
  // ------------------------------------------------ 6. PURCHASE RETURNS / RETURNS & ADJUSTMENTS
  if (inc('returns_adjustments')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '6. PURCHASE RETURNS & ADJUSTMENTS', 'Returns, notes and inventory adjustments')
  y = drawReturnsAdjustments(doc, y, data)

  }
  // ------------------------------------------------ 7. CUSTOMERS
  if (inc('customers')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '7. CUSTOMERS', 'Customer directory')
  y = drawCustomerDirectory(doc, y, data)

  }
  // ------------------------------------------------ 8. CUSTOMER LEDGER (wide)
  if (inc('customer_ledger')) {
  y = nextPage(doc, 'landscape', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '8. CUSTOMER LEDGER', 'Per-customer opening / invoices / payments / closing')
  y = drawCustomerLedger(doc, y, data, pageHook)

  }
  // ------------------------------------------------ 9. CUSTOMER UDHAAR / RECEIVABLES
  if (inc('customer_receivables')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '9. CUSTOMER UDHAAR / RECEIVABLES', 'Outstanding receivables with aging')
  y = drawCustomerReceivables(doc, y, data)

  }
  // ------------------------------------------------ 10. SUPPLIERS
  if (inc('suppliers')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '10. SUPPLIERS', 'Supplier directory')
  y = drawSupplierDirectory(doc, y, data)

  }
  // ------------------------------------------------ 11. SUPPLIER LEDGER (wide)
  if (inc('supplier_ledger')) {
  y = nextPage(doc, 'landscape', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '11. SUPPLIER LEDGER', 'Per-supplier opening / purchases / payments / closing')
  y = drawSupplierLedger(doc, y, data, pageHook)

  }
  // ------------------------------------------------ 12. SUPPLIER PAYABLES
  if (inc('supplier_payables')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '12. SUPPLIER PAYABLES', 'Outstanding payables with aging')
  y = drawSupplierPayables(doc, y, data)

  }
  // ------------------------------------------------ 13. PAYMENTS (wide)
  if (inc('payments')) {
  y = nextPage(doc, 'landscape', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '13. PAYMENTS REGISTER', 'Customer and supplier payments')
  y = drawPayments(doc, y, data, pageHook)

  }
  // ------------------------------------------------ 14. EXPENSES
  if (inc('expenses')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '14. EXPENSES', 'Expense register for the period')
  y = drawExpenses(doc, y, data)

  }
  // ------------------------------------------------ 15. PRODUCTS (wide)
  if (inc('products')) {
  y = nextPage(doc, 'landscape', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '15. PRODUCTS', 'Product catalog with stock and prices')
  y = drawProducts(doc, y, data, pageHook)

  }
  // ------------------------------------------------ 16. CATEGORIES
  if (inc('categories')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '16. CATEGORIES', 'Product categories with product counts')
  y = drawCategories(doc, y, data)

  }
  // ------------------------------------------------ 17. STOCK & VALUATION (wide)
  if (inc('stock_valuation')) {
  y = nextPage(doc, 'landscape', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '17. STOCK & INVENTORY VALUATION', 'Valuation and retail summary per product')
  y = drawStockValuation(doc, y, data, pageHook)

  }
  // ------------------------------------------------ 18. STOCK MOVEMENT (wide)
  if (inc('stock_movement')) {
  y = nextPage(doc, 'landscape', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '18. STOCK MOVEMENT', 'Inventory movement register')
  y = drawStockMovement(doc, y, data, pageHook)

  }
  // ------------------------------------------------ 19. PROFIT & LOSS / COGS
  if (inc('profit_loss')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '19. PROFIT & LOSS STATEMENT', 'P&L waterfall with COGS')
  y = drawProfitLoss(doc, y, data)

  }
  // ------------------------------------------------ 20. VAT / TAX SUMMARY
  if (inc('vat_summary')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '20. VAT / TAX SUMMARY', 'Output VAT, input VAT and net position')
  y = drawVatSummary(doc, y, data)

  }
  // ------------------------------------------------ 21. CREDIT NOTES
  if (inc('credit_notes')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '21. CREDIT NOTES', 'Credit notes issued')
  y = drawCreditNotes(doc, y, data)

  }
  // ------------------------------------------------ 22. DEBIT NOTES
  if (inc('debit_notes')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '22. DEBIT NOTES', 'Debit notes issued')
  y = drawDebitNotes(doc, y, data)

  }
  // ------------------------------------------------ 23. INVOICES
  if (inc('invoices')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '23. INVOICE REGISTER', 'Invoice summary and sequence integrity')
  y = drawInvoices(doc, y, data)

  }
  // ------------------------------------------------ 24. AUDIT TRAIL
  if (inc('audit_trail')) {
  y = nextPage(doc, 'landscape', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '24. AUDIT TRAIL', 'System audit log for the period')
  y = drawAuditTrail(doc, y, data, pageHook)

  }
  // ------------------------------------------------ 25. CANCELLED DOCUMENTS
  if (inc('cancelled_documents')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '25. CANCELLED DOCUMENTS', 'Cancelled transactions in the period')
  y = drawCancelledDocuments(doc, y, data)

  }
  // ------------------------------------------------ 26. IRD READINESS
  if (inc('ird_readiness')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '26. IRD READINESS', 'Tax authority readiness and submission status')
  y = drawIrdReadiness(doc, y, data)

  }
  // ------------------------------------------------ 27. IRD RECONCILIATION
  if (inc('ird_reconciliation')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '27. IRD RECONCILIATION', 'Invoice-level tax authority reconciliation')
  y = drawIrdReconciliation(doc, y, data)

  }
  // ------------------------------------------------ 28. DATA INTEGRITY
  if (inc('data_integrity')) {
  y = nextPage(doc, 'portrait', data)
sectionPages.push(doc.getNumberOfPages());
    y = drawSectionTitle(doc, y, '28. DATA INTEGRITY & QUALITY', 'Warnings, missing data and export notes')
  y = drawIntegrity(doc, y, data)

  }
  // Redraw TOC on page 2 with accurate section page numbers.
  if (sectionPages.length === 28) {
    doc.setPage(2)
    drawTocPage(doc, PDF_SPACING.pageMargin, data, sectionPages)
  }

  // Global footer pass: draw footer on every content page except the cover.
  const totalPages = doc.getNumberOfPages()
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p)
    drawPageFooter(doc, data, p)
  }

  finalizePdf(doc)
  return doc
}

/** Cover page (portrait) — business identity + report framing. */
function coverPage(doc: Page, data: MegaReportData): void {
  const meta = data.meta
  const biz = meta.business
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = PDF_SPACING.pageMargin
  const inner = pageWidth - margin * 2
  const centerX = pageWidth / 2

  // Full-bleed top band with subtle brand gradient feel (single tone for BW safety)
  doc.setFillColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.rect(0, 0, pageWidth, 62, 'F')
  // Accent rule under the band
  doc.setFillColor(PDF_COLORS.accent700[0], PDF_COLORS.accent700[1], PDF_COLORS.accent700[2])
  doc.rect(0, 62, pageWidth, 1.6, 'F')

  // Brand at top of band
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text('Inventory Lite', margin, 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(203, 213, 225)
  doc.text('Business Accounting & Inventory Suite', margin, 40)

  // Report type at right of band
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('MEGA BUSINESS REPORT', pageWidth - margin, 34, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(203, 213, 225)
  doc.text('Comprehensive One-Click Export', pageWidth - margin, 40, { align: 'right' })

  // Logo placeholder — a clean rounded square with the business initial.
  const logoSize = 26
  const logoX = centerX - logoSize / 2
  const logoY = 88
  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 5, 5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  const initial = (safeText(biz.name, 'B').trim().charAt(0) || 'B').toUpperCase()
  doc.text(initial, centerX, logoY + logoSize / 2 + 5, { align: 'center' })

  // Business name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.text(truncateText(safeText(biz.name, 'Inventory Lite Store'), 44), centerX, logoY + logoSize + 16, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text('Financial Year Report', centerX, logoY + logoSize + 26, { align: 'center' })

  // Metadata block — two-column ledger of key details.
  const metaY = logoY + logoSize + 42
  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
  const blockHeight = 62
  doc.roundedRect(margin, metaY, inner, blockHeight, 3, 3, 'FD')

  const infoLines: { label: string; value: string }[] = []
  infoLines.push({ label: 'Financial Year', value: safeText(meta.fiscalYear) })
  infoLines.push({ label: 'Report Period', value: safeText(meta.periodLabel) })
  if (biz.address) infoLines.push({ label: 'Address', value: safeText(biz.address) })
  if (biz.phone) infoLines.push({ label: 'Phone', value: safeText(biz.phone) })
  if (biz.email) infoLines.push({ label: 'Email', value: safeText(biz.email) })
  if (biz.panNumber) infoLines.push({ label: 'PAN', value: safeText(biz.panNumber) })
  if (biz.vatNumber) infoLines.push({ label: 'VAT', value: safeText(biz.vatNumber) })
  if (biz.currency) infoLines.push({ label: 'Currency', value: safeText(biz.currency) })

  const innerY = drawMetadata(doc, {
    startY: metaY + 8,
    lines: infoLines.map((l) => ({ label: l.label, value: l.value })),
    columnCount: 2,
  })
  void innerY

  // Generated + disclaimer footer (centered)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(`Generated: ${formatBsDateTime(meta.generatedAt)}`, centerX, pageHeight - 32, { align: 'center' })
  doc.setTextColor(PDF_COLORS.ink600[0], PDF_COLORS.ink600[1], PDF_COLORS.ink600[2])
  doc.text(
    'Prepared for internal business management purposes.',
    centerX,
    pageHeight - 26,
    { align: 'center' },
  )
  doc.text(
    'This report does not constitute official tax certification or IRD approval.',
    centerX,
    pageHeight - 21,
    { align: 'center' },
  )
}

function drawTocPage(doc: Page, startY: number, data?: MegaReportData, sectionPages?: number[]): void {
  let y = startY + 4
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.text('TABLE OF CONTENTS', margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(data ? `${safeText(data.meta.business.name)}  |  FY ${safeText(data.meta.fiscalYear)}` : '', margin, y + 4)
  y += 14

  const sections: { n: string; title: string }[] = [
    { n: '1', title: 'Executive Summary' },
    { n: '2', title: 'Financial Reconciliation' },
    { n: '3', title: 'Sales Register' },
    { n: '4', title: 'Purchase Register' },
    { n: '5', title: 'Sales Returns' },
    { n: '6', title: 'Purchase Returns & Adjustments' },
    { n: '7', title: 'Customers' },
    { n: '8', title: 'Customer Ledger' },
    { n: '9', title: 'Customer Receivables' },
    { n: '10', title: 'Suppliers' },
    { n: '11', title: 'Supplier Ledger' },
    { n: '12', title: 'Supplier Payables' },
    { n: '13', title: 'Payments Register' },
    { n: '14', title: 'Expenses' },
    { n: '15', title: 'Products' },
    { n: '16', title: 'Categories' },
    { n: '17', title: 'Stock & Inventory Valuation' },
    { n: '18', title: 'Stock Movement' },
    { n: '19', title: 'Profit & Loss Statement' },
    { n: '20', title: 'VAT / Tax Summary' },
    { n: '21', title: 'Credit Notes' },
    { n: '22', title: 'Debit Notes' },
    { n: '23', title: 'Invoice Register' },
    { n: '24', title: 'Audit Trail' },
    { n: '25', title: 'Cancelled Documents' },
    { n: '26', title: 'IRD Readiness' },
    { n: '27', title: 'IRD Reconciliation' },
    { n: '28', title: 'Data Integrity & Quality' },
  ]

  const columns = 2
  const colGap = 20
  const colWidth = (pageWidth - margin * 2 - colGap) / columns
  const rowH = 9

  sections.forEach((s, idx) => {
    const col = Math.floor(idx / Math.ceil(sections.length / columns))
    const row = idx % Math.ceil(sections.length / columns)
    const x = margin + col * (colWidth + colGap)
    const lineY = y + row * rowH
    const pageNum = sectionPages ? sectionPages[idx] : null

    // Number
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(PDF_COLORS.accent700[0], PDF_COLORS.accent700[1], PDF_COLORS.accent700[2])
    doc.text(`${s.n}.`, x, lineY)

    // Title
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(PDF_COLORS.ink800[0], PDF_COLORS.ink800[1], PDF_COLORS.ink800[2])
    doc.text(truncateText(s.title, 30), x + 8, lineY)

    // Page number right-aligned
    if (pageNum !== null) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
      doc.text(String(pageNum), x + colWidth, lineY, { align: 'right' })
    }

    // Leader dots between title and page number
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(PDF_COLORS.ink300[0], PDF_COLORS.ink300[1], PDF_COLORS.ink300[2])
    const dotsX = x + 8 + doc.getTextWidth(truncateText(s.title, 30)) + 4
    const dotsEnd = (x + colWidth) - (pageNum !== null ? doc.getTextWidth(String(pageNum)) + 6 : 4)
    if (dotsEnd > dotsX) {
      const nDots = Math.floor((dotsEnd - dotsX) / 1.8)
      doc.text('.'.repeat(Math.max(0, nDots)), dotsX, lineY - 0.5)
    }
  })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(
    'All figures are in NPR and derived from the application’s authoritative records.',
    margin,
    y + rowsHeight(sections.length, columns) * rowH + 10,
  )
}

function rowsHeight(count: number, columns: number): number {
  return Math.ceil(count / columns)
}

/** Render a KPI grid on the exec summary page (premium dashboard cards). */
function drawKpiGrid(doc: Page, y: number, data: MegaReportData): number {
  const k = data.kpis
  const profit = data.profitability

  const items: { label: string; value: string }[] = [
    { label: 'Total Sales', value: formatNpr(k.totalSales) },
    { label: 'Total Purchases', value: formatNpr(k.totalPurchases) },
    { label: 'Net Sales', value: formatNpr(profit.netSales) },
    { label: 'COGS', value: formatNpr(k.cogs) },
    { label: 'Gross Profit', value: formatNpr(k.grossProfit) },
    { label: 'Net Profit', value: formatNpr(k.netProfit) },
    { label: 'Expenses', value: formatNpr(k.expenses) },
    { label: 'Stock Value', value: formatNpr(k.stockValue) },
    { label: 'Receivables', value: formatNpr(k.outstandingCustomerCredit) },
    { label: 'Payables', value: formatNpr(k.supplierPayables) },
    { label: 'Output VAT', value: formatNpr(k.outputVat) },
    { label: 'Input VAT', value: formatNpr(k.inputVat) },
  ]

  const cols = 4
  const gap = 5
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const colWidth = (pageWidth - margin * 2 - gap * (cols - 1)) / cols
  const cellHeight = 20

  // Small caption row above the cards.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text('PERFORMANCE DASHBOARD', margin, y)
  y += 4

  items.forEach((it, idx) => {
    const row = Math.floor(idx / cols)
    const col = idx % cols
    const x = margin + col * (colWidth + gap)
    const topY = y + 3 + row * (cellHeight + 5)

    doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
    doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
    doc.roundedRect(x, topY, colWidth, cellHeight, 2.5, 2.5, 'FD')

    // Thin accent stripe on the left edge of each card
    doc.setFillColor(PDF_COLORS.accent700[0], PDF_COLORS.accent700[1], PDF_COLORS.accent700[2])
    doc.rect(x, topY, 1.6, cellHeight, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text(truncateText(it.label.toUpperCase(), 24), x + 5, topY + 6)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
    doc.text(truncateText(it.value, 18), x + 5, topY + 15)
  })

  const rowsUsed = Math.ceil(items.length / cols)
  return y + 3 + rowsUsed * (cellHeight + 5) + 4
}

/** Executive summary charts — only drawn when data is meaningful. */
function drawExecutiveCharts(doc: Page, y: number, data: MegaReportData): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const inner = pageWidth - margin * 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text('PERFORMANCE CHARTS', margin, y)
  y += 2

  // A. Sales vs Purchases (paired bars) — one tall bar per period bucket.
  const sales = data.salesRegister.rows
  const purchases = data.purchaseRegister.rows
  const trend = buildMonthlyTrend(sales, purchases)

  const half = (inner - 6) / 2

  if (trend.length > 0) {
    y = drawBarChart(
      doc,
      { title: 'Monthly Sales vs Purchases', unitLabel: 'NPR', paired: true, legend: ['Purchases', 'Sales'], formatValue: formatNpr },
      trend.map((t) => ({ label: t.label, value: t.sales, value2: t.purchases })),
      margin,
      y,
      44,
      inner,
    )
    y += 6
  } else {
    y = drawBarChart(
      doc,
      { title: 'Monthly Sales vs Purchases' },
      [],
      margin,
      y,
      44,
      inner,
    )
    y += 6
  }

  // B. Revenue / COGS / Gross Profit comparison
  const revCogs = [
    { label: 'Net Sales', value: data.profitability.netSales },
    { label: 'COGS', value: data.profitability.cogs },
    { label: 'Gross Profit', value: data.profitability.grossProfit },
  ]
  y = drawBarChart(
    doc,
    { title: 'Revenue / COGS / Gross Profit', unitLabel: 'NPR', legend: ['Amount', ''], formatValue: formatNpr },
    revCogs,
    margin,
    y,
    40,
    half,
  )

  // C. Expense breakdown (horizontal) — only when expense data exists.
  const expenseChartX = margin + half + 6
  y = drawHorizontalBars(
    doc,
    { title: 'Expense Breakdown', formatValue: formatNpr },
    data.expenses.map((e) => ({ label: e.category || 'General', value: e.amount })).slice(0, 6),
    expenseChartX,
    y,
    half,
  )

  return y + 4
}

/** Aggregate sales/purchases by month and return up to N labeled buckets. */
function buildMonthlyTrend(
  sales: { date: string; taxableAmount: number }[],
  purchases: { date: string; taxableAmount: number }[],
): { label: string; sales: number; purchases: number }[] {
  const map = new Map<string, { sales: number; purchases: number }>()
  const keyOf = (dateStr: string): string => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const labelOf = (key: string): string => {
    const parts = key.split('-')
    return `${parts[0].slice(2)}-${parts[1]}`
  }
  sales.forEach((r) => {
    const key = keyOf(r.date)
    if (!key) return
    const e = map.get(key) || { sales: 0, purchases: 0 }
    e.sales += Number(r.taxableAmount) || 0
    map.set(key, e)
  })
  purchases.forEach((r) => {
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

function drawReconciliationSummary(doc: Page, y: number, data: MegaReportData): number {
  const checks = data.reconciliation
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const inner = pageWidth - margin * 2

  y = drawTotalsBar(doc, {
    startY: y,
    text:
      `${checks.filter((r) => r.status === 'BALANCED').length} BALANCED | ` +
      `${checks.filter((r) => r.status === 'WARNING').length} WARNING | ` +
      `${checks.filter((r) => r.status === 'MISMATCH').length} MISMATCH | ` +
      `Total Checks: ${formatNumber(checks.length)}`,
    textColor: data.integrity.hasIssues ? PDF_COLORS.negative800 : PDF_COLORS.positive800,
  })

  if (checks.length === 0) {
    return drawEmptyNote(doc, y, 'No reconciliation checks available for the selected period.')
  }

  // Block layout: each check rendered as a readable card. The message always
  // gets the full width and word-wraps — never squeezed into a narrow column.
  checks.forEach((r, idx) => {
    const blockH = 34 + Math.max(0, Math.ceil((safeText(r.message).length / 78) - 1)) * 5
    if (y + blockH > 275) {
      y = nextPage(doc, 'portrait', data)
    }

    const topY = y + 2
    const statusColor =
      r.status === 'BALANCED'
        ? PDF_COLORS.positive800
        : r.status === 'MISMATCH'
          ? PDF_COLORS.negative800
          : PDF_COLORS.accent700

    doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
    doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
    doc.roundedRect(margin, topY, inner, blockH, 2.5, 2.5, 'FD')

    // Left status stripe
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
    doc.rect(margin, topY, 2, blockH, 'F')

    // Header line: index, check name, category, status badge
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
    doc.text(
      `${idx + 1}. ${truncateText(safeText(r.checkName).toUpperCase(), 90)}`,
      margin + 7,
      topY + 6,
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text(`Category: ${truncateText(safeText(r.category), 40)}`, margin + 7, topY + 11.5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
    doc.text(truncateText(safeText(r.status), 20), pageWidth - margin - 6, topY + 6, { align: 'right' })

    // Metric line
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
    const metricLine =
      `Expected: ${formatNpr(r.expected)}   |   Actual: ${formatNpr(r.actual)}   |   ` +
      `Difference: ${formatNpr(r.difference)}`
    doc.text(metricLine, margin + 7, topY + 17)

    // Divider
    doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
    doc.setLineWidth(0.2)
    doc.line(margin + 7, topY + 20, pageWidth - margin - 7, topY + 20)

    // Message (wrapped, full width)
    doc.setFontSize(7.5)
    doc.setTextColor(PDF_COLORS.ink600[0], PDF_COLORS.ink600[1], PDF_COLORS.ink600[2])
    const msgLines = doc.splitTextToSize(truncateText(safeText(r.message), 260), inner - 16)
    doc.text(msgLines, margin + 7, topY + 24)

    y = topY + blockH + 4
  })

  return y
}

function drawSalesRegister(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const s = data.salesRegister
  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Invoice (Active)', value: formatNumber(s.summary.totalInvoices) },
      { label: 'Cancelled', value: formatNumber(s.summary.totalCancelled) },
      { label: 'Total VAT', value: formatNpr(s.summary.totalVat) },
    ],
  })
  y = drawTotalsBar(doc, {
    startY: y,
    text:
      `Total Sales: ${formatNpr(s.summary.totalSales)} | ` +
      `Taxable: ${formatNpr(s.summary.totalTaxableAmount)} | ` +
      `Discount: ${formatNpr(s.summary.totalDiscount)}`,
  })

  if (s.rows.length === 0) return drawEmptyNote(doc, y, 'No records found for the selected period.')

  const body = s.rows.map((r: MegaInvoiceRow) => [
    safeDate(r.date),
    safeText(r.invoiceNumber),
    safeText(r.customerName),
    formatNpr(r.taxableAmount),
    formatNpr(r.discount),
    formatNpr(r.vat),
    formatNpr(r.total),
    formatNpr(r.paidAmount),
    formatNpr(r.outstanding),
    safeText(r.paymentStatus),
  ])

  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 22 },
      { head: 'Invoice #', width: 34 },
      { head: 'Customer', width: 44 },
      { head: 'Taxable', align: 'right', width: 24 },
      { head: 'Discount', align: 'right', width: 24 },
      { head: 'VAT', align: 'right', width: 22 },
      { head: 'Total', align: 'right', width: 26 },
      { head: 'Paid', align: 'right', width: 24 },
      { head: 'Due', align: 'right', width: 24 },
      { head: 'Status', width: 26 },
    ],
    body,
    totals: [
      {
        cells: [
          '', 'TOTAL', '',
          formatNpr(s.summary.totalTaxableAmount),
          formatNpr(s.summary.totalDiscount),
          formatNpr(s.summary.totalVat),
          formatNpr(s.summary.totalSales), '', '', '',
        ],
      },
    ],
    fontScale: 'dense',
  })
}

function drawPurchaseRegister(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const p = data.purchaseRegister
  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Total Purchases', value: formatNpr(p.summary.totalPurchases) },
      { label: 'Taxable', value: formatNpr(p.summary.taxablePurchases) },
      { label: 'Input VAT', value: formatNpr(p.summary.inputVat) },
    ],
  })

  if (p.rows.length === 0) return drawEmptyNote(doc, y, 'No records found for the selected period.')

  const body = p.rows.map((r: any) => [
    safeDate(r.date),
    safeText(r.purchaseReference),
    safeText(r.supplierName),
    formatNpr(r.taxableAmount),
    formatNpr(r.discount),
    formatNpr(r.vatAmount),
    formatNpr(r.total),
    formatNpr(r.paidAmount),
    formatNpr(r.outstanding),
    safeText(r.paymentStatus),
  ])

  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 22 },
      { head: 'Purchase #', width: 34 },
      { head: 'Supplier', width: 44 },
      { head: 'Taxable', align: 'right', width: 24 },
      { head: 'Discount', align: 'right', width: 24 },
      { head: 'VAT', align: 'right', width: 22 },
      { head: 'Total', align: 'right', width: 26 },
      { head: 'Paid', align: 'right', width: 24 },
      { head: 'Due', align: 'right', width: 24 },
      { head: 'Status', width: 24 },
    ],
    body,
    totals: [
      {
        cells: [
          '', 'TOTAL', '',
          formatNpr(p.summary.taxablePurchases), '', formatNpr(p.summary.inputVat),
          formatNpr(p.summary.totalPurchases), '', '', '',
        ],
      },
    ],
    fontScale: 'dense',
  })
}

function drawReturns(doc: Page, y: number, data: MegaReportData): number {
  const items = data.returnsAdjustments.filter((r) => r.type === 'SALES_RETURN')
  y = drawTotalsBar(doc, {
    startY: y,
    text: `Total Sales Returns (Period): ${formatNpr(data.kpis.salesReturns)}`,
  })
  if (items.length === 0) return drawEmptyNote(doc, y, 'No sales returns recorded for the selected period.')

  const body = items.map((r) => [
    safeDate(r.date),
    safeText(r.originalDocumentNumber),
    formatNpr(r.amount),
    safeText(r.reason),
    safeText(r.user),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Date', width: 24 },
      { head: 'Reference', width: 44 },
      { head: 'Refund Amount', align: 'right' },
      { head: 'Reason' },
      { head: 'By', width: 30 },
    ],
    body,
    totals: [{ cells: ['', 'TOTAL', formatNpr(data.kpis.salesReturns), '', ''] }],
  })
}

function drawReturnsAdjustments(doc: Page, y: number, data: MegaReportData): number {
  const items = data.returnsAdjustments
  if (items.length === 0) return drawEmptyNote(doc, y, 'No returns or adjustments recorded for the selected period.')

  const body = items.map((r) => [
    safeDate(r.date),
    safeText(r.type),
    safeText(r.originalDocumentNumber),
    formatNpr(r.amount),
    safeText(r.reason),
    safeText(r.ledgerImpact),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Date', width: 24 },
      { head: 'Type', width: 34 },
      { head: 'Reference', width: 40 },
      { head: 'Amount', align: 'right' },
      { head: 'Reason' },
      { head: 'Ledger Impact', width: 36 },
    ],
    body,
  })
}

function drawCustomerDirectory(doc: Page, y: number, data: MegaReportData): number {
  // Customer directory derived from ledger names.
  const ledgers = data.customerLedgers
  if (ledgers.length === 0) return drawEmptyNote(doc, y, 'No customers recorded for this business.')

  const body = ledgers.map((c) => [
    safeText(c.customerName),
    safeText(c.panNumber ?? '—'),
    safeText(c.phone ?? '—'),
    formatNpr(c.closingBalance),
    safeText(c.reconciliationStatus),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Customer' },
      { head: 'PAN' },
      { head: 'Phone' },
      { head: 'Balance', align: 'right' },
      { head: 'Status', width: 34 },
    ],
    body,
  })
}

function drawCustomerLedger(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const ledgers = data.customerLedgers
  if (ledgers.length === 0) return drawEmptyNote(doc, y, 'No customer ledger activity for the selected period.')

  const body = ledgers.map((c) => [
    safeText(c.customerName),
    formatNpr(c.openingBalance),
    formatNpr(c.invoicesTotal),
    formatNpr(c.paymentsTotal),
    formatNpr(c.creditNotesTotal + c.returnsTotal),
    formatNpr(c.closingBalance),
    formatNpr(c.outstandingAmount),
  ])
  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Customer', width: 56 },
      { head: 'Opening', align: 'right', width: 28 },
      { head: 'Invoices', align: 'right', width: 28 },
      { head: 'Payments', align: 'right', width: 28 },
      { head: 'Credit/Returns', align: 'right', width: 32 },
      { head: 'Closing', align: 'right', width: 28 },
      { head: 'Outstanding', align: 'right', width: 28 },
    ],
    body,
    fontScale: 'dense',
  })
}

function drawCustomerReceivables(doc: Page, y: number, data: MegaReportData): number {
  const ledgers = data.customerLedgers.filter((c) => c.outstandingAmount > 0.005)
  y = drawTotalsBar(doc, {
    startY: y,
    text: `Total Outstanding Receivables: ${formatNpr(data.kpis.outstandingCustomerCredit)} | Overpayments: ${formatNpr(data.kpis.customerOverpayments)}`,
  })
  if (ledgers.length === 0) return drawEmptyNote(doc, y, 'No outstanding customer receivables for the selected period.')

  const body = ledgers.map((c) => [
    safeText(c.customerName),
    formatNumber(c.aging.days0To30),
    formatNumber(c.aging.days31To60),
    formatNumber(c.aging.days61To90),
    formatNumber(c.aging.days90Plus),
    formatNpr(c.outstandingAmount),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Customer' },
      { head: '0-30', align: 'right' },
      { head: '31-60', align: 'right' },
      { head: '61-90', align: 'right' },
      { head: '90+', align: 'right' },
      { head: 'Outstanding (Rs)', align: 'right' },
    ],
    body,
    totals: [
      {
        cells: [
          'TOTAL',
          formatNumber(ledgers.reduce((a, c) => a + c.aging.days0To30, 0)),
          formatNumber(ledgers.reduce((a, c) => a + c.aging.days31To60, 0)),
          formatNumber(ledgers.reduce((a, c) => a + c.aging.days61To90, 0)),
          formatNumber(ledgers.reduce((a, c) => a + c.aging.days90Plus, 0)),
          formatNpr(ledgers.reduce((a, c) => a + c.outstandingAmount, 0)),
        ],
      },
    ],
  })
}

function drawSupplierDirectory(doc: Page, y: number, data: MegaReportData): number {
  const ledgers = data.supplierLedgers
  if (ledgers.length === 0) return drawEmptyNote(doc, y, 'No suppliers recorded for this business.')

  const body = ledgers.map((s) => [
    safeText(s.supplierName),
    safeText(s.panNumber ?? '—'),
    safeText(s.phone ?? '—'),
    formatNpr(s.closingPayable),
    safeText(s.reconciliationStatus),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Supplier' },
      { head: 'PAN' },
      { head: 'Phone' },
      { head: 'Payable Balance', align: 'right' },
      { head: 'Status', width: 36 },
    ],
    body,
  })
}

function drawSupplierLedger(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const ledgers = data.supplierLedgers
  if (ledgers.length === 0) return drawEmptyNote(doc, y, 'No supplier ledger activity for the selected period.')

  const body = ledgers.map((s) => [
    safeText(s.supplierName),
    formatNpr(s.openingPayable),
    formatNpr(s.purchasesTotal),
    formatNpr(s.paymentsTotal),
    formatNpr(s.purchaseReturnsTotal + s.adjustmentsTotal),
    formatNpr(s.closingPayable),
    formatNpr(s.closingPayable - (s.overpaymentCredit || 0)),
  ])
  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Supplier', width: 56 },
      { head: 'Opening', align: 'right', width: 28 },
      { head: 'Purchases', align: 'right', width: 28 },
      { head: 'Payments', align: 'right', width: 28 },
      { head: 'Returns/Adj', align: 'right', width: 32 },
      { head: 'Closing', align: 'right', width: 28 },
      { head: 'Net Payable', align: 'right', width: 28 },
    ],
    body,
    fontScale: 'dense',
  })
}

function drawSupplierPayables(doc: Page, y: number, data: MegaReportData): number {
  const ledgers = data.supplierLedgers.filter((s) => s.closingPayable > 0.005)
  y = drawTotalsBar(doc, {
    startY: y,
    text: `Total Supplier Payables: ${formatNpr(data.kpis.supplierPayables)} | Overpayments: ${formatNpr(data.kpis.supplierOverpayments)}`,
  })
  if (ledgers.length === 0) return drawEmptyNote(doc, y, 'No outstanding supplier payables for the selected period.')

  const body = ledgers.map((s) => [
    safeText(s.supplierName),
    formatNumber(s.aging.days0To30),
    formatNumber(s.aging.days31To60),
    formatNumber(s.aging.days61To90),
    formatNumber(s.aging.days90Plus),
    formatNpr(s.closingPayable),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Supplier' },
      { head: '0-30', align: 'right' },
      { head: '31-60', align: 'right' },
      { head: '61-90', align: 'right' },
      { head: '90+', align: 'right' },
      { head: 'Payable (Rs)', align: 'right' },
    ],
    body,
  })
}

function drawPayments(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const payments = data.paymentsDetail
  if (payments.length === 0) return drawEmptyNote(doc, y, 'No payment transactions recorded for the selected period.')

  const body = payments.map((p) => [
    safeDate(p.date),
    p.entityType,
    safeText(p.entityName),
    safeText(p.reference),
    formatNpr(p.amount),
    safeText(p.method),
    safeText(p.status),
    safeText(p.createdBy),
  ])
  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 22 },
      { head: 'Type', width: 22 },
      { head: 'Entity', width: 42 },
      { head: 'Reference', width: 42 },
      { head: 'Amount', align: 'right', width: 28 },
      { head: 'Method', width: 30 },
      { head: 'Status', width: 26 },
      { head: 'By', width: 34 },
    ],
    body,
    totals: [
      {
        cells: ['', '', '', 'TOTAL', formatNpr(payments.reduce((a, p) => a + p.amount, 0)), '', '', ''],
      },
    ],
    fontScale: 'dense',
  })
}

function drawExpenses(doc: Page, y: number, data: MegaReportData): number {
  const expenses = data.expenses
  y = drawTotalsBar(doc, {
    startY: y,
    text: `Total Expenses (Period): ${formatNpr(data.kpis.expenses)}`,
  })
  if (expenses.length === 0) return drawEmptyNote(doc, y, 'No expenses recorded for the selected period.')

  const body = expenses.map((e) => [
    safeDate(e.date),
    safeText(e.title),
    safeText(e.category),
    formatNpr(e.amount),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Date', width: 24 },
      { head: 'Title' },
      { head: 'Category', width: 34 },
      { head: 'Amount', align: 'right' },
    ],
    body,
    totals: [{ cells: ['', 'TOTAL', '', formatNpr(expenses.reduce((a, e) => a + e.amount, 0))] }],
  })
}

function drawProducts(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const products = data.products
  if (products.length === 0) return drawEmptyNote(doc, y, 'No products recorded for this business.')

  const body = products.map((p) => [
    safeText(p.name),
    safeText(p.sku),
    safeText(p.categoryName),
    formatNumber(p.stockQuantity),
    formatNpr(p.purchasePrice),
    formatNpr(p.sellingPrice),
    safeText(p.isActive ? 'Active' : 'Inactive'),
  ])
  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Product', width: 60 },
      { head: 'SKU', width: 34 },
      { head: 'Category', width: 40 },
      { head: 'Stock', align: 'right', width: 22 },
      { head: 'Cost (Rs)', align: 'right', width: 32 },
      { head: 'Selling (Rs)', align: 'right', width: 32 },
      { head: 'Status', width: 24 },
    ],
    body,
    fontScale: 'dense',
  })
}

function drawCategories(doc: Page, y: number, data: MegaReportData): number {
  const categories = data.categories
  if (categories.length === 0) return drawEmptyNote(doc, y, 'No categories recorded for this business.')

  const body = categories.map((c) => [
    safeText(c.name),
    formatNumber(c.productCount),
    safeText(c.description),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Category' },
      { head: 'Products', align: 'right', width: 32 },
      { head: 'Description' },
    ],
    body,
  })
}

function drawStockValuation(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const inv = data.inventory
  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Closing Stock Value', value: formatNpr(inv.summary.closingStockValue) },
      { label: 'Retail Value', value: formatNpr(inv.summary.totalRetailValue) },
      { label: 'COGS', value: formatNpr(inv.summary.totalCogs) },
      { label: 'Potential Margin', value: formatPercent(inv.summary.potentialGrossMarginPercent) },
    ],
  })
  y = drawTotalsBar(doc, {
    startY: y,
    text: `Opening: ${formatNpr(inv.summary.openingStockValue)} | In: ${formatNpr(inv.summary.stockInValue)} | Out: ${formatNpr(inv.summary.stockOutValue)} | Damage: ${formatNpr(inv.summary.damagedValue)} | Missing Cost Data: ${formatNumber(inv.summary.costDataMissingCount)}`,
  })

  if (inv.products.length === 0) return drawEmptyNote(doc, y, 'No stock valuation data available.')

  const body = inv.products.map((p) => [
    safeText(p.name),
    safeText(p.sku),
    formatNumber(p.stockQuantity),
    formatNpr(p.unitCost),
    formatNpr(p.closingInventoryValue),
    formatNpr(p.sellingPrice),
    formatNpr(p.retailValue),
    formatNpr(p.potentialGrossMargin),
    safeText(p.isCostMissing ? 'Missing' : 'OK'),
  ])
  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Product', width: 52 },
      { head: 'SKU', width: 30 },
      { head: 'Qty', align: 'right', width: 18 },
      { head: 'Unit Cost', align: 'right', width: 24 },
      { head: 'Clos. Value', align: 'right', width: 26 },
      { head: 'Selling', align: 'right', width: 24 },
      { head: 'Retail', align: 'right', width: 26 },
      { head: 'Margin', align: 'right', width: 26 },
      { head: 'Cost', width: 18 },
    ],
    body,
    totals: [
      {
        cells: [
          'TOTAL', '',
          formatNumber(inv.products.reduce((a, p) => a + p.stockQuantity, 0)),
          '', formatNpr(inv.summary.closingStockValue), '',
          formatNpr(inv.summary.totalRetailValue),
          formatNpr(inv.summary.totalPotentialMargin), '',
        ],
      },
    ],
    fontScale: 'dense',
  })
}

function drawStockMovement(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const movements = data.inventory.movements
  if (movements.length === 0) return drawEmptyNote(doc, y, 'No stock movements recorded for the selected period.')

  const body = movements.map((m) => [
    safeDate(m.date),
    safeText(m.productName),
    safeText(m.sku),
    safeText(m.type),
    formatSignedQuantity(m.quantity),
    formatNumber(m.previousQuantity),
    formatNumber(m.newQuantity),
    safeText(m.reason),
  ])
  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 22 },
      { head: 'Product', width: 46 },
      { head: 'SKU', width: 32 },
      { head: 'Type', width: 26 },
      { head: 'Qty', align: 'right', width: 20 },
      { head: 'From', align: 'right', width: 20 },
      { head: 'To', align: 'right', width: 20 },
      { head: 'Reason' },
    ],
    body,
    fontScale: 'dense',
  })
}

function drawProfitLoss(doc: Page, y: number, data: MegaReportData): number {
  const p = data.profitability
  const k = data.kpis

  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: 'Gross Sales', value: formatNpr(p.grossSales) },
    { label: 'Discounts', value: formatNpr(p.discounts) },
    { label: 'Sales Returns', value: formatNpr(p.salesReturns) },
    { label: 'NET SALES', value: formatNpr(p.netSales), strong: true },
    { label: 'Cost of Goods Sold (COGS)', value: formatNpr(p.cogs) },
    { label: 'GROSS PROFIT', value: formatNpr(k.grossProfit), strong: true },
    { label: 'Gross Margin %', value: formatPercent(p.grossMarginPercent) },
    { label: 'Operating Expenses', value: formatNpr(p.expenses) },
    { label: 'NET PROFIT', value: formatNpr(p.netProfit), strong: true },
    { label: 'Net Margin %', value: formatPercent(p.netMarginPercent) },
  ]

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  let yy = y
  rows.forEach((r) => {
    doc.setFillColor(r.strong ? PDF_COLORS.canvas100[0] : PDF_COLORS.canvas50[0], r.strong ? PDF_COLORS.canvas100[1] : PDF_COLORS.canvas50[1], r.strong ? PDF_COLORS.canvas100[2] : PDF_COLORS.canvas50[2])
    doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
    doc.rect(margin, yy, pageWidth - margin * 2, 12, 'FD')
    doc.setFont('helvetica', r.strong ? 'bold' : 'normal')
    doc.setFontSize(r.strong ? 10 : 9)
    doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
    doc.text(truncateText(r.label, 60), margin + 4, yy + 8)
    doc.setFont('helvetica', r.strong ? 'bold' : 'normal')
    doc.text(truncateText(r.value, 20), pageWidth - margin - 4, yy + 8, { align: 'right' })
    yy += 12
  })

  if (k.costDataMissingCount > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.negative800[0], PDF_COLORS.negative800[1], PDF_COLORS.negative800[2])
    doc.text(
      `Note: ${formatNumber(k.costDataMissingCount)} product(s) are missing cost data, so COGS/gross profit may be understated.`,
      margin,
      yy + 6,
    )
  }
  return yy + 8
}

function drawVatSummary(doc: Page, y: number, data: MegaReportData): number {
  const v = data.vatSummary
  const rows: { label: string; value: string; strong?: boolean }[] = [
    { label: 'Taxable Sales', value: formatNpr(v.taxableSales) },
    { label: 'Output VAT Charged', value: formatNpr(v.outputVat), strong: true },
    { label: 'Taxable Purchases', value: formatNpr(v.taxablePurchases) },
    { label: 'Input VAT Paid', value: formatNpr(v.inputVat), strong: true },
    { label: `VAT Rate (Default)`, value: formatPercent(v.vatRate) },
    { label: 'NET VAT POSITION', value: formatNpr(v.netVatPosition), strong: true },
    { label: 'Status', value: v.status === 'PAYABLE' ? 'VAT Payable' : 'Refundable Credit', strong: true },
  ]
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  let yy = y
  rows.forEach((r) => {
    doc.setFillColor(r.strong ? PDF_COLORS.canvas100[0] : PDF_COLORS.canvas50[0], r.strong ? PDF_COLORS.canvas100[1] : PDF_COLORS.canvas50[1], r.strong ? PDF_COLORS.canvas100[2] : PDF_COLORS.canvas50[2])
    doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
    doc.rect(margin, yy, pageWidth - margin * 2, 12, 'FD')
    doc.setFont('helvetica', r.strong ? 'bold' : 'normal')
    doc.setFontSize(r.strong ? 10 : 9)
    doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
    doc.text(truncateText(r.label, 55), margin + 4, yy + 8)
    doc.text(truncateText(r.value, 20), pageWidth - margin - 4, yy + 8, { align: 'right' })
    yy += 12
  })
  return yy + 4
}

function drawCreditNotes(doc: Page, y: number, data: MegaReportData): number {
  const notes = data.creditNotes
  if (notes.length === 0) return drawEmptyNote(doc, y, 'No credit notes issued for the selected period.')

  const body = notes.map((n) => [
    safeText(n.creditNoteNumber),
    safeDate(n.issuedDate),
    safeText(n.customerName),
    safeText(n.invoiceNumber),
    formatNpr(n.taxableAmount),
    formatNpr(n.vatAmount),
    formatNpr(n.totalAmount),
    safeText(n.reason),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Credit Note #', width: 40 },
      { head: 'Date', width: 24 },
      { head: 'Customer', width: 34 },
      { head: 'Invoice', width: 28 },
      { head: 'Taxable', align: 'right' },
      { head: 'VAT', align: 'right' },
      { head: 'Total', align: 'right' },
      { head: 'Reason' },
    ],
    body,
    totals: [
      {
        cells: ['TOTAL', '', '', '',
          formatNpr(notes.reduce((a, n) => a + n.taxableAmount, 0)),
          formatNpr(notes.reduce((a, n) => a + n.vatAmount, 0)),
          formatNpr(notes.reduce((a, n) => a + n.totalAmount, 0)), ''],
      },
    ],
    fontScale: 'dense',
  })
}

function drawDebitNotes(doc: Page, y: number, data: MegaReportData): number {
  const notes = data.debitNotes
  if (notes.length === 0) return drawEmptyNote(doc, y, 'No debit notes issued for the selected period.')

  const body = notes.map((n) => [
    safeText(n.debitNoteNumber),
    safeDate(n.issuedDate),
    safeText(n.supplierName),
    formatNpr(n.taxableAmount),
    formatNpr(n.vatAmount),
    formatNpr(n.totalAmount),
    safeText(n.reason),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Debit Note #', width: 40 },
      { head: 'Date', width: 24 },
      { head: 'Supplier', width: 42 },
      { head: 'Taxable', align: 'right' },
      { head: 'VAT', align: 'right' },
      { head: 'Total', align: 'right' },
      { head: 'Reason' },
    ],
    body,
    totals: [
      {
        cells: ['TOTAL', '', '',
          formatNpr(notes.reduce((a, n) => a + n.taxableAmount, 0)),
          formatNpr(notes.reduce((a, n) => a + n.vatAmount, 0)),
          formatNpr(notes.reduce((a, n) => a + n.totalAmount, 0)), ''],
      },
    ],
  })
}

function drawInvoices(doc: Page, y: number, data: MegaReportData): number {
  const seq = data.invoiceSequence
  const ledgerTotal = data.customerLedgers.reduce((a, c) => a + c.invoicesTotal, 0)

  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Fiscal Year', value: seq.fiscalYear },
      { label: 'Total Issued', value: formatNumber(seq.totalIssued) },
      { label: 'Total Cancelled', value: formatNumber(seq.totalCancelled) },
      { label: 'Sequence Intact', value: seq.isSequenceIntact ? 'Yes' : 'No' },
    ],
  })

  const infoLines = [
    { label: 'First Invoice', value: safeText(seq.firstInvoiceNumber ?? '—') },
    { label: 'Last Invoice', value: safeText(seq.lastInvoiceNumber ?? '—') },
    { label: 'Gaps Detected', value: seq.gapsDetected.length > 0 ? seq.gapsDetected.join(', ') : 'None' },
    { label: 'Duplicates Detected', value: seq.duplicatesDetected.length > 0 ? seq.duplicatesDetected.join(', ') : 'None' },
    { label: 'Ledger Invoices Total', value: formatNpr(ledgerTotal) },
  ]
  return drawMetadata(doc, { startY: y, lines: infoLines, columnCount: 2 })
}

function drawAuditTrail(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const trail = data.auditTrail
  if (trail.length === 0) return drawEmptyNote(doc, y, 'No audit trail entries for the selected period.')

  const body = trail.map((a) => [
    safeDate(a.timestamp),
    safeText(a.action),
    safeText(a.target),
    safeText(a.userId),
    safeText(typeof a.metadata === 'object' && a.metadata ? JSON.stringify(a.metadata).substring(0, 120) : ''),
  ])
  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 22 },
      { head: 'Action', width: 40 },
      { head: 'Target', width: 44 },
      { head: 'User', width: 30 },
      { head: 'Metadata' },
    ],
    body,
    fontScale: 'dense',
  })
}

function drawCancelledDocuments(doc: Page, y: number, data: MegaReportData): number {
  const docs = data.cancelledDocuments
  if (docs.length === 0) return drawEmptyNote(doc, y, 'No cancelled documents for the selected period.')

  const body = docs.map((d) => [
    safeText(d.documentType),
    safeText(d.originalNumber),
    safeDate(d.date),
    formatNpr(d.amount),
    safeText(d.partyName),
    safeText(d.reason),
    safeText(d.cancelledBy),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Type', width: 26 },
      { head: 'Number', width: 40 },
      { head: 'Date', width: 24 },
      { head: 'Amount', align: 'right' },
      { head: 'Party' },
      { head: 'Reason' },
      { head: 'By', width: 26 },
    ],
    body,
    fontScale: 'dense',
  })
}

function drawIrdReadiness(doc: Page, y: number, data: MegaReportData): number {
  const ird = data.ird
  const lines = [
    { label: 'Business', value: ird.businessName },
    { label: 'PAN', value: safeText(ird.panNumber) },
    { label: 'VAT', value: safeText(ird.vatNumber) },
    { label: 'VAT Registration', value: ird.vatRegistrationStatus },
    { label: 'Current Fiscal Year', value: ird.currentFiscalYear },
    { label: 'Electronic Billing', value: ird.electronicBillingStatus },
    { label: 'CBMS Integration', value: ird.cbmsIntegrationStatus },
    { label: 'Submissions', value: `${formatNumber(ird.cbmsSubmissionCount)} (Accepted ${formatNumber(ird.cbmsAcceptedCount)} / Pending ${formatNumber(ird.cbmsPendingCount)} / Failed ${formatNumber(ird.cbmsFailedCount)})` },
    { label: 'Last Attempt', value: safeText(ird.lastAttemptAt ?? '—') },
    { label: 'Approval Verified', value: ird.approvalVerified ? 'Yes' : 'No' },
  ]
  y = drawMetadata(doc, { startY: y, lines, columnCount: 1 })

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(
    'Note: This report reflects current configuration and does not constitute official IRD approval or certification.',
    PDF_SPACING.pageMargin,
    y + 6,
  )
  return y + 8
}

function drawIrdReconciliation(doc: Page, y: number, data: MegaReportData): number {
  const items = data.irdReconciliation
  if (items.length === 0) return drawEmptyNote(doc, y, 'No IRD reconciliation items for the selected period.')

  const body = items.map((r) => [
    safeText(r.invoiceNumber),
    safeDate(r.invoiceDate),
    safeText(r.customerName ?? '—'),
    formatNpr(r.totalAmount),
    safeText(r.localStatus),
    safeText(r.irdStatus),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Invoice #', width: 44 },
      { head: 'Date', width: 24 },
      { head: 'Customer' },
      { head: 'Total', align: 'right' },
      { head: 'Local Status', width: 30 },
      { head: 'IRD Status', width: 32 },
    ],
    body,
    totals: [{ cells: ['TOTAL', '', '', formatNpr(items.reduce((a, r) => a + r.totalAmount, 0)), '', ''] }],
  })
}

function drawIntegrity(doc: Page, y: number, data: MegaReportData): number {
  const issues = data.integrity.issues
  const lines = [
    { label: 'Reconciliation Checks', value: `${data.integrity.reconciliationCount} run` },
    { label: 'Balanced', value: `${formatNumber(data.reconciliation.filter((r) => r.status === 'BALANCED').length)}` },
    { label: 'Needs Attention', value: `${formatNumber(data.reconciliation.filter((r) => r.status !== 'BALANCED').length)}` },
    { label: 'Products Missing Cost', value: formatNumber(data.integrity.costDataMissingCount) },
  ]
  y = drawMetadata(doc, { startY: y, lines, columnCount: 2 })

  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.text('Integrity Warnings', PDF_SPACING.pageMargin, y)
  y += 6

  if (issues.length === 0) {
    drawEmptyNote(doc, y, 'No integrity warnings detected. All checks passed.')
    return y
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  let yy = y
  issues.forEach((msg) => {
    doc.setTextColor(PDF_COLORS.negative800[0], PDF_COLORS.negative800[1], PDF_COLORS.negative800[2])
    doc.text(`• ${truncateText(safeText(msg), 150)}`, PDF_SPACING.pageMargin + 2, yy)
    yy += 6
  })
  return yy
}

function drawEmptyNote(doc: Page, y: number, message: string): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const inner = pageWidth - margin * 2

  doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.roundedRect(margin, y + 2, inner, 22, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
  doc.text('NO RECORDS', margin + 6, y + 10)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(truncateText(safeText(message), 140), margin + 6, y + 17)

  return y + 30
}

export { sanitizeFilename }
