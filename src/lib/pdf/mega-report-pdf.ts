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
  const d = doc as any
  if (!d._drawnHeaderPages) d._drawnHeaderPages = new Set<number>()
  if (d._drawnHeaderPages.has(pageNumber)) return
  d._drawnHeaderPages.add(pageNumber)

  if (pageNumber <= 1) return // Cover page has no slim header

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

function ensurePageSpace(
  doc: Page,
  currentY: number,
  needed: number,
  targetOrientation: 'portrait' | 'landscape',
  data?: MegaReportData
): number {
  const pageHeight = doc.internal.pageSize.getHeight()
  const isLandscape = doc.internal.pageSize.getWidth() > doc.internal.pageSize.getHeight()
  const currentOrientation = isLandscape ? 'landscape' : 'portrait'

  if (currentOrientation !== targetOrientation || currentY + needed > pageHeight - PDF_SPACING.footerHeight - 10) {
    return nextPage(doc, targetOrientation, data)
  }
  return currentY
}

export function generateMegaReportPdf(opts: MegaReportPdfOptions): jsPDF {
  const { data, include } = opts
  const inc = (key: MegaSectionKey): boolean => sectionEnabled(include, key)
  const meta = data.meta

  const doc = createPdf({ orientation: 'portrait' }) as Page
  // Draws the slim header on every page a table occupies (incl. continuation pages).
  const pageHook = (payload: { pageNumber: number }): void => drawPageHeader(doc, data, payload.pageNumber)
  const sectionPageMap = new Map<MegaSectionKey, number>()

  // ------------------------------------------------ COVER
  coverPage(doc, data)
  // ------------------------------------------------ TABLE OF CONTENTS (Reserved page 2)
  nextPage(doc, 'portrait', data)

  // Start content sections on Page 3
  let y: number = nextPage(doc, 'portrait', data)

  // ------------------------------------------------ 1. EXECUTIVE SUMMARY
  if (inc('executive_summary')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('executive_summary', doc.getNumberOfPages())
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
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('reconciliation', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '2. FINANCIAL RECONCILIATION SUMMARY', 'Cross-report integrity checks')
    y = drawReconciliationSummary(doc, y, data)
  }
  // ------------------------------------------------ 3. SALES REGISTER (wide -> landscape)
  if (inc('sales_register')) {
    y = ensurePageSpace(doc, y, 45, 'landscape', data)
    sectionPageMap.set('sales_register', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '3. SALES REGISTER', 'All sales invoices in the selected period')
    y = drawSalesRegister(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 4. PURCHASE REGISTER (wide -> landscape)
  if (inc('purchase_register')) {
    y = ensurePageSpace(doc, y, 45, 'landscape', data)
    sectionPageMap.set('purchase_register', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '4. PURCHASE REGISTER', 'All purchases in the selected period')
    y = drawPurchaseRegister(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 5. SALES RETURNS
  if (inc('sales_returns')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('sales_returns', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '5. SALES RETURNS', 'Customer returns and adjustments')
    y = drawReturns(doc, y, data)
  }
  // ------------------------------------------------ 6. PURCHASE RETURNS / RETURNS & ADJUSTMENTS
  if (inc('returns_adjustments')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('returns_adjustments', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '6. PURCHASE RETURNS & ADJUSTMENTS', 'Returns, notes and inventory adjustments')
    y = drawReturnsAdjustments(doc, y, data)
  }
  // ------------------------------------------------ 7. CUSTOMERS
  if (inc('customers')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('customers', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '7. CUSTOMERS', 'Customer directory')
    y = drawCustomerDirectory(doc, y, data)
  }
  // ------------------------------------------------ 8. CUSTOMER LEDGER (wide -> landscape)
  if (inc('customer_ledger')) {
    y = ensurePageSpace(doc, y, 45, 'landscape', data)
    sectionPageMap.set('customer_ledger', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '8. CUSTOMER LEDGER', 'Per-customer opening / invoices / payments / closing')
    y = drawCustomerLedger(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 9. CUSTOMER UDHAAR / RECEIVABLES
  if (inc('customer_receivables')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('customer_receivables', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '9. CUSTOMER UDHAAR / RECEIVABLES', 'Outstanding receivables with aging')
    y = drawCustomerReceivables(doc, y, data)
  }
  // ------------------------------------------------ 10. SUPPLIERS
  if (inc('suppliers')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('suppliers', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '10. SUPPLIERS', 'Supplier directory')
    y = drawSupplierDirectory(doc, y, data)
  }
  // ------------------------------------------------ 11. SUPPLIER LEDGER (wide -> landscape)
  if (inc('supplier_ledger')) {
    y = ensurePageSpace(doc, y, 45, 'landscape', data)
    sectionPageMap.set('supplier_ledger', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '11. SUPPLIER LEDGER', 'Per-supplier opening / purchases / payments / closing')
    y = drawSupplierLedger(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 12. SUPPLIER PAYABLES
  if (inc('supplier_payables')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('supplier_payables', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '12. SUPPLIER PAYABLES', 'Outstanding payables with aging')
    y = drawSupplierPayables(doc, y, data)
  }
  // ------------------------------------------------ 13. PAYMENTS (wide -> landscape)
  if (inc('payments')) {
    y = ensurePageSpace(doc, y, 45, 'landscape', data)
    sectionPageMap.set('payments', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '13. PAYMENTS REGISTER', 'Customer and supplier payments')
    y = drawPayments(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 14. EXPENSES
  if (inc('expenses')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('expenses', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '14. EXPENSES', 'Expense register for the period')
    y = drawExpenses(doc, y, data)
  }
  // ------------------------------------------------ 15. PRODUCTS (wide -> landscape)
  if (inc('products')) {
    y = ensurePageSpace(doc, y, 45, 'landscape', data)
    sectionPageMap.set('products', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '15. PRODUCTS', 'Product catalog with stock and prices')
    y = drawProducts(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 16. CATEGORIES
  if (inc('categories')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('categories', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '16. CATEGORIES', 'Product categories with product counts')
    y = drawCategories(doc, y, data)
  }
  // ------------------------------------------------ 17. STOCK & VALUATION (wide -> landscape)
  if (inc('stock_valuation')) {
    y = ensurePageSpace(doc, y, 45, 'landscape', data)
    sectionPageMap.set('stock_valuation', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '17. STOCK & INVENTORY VALUATION', 'Valuation and retail summary per product')
    y = drawStockValuation(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 18. STOCK MOVEMENT (wide -> landscape)
  if (inc('stock_movement')) {
    y = ensurePageSpace(doc, y, 45, 'landscape', data)
    sectionPageMap.set('stock_movement', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '18. STOCK MOVEMENT', 'Inventory movement register')
    y = drawStockMovement(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 19. PROFIT & LOSS / COGS
  if (inc('profit_loss')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('profit_loss', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '19. PROFIT & LOSS STATEMENT', 'P&L waterfall with COGS')
    y = drawProfitLoss(doc, y, data)
  }
  // ------------------------------------------------ 20. VAT / TAX SUMMARY
  if (inc('vat_summary')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('vat_summary', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '20. VAT / TAX SUMMARY', 'Output VAT, input VAT and net position')
    y = drawVatSummary(doc, y, data)
  }
  // ------------------------------------------------ 21. CREDIT NOTES
  if (inc('credit_notes')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('credit_notes', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '21. CREDIT NOTES', 'Credit notes issued')
    y = drawCreditNotes(doc, y, data)
  }
  // ------------------------------------------------ 22. DEBIT NOTES
  if (inc('debit_notes')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('debit_notes', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '22. DEBIT NOTES', 'Debit notes issued')
    y = drawDebitNotes(doc, y, data)
  }
  // ------------------------------------------------ 23. INVOICES
  if (inc('invoices')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('invoices', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '23. INVOICE REGISTER', 'Invoice summary and sequence integrity')
    y = drawInvoices(doc, y, data)
  }
  // ------------------------------------------------ 24. AUDIT TRAIL (wide -> landscape)
  if (inc('audit_trail')) {
    y = ensurePageSpace(doc, y, 45, 'landscape', data)
    sectionPageMap.set('audit_trail', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '24. AUDIT TRAIL', 'System audit log for the period')
    y = drawAuditTrail(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 25. CANCELLED DOCUMENTS
  if (inc('cancelled_documents')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('cancelled_documents', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '25. CANCELLED DOCUMENTS', 'Cancelled transactions in the period')
    y = drawCancelledDocuments(doc, y, data)
  }
  // ------------------------------------------------ 26. IRD READINESS
  if (inc('ird_readiness')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('ird_readiness', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '26. IRD READINESS', 'Tax authority readiness and submission status')
    y = drawIrdReadiness(doc, y, data)
  }
  // ------------------------------------------------ 27. IRD RECONCILIATION (wide -> landscape)
  if (inc('ird_reconciliation')) {
    y = ensurePageSpace(doc, y, 45, 'landscape', data)
    sectionPageMap.set('ird_reconciliation', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '27. IRD RECONCILIATION', 'Invoice-level tax authority reconciliation')
    y = drawIrdReconciliation(doc, y, data)
  }
  // ------------------------------------------------ 28. DATA INTEGRITY
  if (inc('data_integrity')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('data_integrity', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '28. DATA INTEGRITY & QUALITY', 'Warnings, missing data and export notes')
    y = drawIntegrity(doc, y, data)
  }
  // Redraw TOC on page 2 with accurate section page numbers.
  if (sectionPageMap.size > 0) {
    doc.setPage(2)
    drawTocPage(doc, PDF_SPACING.pageMargin, data, sectionPageMap, include)
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

  // Logo: image embed if valid data URL / image URL, or clean rounded brand badge
  const logoSize = 26
  const logoX = centerX - logoSize / 2
  const logoY = 82
  let logoRendered = false

  if (biz.logoUrl && typeof biz.logoUrl === 'string' && (biz.logoUrl.startsWith('data:image/') || biz.logoUrl.startsWith('http'))) {
    try {
      doc.addImage(biz.logoUrl, 'PNG', logoX, logoY, logoSize, logoSize)
      logoRendered = true
    } catch {
      logoRendered = false
    }
  }

  if (!logoRendered) {
    const badgeW = 28
    const badgeH = 28
    const badgeX = centerX - badgeW / 2
    doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
    doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
    doc.roundedRect(badgeX, logoY, badgeW, badgeH, 6, 6, 'FD')

    // Inner professional chart bars emblem
    doc.setFillColor(PDF_COLORS.accent700[0], PDF_COLORS.accent700[1], PDF_COLORS.accent700[2])
    doc.rect(badgeX + 6, logoY + 16, 4, 7, 'F')
    doc.rect(badgeX + 12, logoY + 11, 4, 12, 'F')
    doc.rect(badgeX + 18, logoY + 7, 4, 16, 'F')
  }

  // Business name (Product identity is 'Inventory Lite' in header; Business identity is biz.name)
  const displayBizName = safeText(biz.name).trim() || 'My Business'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.text(truncateText(displayBizName, 44), centerX, logoY + logoSize + 14, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text('Financial Year Report', centerX, logoY + logoSize + 22, { align: 'center' })

  // Metadata block — paired left/right columns
  const infoLines: { label: string; value: string }[] = [
    { label: 'Financial Year', value: safeText(meta.fiscalYear) },
    { label: 'Report Period', value: safeText(meta.periodLabel) },
    { label: 'Address', value: safeText(biz.address || '—') },
    { label: 'Phone', value: safeText(biz.phone || '—') },
    { label: 'Email', value: safeText(biz.email || '—') },
    { label: 'PAN', value: safeText(biz.panNumber || '—') },
    { label: 'Currency', value: safeText(biz.currency || 'NPR') },
    { label: 'VAT', value: safeText(biz.vatNumber || '—') },
  ].filter((l) => l.value !== '—')

  const metaY = logoY + logoSize + 32
  const rowsCount = Math.max(1, Math.ceil(infoLines.length / 2))
  const blockHeight = rowsCount * 7.5 + 10

  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
  doc.roundedRect(margin, metaY, inner, blockHeight, 3, 3, 'FD')

  drawMetadata(doc, {
    startY: metaY + 8,
    lines: infoLines,
    columnCount: 2,
  })

  // Generated + disclaimer footer (centered)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(`Generated: ${formatBsDateTime(meta.generatedAt)}`, centerX, pageHeight - 30, { align: 'center' })
  doc.setTextColor(PDF_COLORS.ink600[0], PDF_COLORS.ink600[1], PDF_COLORS.ink600[2])
  doc.text(
    'Prepared for internal business management purposes.',
    centerX,
    pageHeight - 24,
    { align: 'center' },
  )
  doc.text(
    'This report does not constitute official tax certification or IRD approval.',
    centerX,
    pageHeight - 19,
    { align: 'center' },
  )
}

function drawTocPage(
  doc: Page,
  startY: number,
  data?: MegaReportData,
  sectionPages?: Map<MegaSectionKey, number> | number[],
  include?: Set<MegaSectionKey>,
): void {
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

  const allSections: { key: MegaSectionKey; n: string; title: string }[] = [
    { key: 'executive_summary', n: '1', title: 'Executive Summary' },
    { key: 'reconciliation', n: '2', title: 'Financial Reconciliation' },
    { key: 'sales_register', n: '3', title: 'Sales Register' },
    { key: 'purchase_register', n: '4', title: 'Purchase Register' },
    { key: 'sales_returns', n: '5', title: 'Sales Returns' },
    { key: 'returns_adjustments', n: '6', title: 'Purchase Returns & Adjustments' },
    { key: 'customers', n: '7', title: 'Customers' },
    { key: 'customer_ledger', n: '8', title: 'Customer Ledger' },
    { key: 'customer_receivables', n: '9', title: 'Customer Receivables' },
    { key: 'suppliers', n: '10', title: 'Suppliers' },
    { key: 'supplier_ledger', n: '11', title: 'Supplier Ledger' },
    { key: 'supplier_payables', n: '12', title: 'Supplier Payables' },
    { key: 'payments', n: '13', title: 'Payments Register' },
    { key: 'expenses', n: '14', title: 'Expenses' },
    { key: 'products', n: '15', title: 'Products' },
    { key: 'categories', n: '16', title: 'Categories' },
    { key: 'stock_valuation', n: '17', title: 'Stock & Inventory Valuation' },
    { key: 'stock_movement', n: '18', title: 'Stock Movement' },
    { key: 'profit_loss', n: '19', title: 'Profit & Loss Statement' },
    { key: 'vat_summary', n: '20', title: 'VAT / Tax Summary' },
    { key: 'credit_notes', n: '21', title: 'Credit Notes' },
    { key: 'debit_notes', n: '22', title: 'Debit Notes' },
    { key: 'invoices', n: '23', title: 'Invoice Register' },
    { key: 'audit_trail', n: '24', title: 'Audit Trail' },
    { key: 'cancelled_documents', n: '25', title: 'Cancelled Documents' },
    { key: 'ird_readiness', n: '26', title: 'IRD Readiness' },
    { key: 'ird_reconciliation', n: '27', title: 'IRD Reconciliation' },
    { key: 'data_integrity', n: '28', title: 'Data Integrity & Quality' },
  ]

  const sections = allSections.filter((s) => sectionEnabled(include, s.key))

  const columns = 2
  const colGap = 20
  const colWidth = (pageWidth - margin * 2 - colGap) / columns
  const rowH = 9

  sections.forEach((s, idx) => {
    const col = Math.floor(idx / Math.ceil(sections.length / columns))
    const row = idx % Math.ceil(sections.length / columns)
    const x = margin + col * (colWidth + colGap)
    const lineY = y + row * rowH

    let pageNum: number | null = null
    if (sectionPages instanceof Map) {
      pageNum = sectionPages.get(s.key) ?? null
    } else if (Array.isArray(sectionPages)) {
      pageNum = sectionPages[idx] ?? null
    }

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
  doc.setFontSize(8.5)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text('PERFORMANCE CHARTS', margin, y)
  y += 4

  // A. Monthly Sales vs Purchases (paired bars - full width)
  const sales = data.salesRegister.rows
  const purchases = data.purchaseRegister.rows
  const trend = buildMonthlyTrend(sales, purchases)

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
      36,
      inner,
    )
    y += 6
  }

  // B. Revenue / COGS / Gross Profit comparison (full width)
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
    inner,
  )
  y += 6

  // C. Expense breakdown (horizontal - full width)
  y = drawHorizontalBars(
    doc,
    { title: 'Expense Breakdown', formatValue: formatNpr },
    data.expenses.map((e) => ({ label: e.category || 'General', value: e.amount })).slice(0, 6),
    margin,
    y,
    inner,
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
    const fmtVal = (val: number) => {
      if (r.unitType === 'quantity') return `${formatNumber(val)} units`
      if (r.unitType === 'count') return `${formatNumber(val)}`
      return formatNpr(val)
    }
    const metricLine =
      `Expected: ${fmtVal(r.expected)}   |   Actual: ${fmtVal(r.actual)}   |   ` +
      `Difference: ${fmtVal(r.difference)}`
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
      { head: 'Date', width: 20 },
      { head: 'Invoice #', width: 30 },
      { head: 'Customer', width: 40 },
      { head: 'Taxable', align: 'right', width: 22 },
      { head: 'Discount', align: 'right', width: 22 },
      { head: 'VAT', align: 'right', width: 20 },
      { head: 'Total', align: 'right', width: 24 },
      { head: 'Paid', align: 'right', width: 22 },
      { head: 'Due', align: 'right', width: 22 },
      { head: 'Status', width: 22 },
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
      { head: 'Date', width: 20 },
      { head: 'Purchase #', width: 30 },
      { head: 'Supplier', width: 40 },
      { head: 'Taxable', align: 'right', width: 22 },
      { head: 'Discount', align: 'right', width: 22 },
      { head: 'VAT', align: 'right', width: 20 },
      { head: 'Total', align: 'right', width: 24 },
      { head: 'Paid', align: 'right', width: 22 },
      { head: 'Due', align: 'right', width: 22 },
      { head: 'Status', width: 22 },
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
      { head: 'Date', width: 22 },
      { head: 'Reference', width: 34 },
      { head: 'Refund Amount', align: 'right', width: 32 },
      { head: 'Reason' },
      { head: 'By', width: 26 },
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
      { head: 'Date', width: 22 },
      { head: 'Type', width: 28 },
      { head: 'Reference', width: 32 },
      { head: 'Amount', align: 'right', width: 28 },
      { head: 'Reason' },
      { head: 'Ledger Impact', width: 30 },
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
      { head: 'Customer', width: 48 },
      { head: 'PAN', width: 28 },
      { head: 'Phone', width: 30 },
      { head: 'Balance', align: 'right', width: 32 },
      { head: 'Status', width: 28 },
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
      { head: 'Customer', width: 42 },
      { head: '0-30', align: 'right', width: 24 },
      { head: '31-60', align: 'right', width: 24 },
      { head: '61-90', align: 'right', width: 24 },
      { head: '90+', align: 'right', width: 22 },
      { head: 'Outstanding', align: 'right', width: 34 },
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
      { head: 'Supplier', width: 48 },
      { head: 'PAN', width: 28 },
      { head: 'Phone', width: 30 },
      { head: 'Balance', align: 'right', width: 32 },
      { head: 'Status', width: 28 },
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
      { head: 'Supplier', width: 42 },
      { head: '0-30', align: 'right', width: 24 },
      { head: '31-60', align: 'right', width: 24 },
      { head: '61-90', align: 'right', width: 24 },
      { head: '90+', align: 'right', width: 22 },
      { head: 'Payable', align: 'right', width: 34 },
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
      { head: 'Date', width: 22 },
      { head: 'Title' },
      { head: 'Category', width: 32 },
      { head: 'Amount', align: 'right', width: 30 },
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
      { head: 'Category', width: 40 },
      { head: 'Products', align: 'right', width: 24 },
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
      { head: 'Date', width: 25 },
      { head: 'Product', width: 60 },
      { head: 'SKU', width: 35 },
      { head: 'Type', width: 30 },
      { head: 'Qty', align: 'right', width: 22 },
      { head: 'From', align: 'right', width: 22 },
      { head: 'To', align: 'right', width: 22 },
      { head: 'Reason', width: 57 },
    ],
    body,
    fontScale: 'dense',
  })
}

function drawProfitLoss(doc: Page, y: number, data: MegaReportData): number {
  const p = data.profitability
  const k = data.kpis

  const body = [
    ['Gross Sales', formatNpr(p.grossSales)],
    ['Discounts', formatNpr(p.discounts)],
    ['Sales Returns', formatNpr(p.salesReturns)],
    ['NET SALES', formatNpr(p.netSales)],
    ['Cost of Goods Sold (COGS)', formatNpr(p.cogs)],
    ['GROSS PROFIT', formatNpr(k.grossProfit)],
    ['Gross Margin %', formatPercent(p.grossMarginPercent)],
    ['Operating Expenses', formatNpr(p.expenses)],
    ['NET PROFIT', formatNpr(p.netProfit)],
    ['Net Margin %', formatPercent(p.netMarginPercent)],
  ]

  const finalY = drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Financial Line Item', width: 110 },
      { head: 'Amount (NPR)', align: 'right' },
    ],
    body,
    striped: true,
  })

  if (k.costDataMissingCount > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.negative800[0], PDF_COLORS.negative800[1], PDF_COLORS.negative800[2])
    doc.text(
      `Note: ${formatNumber(k.costDataMissingCount)} product(s) are missing cost data, so COGS/gross profit may be understated.`,
      PDF_SPACING.pageMargin,
      finalY + 2,
    )
    return finalY + 8
  }
  return finalY
}

function drawVatSummary(doc: Page, y: number, data: MegaReportData): number {
  const v = data.vatSummary

  const body = [
    ['Taxable Sales', formatNpr(v.taxableSales)],
    ['Output VAT Charged', formatNpr(v.outputVat)],
    ['Taxable Purchases', formatNpr(v.taxablePurchases)],
    ['Input VAT Paid', formatNpr(v.inputVat)],
    ['VAT Rate (Default)', formatPercent(v.vatRate)],
    ['NET VAT POSITION', formatNpr(v.netVatPosition)],
    ['Status', v.status === 'PAYABLE' ? 'VAT Payable' : 'Refundable Credit'],
  ]

  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'VAT / Tax Summary Item', width: 110 },
      { head: 'Value', align: 'right' },
    ],
    body,
    striped: true,
  })
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
      { head: 'Credit Note #', width: 28 },
      { head: 'Date', width: 20 },
      { head: 'Customer', width: 28 },
      { head: 'Invoice', width: 22 },
      { head: 'Taxable', align: 'right', width: 20 },
      { head: 'VAT', align: 'right', width: 18 },
      { head: 'Total', align: 'right', width: 20 },
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
      { head: 'Debit Note #', width: 28 },
      { head: 'Date', width: 20 },
      { head: 'Supplier', width: 30 },
      { head: 'Taxable', align: 'right', width: 20 },
      { head: 'VAT', align: 'right', width: 18 },
      { head: 'Total', align: 'right', width: 20 },
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

function formatAuditMetadataDetails(meta: unknown): string {
  if (!meta || typeof meta !== 'object') return '—'
  try {
    const entries = Object.entries(meta as Record<string, unknown>)
      .filter(([k, v]) => v !== undefined && v !== null && !k.startsWith('$'))
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    return entries.length > 0 ? entries.join('\n') : '—'
  } catch {
    return String(meta)
  }
}

function drawAuditTrail(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const trail = data.auditTrail
  if (trail.length === 0) return drawEmptyNote(doc, y, 'No audit trail entries for the selected period.', data.meta.periodLabel)

  const body = trail.map((a) => [
    safeDate(a.timestamp),
    safeText(a.action),
    safeText(a.target),
    safeText(a.userId),
    safeText(formatAuditMetadataDetails(a.metadata)),
  ])
  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 25 },
      { head: 'Action', width: 45 },
      { head: 'Target', width: 50 },
      { head: 'User', width: 35 },
      { head: 'Details', width: 118 },
    ],
    body,
    fontScale: 'dense',
  })
}

function drawCancelledDocuments(doc: Page, y: number, data: MegaReportData): number {
  const docs = data.cancelledDocuments
  if (docs.length === 0) return drawEmptyNote(doc, y, 'No cancelled documents for the selected period.', data.meta.periodLabel)

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
      { head: 'Type', width: 28 },
      { head: 'Doc #', width: 22 },
      { head: 'Date', width: 20 },
      { head: 'Amount', align: 'right', width: 22 },
      { head: 'Party', width: 32 },
      { head: 'Reason', width: 40 },
      { head: 'Cancelled By' },
    ],
    body,
  })
}

function drawIrdReadiness(doc: Page, y: number, data: MegaReportData): number {
  const ird = data.ird
  const lines = [
    { label: 'Business Name', value: safeText(ird.businessName) },
    { label: 'PAN', value: safeText(ird.panNumber) },
    { label: 'VAT', value: safeText(ird.vatNumber) },
    { label: 'VAT Registration', value: safeText(ird.vatRegistrationStatus) },
    { label: 'Electronic Billing', value: safeText(ird.electronicBillingStatus) },
    { label: 'CBMS Integration Status', value: safeText(ird.cbmsIntegrationStatus).replace(/_/g, ' ') },
    { label: 'CBMS Submissions', value: `${formatNumber(ird.cbmsSubmissionCount)} Total (${formatNumber(ird.cbmsAcceptedCount)} Accepted)` },
    { label: 'Approval Verified', value: ird.approvalVerified ? 'Yes' : 'No' },
  ]
  return drawMetadata(doc, { startY: y, lines, columnCount: 2 })
}

function drawIrdReconciliation(doc: Page, y: number, data: MegaReportData): number {
  const items = data.irdReconciliation
  if (items.length === 0) return drawEmptyNote(doc, y, 'No IRD reconciliation records found for the period.', data.meta.periodLabel)

  const body = items.map((r) => [
    safeText(r.invoiceNumber),
    safeDate(r.invoiceDate),
    safeText(r.customerName),
    formatNpr(r.totalAmount),
    safeText(r.localStatus).replace(/_/g, ' '),
    safeText(r.irdStatus).replace(/_/g, ' '),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Invoice #', width: 40 },
      { head: 'Date', width: 25 },
      { head: 'Customer', width: 65 },
      { head: 'Total Amount', align: 'right', width: 35 },
      { head: 'Local Status', width: 45 },
      { head: 'IRD Status', width: 63 },
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
    drawEmptyNote(doc, y, 'No integrity warnings detected. All checks passed.', data.meta.periodLabel)
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

function drawEmptyNote(doc: Page, y: number, message: string, periodLabel?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const inner = pageWidth - margin * 2

  doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.roundedRect(margin, y + 2, inner, periodLabel ? 26 : 22, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
  doc.text('NO RECORDS FOUND', margin + 6, y + 10)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(truncateText(safeText(message), 140), margin + 6, y + 17)
  if (periodLabel) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text(`Period: ${safeText(periodLabel)}`, margin + 6, y + 23)
  }

  return y + (periodLabel ? 34 : 30)
}

export { sanitizeFilename }
