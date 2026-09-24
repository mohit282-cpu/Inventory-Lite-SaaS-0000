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

function cleanStatusText(status?: string): string {
  if (!status) return '—'
  return safeText(status).replace(/_/g, ' ').toUpperCase()
}

function truncateUserId(userId?: string): string {
  if (!userId) return '—'
  const str = safeText(userId)
  if (str.length <= 10) return str
  return `${str.slice(0, 4)}...${str.slice(-4)}`
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
    y = ensurePageSpace(doc, y, 35, 'portrait', data)
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
    y = ensurePageSpace(doc, y, 22, 'portrait', data)
    sectionPageMap.set('sales_returns', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '5. SALES RETURNS', 'Customer returns and adjustments')
    y = drawReturns(doc, y, data)
  }
  // ------------------------------------------------ 6. PURCHASE RETURNS / RETURNS & ADJUSTMENTS
  if (inc('returns_adjustments')) {
    y = ensurePageSpace(doc, y, 22, 'portrait', data)
    sectionPageMap.set('returns_adjustments', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '6. PURCHASE RETURNS & ADJUSTMENTS', 'Returns, notes and inventory adjustments')
    y = drawReturnsAdjustments(doc, y, data)
  }
  // ------------------------------------------------ 7. CUSTOMERS
  if (inc('customers')) {
    y = ensurePageSpace(doc, y, 35, 'portrait', data)
    sectionPageMap.set('customers', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '7. CUSTOMERS', 'Customer directory')
    y = drawCustomerDirectory(doc, y, data)
  }
  // ------------------------------------------------ 8. CUSTOMER LEDGER
  if (inc('customer_ledger')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('customer_ledger', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '8. CUSTOMER LEDGER', 'Per-customer opening / invoices / payments / closing')
    y = drawCustomerLedger(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 9. CUSTOMER UDHAAR / RECEIVABLES
  if (inc('customer_receivables')) {
    y = ensurePageSpace(doc, y, 40, 'portrait', data)
    sectionPageMap.set('customer_receivables', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '9. CUSTOMER UDHAAR / RECEIVABLES', 'Outstanding receivables with aging')
    y = drawCustomerReceivables(doc, y, data)
  }
  // ------------------------------------------------ 10. SUPPLIERS (Start fresh page to balance Customer / Supplier domains)
  if (inc('suppliers')) {
    y = nextPage(doc, 'portrait', data)
    sectionPageMap.set('suppliers', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '10. SUPPLIERS', 'Supplier directory')
    y = drawSupplierDirectory(doc, y, data)
  }
  // ------------------------------------------------ 11. SUPPLIER LEDGER
  if (inc('supplier_ledger')) {
    y = ensurePageSpace(doc, y, 45, 'portrait', data)
    sectionPageMap.set('supplier_ledger', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '11. SUPPLIER LEDGER', 'Per-supplier opening / purchases / payments / closing')
    y = drawSupplierLedger(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 12. SUPPLIER PAYABLES
  if (inc('supplier_payables')) {
    y = ensurePageSpace(doc, y, 40, 'portrait', data)
    sectionPageMap.set('supplier_payables', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '12. SUPPLIER PAYABLES', 'Outstanding payables with aging')
    y = drawSupplierPayables(doc, y, data)
  }
  // ------------------------------------------------ 13. PAYMENTS
  if (inc('payments')) {
    y = ensurePageSpace(doc, y, 60, 'portrait', data)
    sectionPageMap.set('payments', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '13. PAYMENTS REGISTER', 'Customer and supplier payments')
    y = drawPayments(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 14. EXPENSES
  if (inc('expenses')) {
    y = ensurePageSpace(doc, y, 40, 'portrait', data)
    sectionPageMap.set('expenses', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '14. EXPENSES', 'Expense register for the period')
    y = drawExpenses(doc, y, data)
  }
  // ------------------------------------------------ 15. PRODUCTS
  if (inc('products')) {
    y = ensurePageSpace(doc, y, 55, 'portrait', data)
    sectionPageMap.set('products', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '15. PRODUCTS', 'Product catalog with stock and prices')
    y = drawProducts(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 16. CATEGORIES
  if (inc('categories')) {
    y = ensurePageSpace(doc, y, 35, 'portrait', data)
    sectionPageMap.set('categories', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '16. CATEGORIES', 'Product categories with product counts')
    y = drawCategories(doc, y, data)
  }
  // ------------------------------------------------ 17. STOCK & VALUATION (75mm required to keep header + summary + table together)
  if (inc('stock_valuation')) {
    y = ensurePageSpace(doc, y, 75, 'portrait', data)
    sectionPageMap.set('stock_valuation', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '17. STOCK & INVENTORY VALUATION', 'Valuation and retail summary per product')
    y = drawStockValuation(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 18. STOCK MOVEMENT
  if (inc('stock_movement')) {
    y = ensurePageSpace(doc, y, 55, 'portrait', data)
    sectionPageMap.set('stock_movement', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '18. STOCK MOVEMENT', 'Inventory movement register')
    y = drawStockMovement(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 19. PROFIT & LOSS / COGS
  if (inc('profit_loss')) {
    y = ensurePageSpace(doc, y, 75, 'portrait', data)
    sectionPageMap.set('profit_loss', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '19. PROFIT & LOSS STATEMENT', 'P&L waterfall with COGS')
    y = drawProfitLoss(doc, y, data)
  }
  // ------------------------------------------------ 20. VAT / TAX SUMMARY
  if (inc('vat_summary')) {
    y = ensurePageSpace(doc, y, 30, 'portrait', data)
    sectionPageMap.set('vat_summary', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '20. VAT / TAX SUMMARY', 'Output VAT, input VAT and net position')
    y = drawVatSummary(doc, y, data)
  }
  // ------------------------------------------------ 21. CREDIT NOTES
  if (inc('credit_notes')) {
    y = ensurePageSpace(doc, y, 22, 'portrait', data)
    sectionPageMap.set('credit_notes', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '21. CREDIT NOTES', 'Credit notes issued')
    y = drawCreditNotes(doc, y, data)
  }
  // ------------------------------------------------ 22. DEBIT NOTES
  if (inc('debit_notes')) {
    y = ensurePageSpace(doc, y, 22, 'portrait', data)
    sectionPageMap.set('debit_notes', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '22. DEBIT NOTES', 'Debit notes issued')
    y = drawDebitNotes(doc, y, data)
  }
  // ------------------------------------------------ 23. INVOICES
  if (inc('invoices')) {
    y = ensurePageSpace(doc, y, 30, 'portrait', data)
    sectionPageMap.set('invoices', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '23. INVOICE REGISTER', 'Invoice summary and sequence integrity')
    y = drawInvoices(doc, y, data)
  }
  // ------------------------------------------------ 24. AUDIT TRAIL
  if (inc('audit_trail')) {
    y = ensurePageSpace(doc, y, 35, 'portrait', data)
    sectionPageMap.set('audit_trail', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '24. AUDIT TRAIL', 'System audit log for the period')
    y = drawAuditTrail(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 25. CANCELLED DOCUMENTS
  if (inc('cancelled_documents')) {
    y = ensurePageSpace(doc, y, 22, 'portrait', data)
    sectionPageMap.set('cancelled_documents', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '25. CANCELLED DOCUMENTS', 'Cancelled transactions in the period')
    y = drawCancelledDocuments(doc, y, data)
  }
  // ------------------------------------------------ 26. IRD READINESS
  if (inc('ird_readiness')) {
    y = ensurePageSpace(doc, y, 30, 'portrait', data)
    sectionPageMap.set('ird_readiness', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '26. IRD READINESS', 'Tax authority readiness and submission status')
    y = drawIrdReadiness(doc, y, data)
  }
  // ------------------------------------------------ 27. IRD RECONCILIATION
  if (inc('ird_reconciliation')) {
    y = ensurePageSpace(doc, y, 30, 'portrait', data)
    sectionPageMap.set('ird_reconciliation', doc.getNumberOfPages())
    y = drawSectionTitle(doc, y, '27. IRD RECONCILIATION', 'Invoice-level tax authority reconciliation')
    y = drawIrdReconciliation(doc, y, data, pageHook)
  }
  // ------------------------------------------------ 28. DATA INTEGRITY
  if (inc('data_integrity')) {
    y = ensurePageSpace(doc, y, 30, 'portrait', data)
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

  // 1. Top Brand Header Band (SaaS Platform Identity)
  doc.setFillColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.rect(0, 0, pageWidth, 58, 'F')
  doc.setFillColor(PDF_COLORS.accent700[0], PDF_COLORS.accent700[1], PDF_COLORS.accent700[2])
  doc.rect(0, 58, pageWidth, 1.8, 'F')

  // Platform Header Text (Left: Inventory Lite SaaS, Right: Mega Business Report)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text('Inventory Lite', margin, 28)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(203, 213, 225)
  doc.text('Business Accounting & Inventory Suite', margin, 36)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('MEGA BUSINESS REPORT', pageWidth - margin, 28, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(203, 213, 225)
  doc.text(`FY ${safeText(meta.fiscalYear)}`, pageWidth - margin, 36, { align: 'right' })

  // 2. Tenant Business Identity & Report Header
  const logoSize = 24
  const logoY = 76
  let logoRendered = false

  if (biz.logoUrl && typeof biz.logoUrl === 'string' && (biz.logoUrl.startsWith('data:image/') || biz.logoUrl.startsWith('http'))) {
    try {
      doc.addImage(biz.logoUrl, 'PNG', centerX - logoSize / 2, logoY, logoSize, logoSize)
      logoRendered = true
    } catch {
      logoRendered = false
    }
  }

  if (!logoRendered) {
    const badgeW = 26
    const badgeH = 26
    const badgeX = centerX - badgeW / 2
    doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
    doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
    doc.roundedRect(badgeX, logoY, badgeW, badgeH, 5, 5, 'FD')

    // Emblem chart bars
    doc.setFillColor(PDF_COLORS.accent700[0], PDF_COLORS.accent700[1], PDF_COLORS.accent700[2])
    doc.rect(badgeX + 5, logoY + 14, 4, 7, 'F')
    doc.rect(badgeX + 11, logoY + 9, 4, 12, 'F')
    doc.rect(badgeX + 17, logoY + 5, 4, 16, 'F')
  }

  // Tenant / Business Name (Primary visual focus)
  const displayBizName = safeText(biz.name).trim() || 'My Business'
  const titleY = logoY + logoSize + 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.text(truncateText(displayBizName.toUpperCase(), 42), centerX, titleY, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(PDF_COLORS.accent700[0], PDF_COLORS.accent700[1], PDF_COLORS.accent700[2])
  doc.text('MEGA BUSINESS REPORT', centerX, titleY + 9, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(`FY ${safeText(meta.fiscalYear)} — Financial Year Report`, centerX, titleY + 17, { align: 'center' })

  // Divider Line
  const divY = titleY + 23
  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.setLineWidth(0.5)
  doc.line(margin + 20, divY, pageWidth - margin - 20, divY)

  // 3. Business Information & Data Snapshot Box
  const metaY = divY + 4
  const isVatReg = data.vatSummary?.isVatRegistered ?? Boolean(biz.vatNumber && String(biz.vatNumber).trim() !== '')

  const infoLines: { label: string; value: string }[] = [
    { label: 'Business Name', value: displayBizName },
    { label: 'Report ID', value: safeText(meta.reportId || '—') },
    { label: 'PAN', value: safeText(biz.panNumber || '—') },
    { label: 'Report Version', value: safeText(meta.reportVersion || '1.0.0') },
    { label: 'VAT Registration', value: isVatReg ? `Registered (${safeText(biz.vatNumber)})` : 'Not Registered' },
    { label: 'Period Status', value: safeText(meta.periodStatus || 'Active Period') },
    { label: 'Reporting Period', value: safeText(meta.periodLabel) },
    { label: 'Timezone', value: safeText(meta.timezone || 'Asia/Kathmandu') },
    { label: 'Generated At', value: formatBsDateTime(meta.generatedAt) },
    { label: 'Data Through', value: formatBsDateTime(meta.dataThrough || meta.generatedAt) },
  ].filter((l) => l.value !== '—')

  const rowsCount = Math.max(1, Math.ceil(infoLines.length / 2))
  const cardHeight = rowsCount * 8 + 14

  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
  doc.roundedRect(margin, metaY, inner, cardHeight, 3.5, 3.5, 'FD')

  // Accent header line inside card
  doc.setFillColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.rect(margin, metaY, inner, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('BUSINESS IDENTITY & REPORT DATA SNAPSHOT', margin + 6, metaY + 4.2)

  drawMetadata(doc, {
    startY: metaY + 11,
    lines: infoLines,
    columnCount: 2,
  })

  // 4. Footer Disclaimer & Identity Attribution
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(`Generated: ${formatBsDateTime(meta.generatedAt)}`, centerX, pageHeight - 34, { align: 'center' })
  doc.setTextColor(PDF_COLORS.ink600[0], PDF_COLORS.ink600[1], PDF_COLORS.ink600[2])
  doc.text('Prepared for internal business management purposes.', centerX, pageHeight - 28, { align: 'center' })
  doc.text('This report does not constitute official tax certification or IRD approval.', centerX, pageHeight - 23, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text('Powered by Inventory Lite', centerX, pageHeight - 16, { align: 'center' })
}

interface TocGroup {
  name: string
  items: { key: MegaSectionKey; n: string; title: string }[]
}

function drawTocPage(
  doc: Page,
  startY: number,
  data?: MegaReportData,
  sectionPages?: Map<MegaSectionKey, number> | number[],
  include?: Set<MegaSectionKey>,
): void {
  let y = startY + 2
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin

  // Header Banner
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.text('TABLE OF CONTENTS', margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(data ? `${safeText(data.meta.business.name)}  |  FY ${safeText(data.meta.fiscalYear)}  |  Period: ${safeText(data.meta.periodLabel)}` : '', margin, y + 4)
  y += 12

  // 5 Groupings
  const groups: TocGroup[] = [
    {
      name: 'EXECUTIVE & FINANCIAL',
      items: [
        { key: 'executive_summary', n: '1', title: 'Executive Summary' },
        { key: 'reconciliation', n: '2', title: 'Financial Reconciliation' },
        { key: 'sales_register', n: '3', title: 'Sales Register' },
        { key: 'purchase_register', n: '4', title: 'Purchase Register' },
        { key: 'sales_returns', n: '5', title: 'Sales Returns' },
        { key: 'returns_adjustments', n: '6', title: 'Purchase Returns & Adjustments' },
      ],
    },
    {
      name: 'CUSTOMERS & SUPPLIERS',
      items: [
        { key: 'customers', n: '7', title: 'Customers' },
        { key: 'customer_ledger', n: '8', title: 'Customer Ledger' },
        { key: 'customer_receivables', n: '9', title: 'Customer Receivables' },
        { key: 'suppliers', n: '10', title: 'Suppliers' },
        { key: 'supplier_ledger', n: '11', title: 'Supplier Ledger' },
        { key: 'supplier_payables', n: '12', title: 'Supplier Payables' },
        { key: 'payments', n: '13', title: 'Payments Register' },
        { key: 'expenses', n: '14', title: 'Expenses' },
      ],
    },
    {
      name: 'INVENTORY',
      items: [
        { key: 'products', n: '15', title: 'Products' },
        { key: 'categories', n: '16', title: 'Categories' },
        { key: 'stock_valuation', n: '17', title: 'Stock & Inventory Valuation' },
        { key: 'stock_movement', n: '18', title: 'Stock Movement' },
      ],
    },
    {
      name: 'FINANCIAL STATEMENTS',
      items: [
        { key: 'profit_loss', n: '19', title: 'Profit & Loss Statement' },
        { key: 'vat_summary', n: '20', title: 'VAT / Tax Summary' },
      ],
    },
    {
      name: 'COMPLIANCE & AUDIT',
      items: [
        { key: 'credit_notes', n: '21', title: 'Credit Notes' },
        { key: 'debit_notes', n: '22', title: 'Debit Notes' },
        { key: 'invoices', n: '23', title: 'Invoice Register' },
        { key: 'audit_trail', n: '24', title: 'Audit Trail' },
        { key: 'cancelled_documents', n: '25', title: 'Cancelled Documents' },
        { key: 'ird_readiness', n: '26', title: 'IRD Readiness' },
        { key: 'ird_reconciliation', n: '27', title: 'IRD Reconciliation' },
        { key: 'data_integrity', n: '28', title: 'Data Integrity & Quality' },
      ],
    },
  ]

  // Flatten items for column allocation while keeping group context
  const activeItems: { groupName?: string; key: MegaSectionKey; n: string; title: string }[] = []
  groups.forEach((g) => {
    const valid = g.items.filter((it) => sectionEnabled(include, it.key))
    if (valid.length > 0) {
      activeItems.push({ key: valid[0].key, n: '', title: g.name, groupName: g.name })
      valid.forEach((it) => activeItems.push(it))
    }
  })

  const columns = 2
  const colGap = 16
  const colWidth = (pageWidth - margin * 2 - colGap) / columns
  const halfCount = Math.ceil(activeItems.length / columns)
  const rowH = 7.2

  activeItems.forEach((s, idx) => {
    const col = idx < halfCount ? 0 : 1
    const row = idx < halfCount ? idx : idx - halfCount
    const x = margin + col * (colWidth + colGap)
    const lineY = y + row * rowH

    if (s.groupName) {
      // Group Category Header
      doc.setFillColor(PDF_COLORS.canvas100[0], PDF_COLORS.canvas100[1], PDF_COLORS.canvas100[2])
      doc.rect(x, lineY - 4.5, colWidth, 5.5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
      doc.text(s.title, x + 3, lineY - 0.8)
      return
    }

    let pageNum: number | null = null
    if (sectionPages instanceof Map) {
      pageNum = sectionPages.get(s.key) ?? null
    } else if (Array.isArray(sectionPages)) {
      pageNum = (sectionPages as any)[s.key] ?? null
    }

    // Item Section Number
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(PDF_COLORS.accent700[0], PDF_COLORS.accent700[1], PDF_COLORS.accent700[2])
    doc.text(`${s.n}.`, x + 3, lineY)

    // Item Title
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.ink800[0], PDF_COLORS.ink800[1], PDF_COLORS.ink800[2])
    const titleText = truncateText(s.title, 32)
    doc.text(titleText, x + 11, lineY)

    // Page number right-aligned
    if (pageNum !== null) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
      doc.text(String(pageNum), x + colWidth - 2, lineY, { align: 'right' })
    }

    // Leader dots between title and page number
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(PDF_COLORS.ink300[0], PDF_COLORS.ink300[1], PDF_COLORS.ink300[2])
    const dotsX = x + 11 + doc.getTextWidth(titleText) + 3
    const dotsEnd = (x + colWidth - 2) - (pageNum !== null ? doc.getTextWidth(String(pageNum)) + 5 : 4)
    if (dotsEnd > dotsX) {
      const nDots = Math.floor((dotsEnd - dotsX) / 1.6)
      doc.text('.'.repeat(Math.max(0, nDots)), dotsX, lineY - 0.5)
    }
  })

  // TOC Footer Note
  const maxRowsInCol = Math.max(halfCount, activeItems.length - halfCount)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.text(
    'All financial figures are in NPR and derived from the application’s authoritative accounting records.',
    margin,
    y + maxRowsInCol * rowH + 6,
  )
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
  doc.text('PERFORMANCE ANALYTICS', margin, y)
  y += 4

  // A. Monthly Sales vs Purchases (paired bars - full width)
  const sales = data.salesRegister.rows
  const purchases = data.purchaseRegister.rows
  const trend = buildMonthlyTrend(sales, purchases)

  if (trend.length <= 1) {
    // Single period fallback card (when insufficient historical trend data exists)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text('Single reporting period selected — Insufficient historical data for monthly trend analysis.', margin, y)
    y += 4

    const p = data.profitability
    const k = data.kpis
    const perfBody = [
      ['Net Sales (Revenue)', formatNpr(p.netSales), '100.0%'],
      ['Cost of Goods Sold (COGS)', formatNpr(p.cogs), formatPercent(p.netSales ? (p.cogs / p.netSales) * 100 : 0)],
      ['GROSS PROFIT', formatNpr(k.grossProfit), formatPercent(p.grossMarginPercent)],
      ['Operating Expenses', formatNpr(k.expenses), formatPercent(p.netSales ? (k.expenses / p.netSales) * 100 : 0)],
      ['NET PROFIT', formatNpr(k.netProfit), formatPercent(p.netMarginPercent)],
    ]

    y = drawTable(doc, {
      startY: y,
      columns: [
        { head: 'Financial Line Item', width: 90 },
        { head: 'Amount (NPR)', align: 'right', width: 46 },
        { head: '% of Net Sales', align: 'right', width: 46 },
      ],
      body: perfBody,
      striped: true,
      fontScale: 'dense',
    })
    return y + 2
  }

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
  const balancedCount = checks.filter((r) => r.status === 'BALANCED').length
  const warningCount = checks.filter((r) => r.status === 'WARNING').length
  const mismatchCount = checks.filter((r) => r.status === 'MISMATCH').length

  const acctStatus = data.accountingValidation?.status || 'PASS'
  const taxStatus = data.taxValidation?.status || 'PASS'

  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Financial Reconciliation', value: `${balancedCount}/${checks.length} Checks Passed` },
      { label: 'Data Consistency', value: `${mismatchCount} Mismatches` },
      { label: 'Accounting Validation', value: acctStatus },
      { label: 'Tax Validation', value: taxStatus },
    ],
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const inner = pageWidth - margin * 2

  // Summary Banner
  doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.roundedRect(margin, y, inner, 15, 2.5, 2.5, 'FD')

  const statusColor = data.integrity.hasIssues ? PDF_COLORS.negative800 : PDF_COLORS.positive800
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
  doc.rect(margin, y, 2, 15, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.text('FINANCIAL INTEGRITY SUMMARY', margin + 6, y + 5.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
  const statusBadge = balancedCount === checks.length ? `ALL CHECKS PASSED (${checks.length}/${checks.length})` : `ISSUES DETECTED`
  doc.text(`${statusBadge}   |   Balanced: ${balancedCount}   |   Warning: ${warningCount}   |   Mismatch: ${mismatchCount}`, margin + 6, y + 11.5)

  y += 18

  if (checks.length === 0) {
    return drawEmptyNote(doc, y, 'No reconciliation checks available for the selected period.')
  }

  const fmtVal = (val: number, unitType?: string) => {
    if (unitType === 'quantity') return `${formatNumber(val)} units`
    if (unitType === 'count') return formatNumber(val)
    return formatNpr(val)
  }

  const body = checks.map((r, idx) => [
    `${idx + 1}. ${safeText(r.checkName)}`,
    safeText(r.category),
    fmtVal(r.expected, r.unitType),
    fmtVal(r.actual, r.unitType),
    fmtVal(r.difference, r.unitType),
    r.status === 'BALANCED' ? 'PASS' : r.status,
  ])

  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Check Name', width: 62 },
      { head: 'Category', width: 28 },
      { head: 'Expected', align: 'right', width: 25 },
      { head: 'Actual', align: 'right', width: 25 },
      { head: 'Difference', align: 'right', width: 24 },
      { head: 'Status', width: 18 },
    ],
    body,
    striped: true,
    fontScale: 'dense',
  })
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

  if (s.reconciliation) {
    y = drawSummaryCard(doc, {
      startY: y,
      columns: [
        { label: 'Registered Customer Sales', value: formatNpr(s.reconciliation.registeredCustomerSales) },
        { label: 'Walk-in Sales', value: formatNpr(s.reconciliation.walkInSales) },
        { label: 'Total Sales', value: formatNpr(s.reconciliation.totalSales) },
        { label: 'Reconciliation Difference', value: formatNpr(s.reconciliation.difference) },
      ],
    })
  }

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
    cleanStatusText(r.paymentStatus),
  ])

  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 22 },
      { head: 'Invoice #', width: 32 },
      { head: 'Customer', width: 44 },
      { head: 'Taxable', align: 'right', width: 24 },
      { head: 'Discount', align: 'right', width: 22 },
      { head: 'VAT', align: 'right', width: 22 },
      { head: 'Total', align: 'right', width: 26 },
      { head: 'Paid', align: 'right', width: 24 },
      { head: 'Due', align: 'right', width: 24 },
      { head: 'Status', width: 29 },
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
    cleanStatusText(r.paymentStatus),
  ])

  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 22 },
      { head: 'Purchase #', width: 32 },
      { head: 'Supplier', width: 44 },
      { head: 'Taxable', align: 'right', width: 24 },
      { head: 'Discount', align: 'right', width: 22 },
      { head: 'VAT', align: 'right', width: 22 },
      { head: 'Total', align: 'right', width: 26 },
      { head: 'Paid', align: 'right', width: 24 },
      { head: 'Due', align: 'right', width: 24 },
      { head: 'Status', width: 29 },
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
  const ledgers = data.customerLedgers
  if (ledgers.length === 0) return drawEmptyNote(doc, y, 'No customers recorded for this business.')

  const body = ledgers.map((c) => [
    safeText(c.customerName),
    safeText(c.panNumber ?? '—'),
    safeText(c.phone ?? '—'),
    formatNpr(c.closingBalance),
    cleanStatusText(c.reconciliationStatus),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Customer', width: 52 },
      { head: 'PAN', width: 28 },
      { head: 'Phone', width: 32 },
      { head: 'Balance', align: 'right', width: 34 },
      { head: 'Status', width: 36 },
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
      { head: 'Customer', width: 44 },
      { head: 'Opening', align: 'right', width: 23 },
      { head: 'Invoices', align: 'right', width: 23 },
      { head: 'Payments', align: 'right', width: 23 },
      { head: 'Credit/Returns', align: 'right', width: 23 },
      { head: 'Closing', align: 'right', width: 23 },
      { head: 'Outstanding', align: 'right', width: 23 },
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
      { head: 'Customer', width: 46 },
      { head: '0-30', align: 'right', width: 24 },
      { head: '31-60', align: 'right', width: 24 },
      { head: '61-90', align: 'right', width: 24 },
      { head: '90+', align: 'right', width: 24 },
      { head: 'Outstanding', align: 'right', width: 40 },
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
    cleanStatusText(s.reconciliationStatus),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Supplier', width: 52 },
      { head: 'PAN', width: 28 },
      { head: 'Phone', width: 32 },
      { head: 'Balance', align: 'right', width: 34 },
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
      { head: 'Supplier', width: 44 },
      { head: 'Opening', align: 'right', width: 23 },
      { head: 'Purchases', align: 'right', width: 23 },
      { head: 'Payments', align: 'right', width: 23 },
      { head: 'Returns/Adj', align: 'right', width: 23 },
      { head: 'Closing', align: 'right', width: 23 },
      { head: 'Net Payable', align: 'right', width: 23 },
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
      { head: 'Supplier', width: 46 },
      { head: '0-30', align: 'right', width: 24 },
      { head: '31-60', align: 'right', width: 24 },
      { head: '61-90', align: 'right', width: 24 },
      { head: '90+', align: 'right', width: 24 },
      { head: 'Payable', align: 'right', width: 40 },
    ],
    body,
  })
}

function formatPaymentMethod(method?: string): string {
  if (!method) return '—'
  const m = safeText(method).toLowerCase().replace(/_/g, ' ')
  if (m.includes('bank')) return 'Bank Transfer'
  if (m.includes('cash')) return 'Cash'
  if (m.includes('esewa')) return 'eSewa'
  if (m.includes('khalti')) return 'Khalti'
  if (m.includes('cheque')) return 'Cheque'
  return m.replace(/\b\w/g, (l) => l.toUpperCase())
}

function drawPayments(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const payments = data.paymentsDetail
  if (payments.length === 0) return drawEmptyNote(doc, y, 'No payment transactions recorded for the selected period.')

  const body = payments.map((p) => [
    safeDate(p.date),
    p.entityType === 'customer' ? 'Customer Payment' : 'Supplier Payment',
    safeText(p.entityName),
    safeText(p.reference),
    formatNpr(p.amount),
    formatPaymentMethod(p.method),
    cleanStatusText(p.status),
  ])
  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 20 },
      { head: 'Type', width: 28 },
      { head: 'Party', width: 38 },
      { head: 'Reference', width: 26 },
      { head: 'Amount', align: 'right', width: 24 },
      { head: 'Method', width: 24 },
      { head: 'Status', align: 'center', width: 22 },
    ],
    body,
    totals: [
      {
        cells: ['', '', '', 'TOTAL', formatNpr(payments.reduce((a, p) => a + p.amount, 0)), '', ''],
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
      { head: 'Product', width: 44 },
      { head: 'SKU', width: 26 },
      { head: 'Category', width: 32 },
      { head: 'Stock', align: 'right', width: 16 },
      { head: 'Cost (Rs)', align: 'right', width: 22 },
      { head: 'Selling (Rs)', align: 'right', width: 22 },
      { head: 'Status', width: 20 },
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
      { label: 'Potential Gross Margin', value: formatPercent(inv.summary.potentialGrossMarginPercent) },
    ],
  })
  y = drawTotalsBar(doc, {
    startY: y,
    text: `Opening: ${formatNpr(inv.summary.openingStockValue)} | In: ${formatNpr(inv.summary.stockInValue)} | Out: ${formatNpr(inv.summary.stockOutValue)} | Note: Potential Gross Margin is based on current inventory cost and current selling prices.`,
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
      { head: 'Product', width: 32 },
      { head: 'SKU', width: 24 },
      { head: 'Qty', align: 'right', width: 12 },
      { head: 'Unit Cost', align: 'right', width: 20 },
      { head: 'Clos. Value', align: 'right', width: 22 },
      { head: 'Selling Price', align: 'right', width: 22 },
      { head: 'Retail Value', align: 'right', width: 22 },
      { head: 'Gross Margin', align: 'right', width: 20 },
      { head: 'Cost Status', align: 'center', width: 8 },
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

  const body = movements.map((m) => {
    const rawType = safeText(m.type).toUpperCase().replace(/_/g, ' ')
    const displayType = rawType.includes('IN') ? 'STOCK IN' : rawType.includes('OUT') ? 'STOCK OUT' : rawType
    const qtySign = displayType === 'STOCK IN' ? `+${Math.abs(m.quantity)}` : displayType === 'STOCK OUT' ? `-${Math.abs(m.quantity)}` : formatSignedQuantity(m.quantity)

    return [
      safeDate(m.date),
      safeText(m.productName),
      safeText(m.sku),
      displayType,
      formatNumber(m.previousQuantity),
      qtySign,
      formatNumber(m.newQuantity),
      safeText(m.reason),
    ]
  })

  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 20 },
      { head: 'Product', width: 34 },
      { head: 'SKU', width: 24 },
      { head: 'Type', width: 18 },
      { head: 'From', align: 'right', width: 14 },
      { head: 'Qty', align: 'right', width: 14 },
      { head: 'To', align: 'right', width: 14 },
      { head: 'Reason', width: 44 },
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

  let nextY = finalY
  if (k.costDataMissingCount > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.negative800[0], PDF_COLORS.negative800[1], PDF_COLORS.negative800[2])
    doc.text(
      `Note: ${formatNumber(k.costDataMissingCount)} product(s) are missing cost data, so COGS/gross profit may be understated.`,
      PDF_SPACING.pageMargin,
      nextY + 2,
    )
    nextY += 6
  }

  if (p.netProfit < 0 || p.netMarginPercent < 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.negative800[0], PDF_COLORS.negative800[1], PDF_COLORS.negative800[2])
    doc.text(
      `Note: Operating expenses exceed current-period revenue (negative net margin).`,
      PDF_SPACING.pageMargin,
      nextY + 2,
    )
    nextY += 6
  }

  return nextY
}

function drawVatSummary(doc: Page, y: number, data: MegaReportData): number {
  const v = data.vatSummary
  const biz = data.meta.business
  const isRegistered = v.isVatRegistered ?? Boolean(biz.vatNumber && String(biz.vatNumber).trim() !== '')

  if (!isRegistered || v.status === 'NOT_APPLICABLE') {
    const body = [
      ['VAT Registration Status', 'Not Registered'],
      ['Standard VAT Rate', `${v.vatRate}%`],
      ['Applied VAT Status', 'N/A — Not VAT Registered'],
      ['Output VAT Charged', 'Rs. 0.00'],
      ['Input VAT Paid', 'Rs. 0.00'],
      ['NET VAT POSITION', 'N/A'],
      ['Status', 'NOT APPLICABLE — BUSINESS NOT VAT REGISTERED'],
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

  const body = [
    ['VAT Registration Status', 'Registered'],
    ['Taxable Sales', formatNpr(v.taxableSales)],
    ['Output VAT Charged', formatNpr(v.outputVat)],
    ['Taxable Purchases', formatNpr(v.taxablePurchases)],
    ['Input VAT Paid', formatNpr(v.inputVat)],
    ['Standard VAT Rate', formatPercent(v.vatRate)],
    ['NET VAT POSITION', formatNpr(v.netVatPosition)],
    ['Status', v.status === 'PAYABLE' ? 'VAT Payable' : v.status === 'REFUNDABLE_CREDIT' ? 'Refundable Credit' : 'NIL / Zero'],
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
      .filter(([k, v]) => v !== undefined && v !== null && !k.startsWith('$') && k !== 'tenantId' && k !== 'businessId')
      .map(([k, v]) => {
        const keyLabel = k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim()
        if (typeof v === 'number' && (k.toLowerCase().includes('amount') || k.toLowerCase().includes('total') || k.toLowerCase().includes('price') || k.toLowerCase().includes('tax') || k.toLowerCase().includes('vat'))) {
          return `${keyLabel}: ${formatNpr(v)}`
        }
        if (typeof v === 'object') {
          return `${keyLabel}: ${JSON.stringify(v)}`
        }
        return `${keyLabel}: ${String(v)}`
      })
    return entries.length > 0 ? entries.join('  |  ') : '—'
  } catch {
    return safeText(String(meta))
  }
}

function formatAuditActionLabel(action?: string): string {
  if (!action) return '—'
  const act = safeText(action).toUpperCase()
  const map: Record<string, string> = {
    STOCK_MOVEMENT: 'Stock Movement',
    PURCHASE_CREATED: 'Purchase Created',
    SALE_CREATED: 'Sale Created',
    EXPENSE_CREATED: 'Expense Created',
    SALE_CANCELLED: 'Sale Cancelled',
    PURCHASE_CANCELLED: 'Purchase Cancelled',
    CUSTOMER_CREATED: 'Customer Created',
    SUPPLIER_CREATED: 'Supplier Created',
    PRICE_OVERRIDE: 'Price Override',
  }
  if (map[act]) return map[act]
  return act.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function drawAuditTrail(doc: Page, y: number, data: MegaReportData, hook: any): number {
  const trail = data.auditTrail
  if (trail.length === 0) return drawEmptyNote(doc, y, 'No audit trail entries for the selected period.')

  const body = trail.map((a) => [
    safeDate(a.timestamp),
    formatAuditActionLabel(a.action),
    safeText(a.target),
    truncateUserId(a.userId),
    safeText(formatAuditMetadataDetails(a.metadata)),
  ])
  return drawTable(doc, {
    startY: y,
    pageHook: hook,
    columns: [
      { head: 'Date', width: 20 },
      { head: 'Action', width: 30 },
      { head: 'Target', width: 26 },
      { head: 'User', width: 22 },
      { head: 'Details', width: 84 },
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
    truncateUserId(d.cancelledBy),
  ])
  return drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Type', width: 24 },
      { head: 'Doc #', width: 22 },
      { head: 'Date', width: 18 },
      { head: 'Amount', align: 'right', width: 22 },
      { head: 'Party', width: 28 },
      { head: 'Reason', width: 40 },
      { head: 'Cancelled By', width: 28 },
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

function drawIrdReconciliation(doc: Page, y: number, data: MegaReportData, hook?: any): number {
  const items = data.irdReconciliation
  if (items.length === 0) return drawEmptyNote(doc, y, 'No IRD reconciliation records found for the period.')

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
    pageHook: hook,
    columns: [
      { head: 'Invoice #', width: 28 },
      { head: 'Date', width: 20 },
      { head: 'Customer', width: 42 },
      { head: 'Total Amount', align: 'right', width: 26 },
      { head: 'Local Status', width: 32 },
      { head: 'IRD Status', width: 34 },
    ],
    body,
    totals: [{ cells: ['TOTAL', '', '', formatNpr(items.reduce((a, r) => a + r.totalAmount, 0)), '', ''] }],
    fontScale: 'dense',
  })
}

function drawIntegrity(doc: Page, y: number, data: MegaReportData): number {
  const issues = data.integrity.issues
  const lines = [
    { label: 'Reconciliation Checks', value: `${data.integrity.reconciliationCount} run` },
    { label: 'Balanced Checks', value: `${formatNumber(data.reconciliation.filter((r) => r.status === 'BALANCED').length)}` },
    { label: 'Needs Attention', value: `${formatNumber(data.reconciliation.filter((r) => r.status !== 'BALANCED').length)}` },
    { label: 'Products Missing Cost', value: formatNumber(data.integrity.costDataMissingCount) },
  ]
  y = drawMetadata(doc, { startY: y, lines, columnCount: 2 })

  y += 4
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const inner = pageWidth - margin * 2

  doc.setFillColor(issues.length > 0 ? PDF_COLORS.canvas50[0] : PDF_COLORS.accent100[0],
                   issues.length > 0 ? PDF_COLORS.canvas50[1] : PDF_COLORS.accent100[1],
                   issues.length > 0 ? PDF_COLORS.canvas50[2] : PDF_COLORS.accent100[2])
  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.roundedRect(margin, y, inner, 18, 2.5, 2.5, 'FD')

  const barColor = issues.length > 0 ? PDF_COLORS.negative800 : PDF_COLORS.positive800
  doc.setFillColor(barColor[0], barColor[1], barColor[2])
  doc.rect(margin, y, 2, 18, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.text('DATA INTEGRITY & QUALITY CONCLUSION', margin + 6, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(barColor[0], barColor[1], barColor[2])
  const conclusionText = issues.length === 0
    ? 'All 24 Reconciliation Checks Passed. 0 Warnings, 0 Mismatches. Report Generation Complete.'
    : `Attention Required: ${issues.length} integrity warning(s) detected. Please review system audit logs.`
  doc.text(conclusionText, margin + 6, y + 12.5)

  return y + 24
}

function drawEmptyNote(doc: Page, y: number, message: string): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const inner = pageWidth - margin * 2

  doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.roundedRect(margin, y + 1, inner, 14, 2, 2, 'FD')

  doc.setFillColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
  doc.rect(margin, y + 1, 1.5, 14, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
  doc.text('NO RECORDS FOUND — ' + truncateText(safeText(message), 110), margin + 5, y + 9.5)

  return y + 18
}

export { sanitizeFilename }
