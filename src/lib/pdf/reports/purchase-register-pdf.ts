/**
 * Purchase Register PDF report.
 *
 * Uses authoritative rows + summary from auditCenterService.getPurchaseRegister.
 */

import jsPDF from 'jspdf'
import type { Business } from '@/types'
import { safeText } from '@/lib/pdf/fonts'
import { formatBsDate, formatNpr, formatNumber, sanitizeFilename } from '@/lib/pdf/formatters'
import { createPdf, buildPageFooterHook, finalizePdf } from '@/lib/pdf/components/page'
import { drawReportHeader } from '@/lib/pdf/components/header'
import { drawSummaryCard, drawTotalsBar } from '@/lib/pdf/components/summary'
import { drawTable } from '@/lib/pdf/components/table'
import { buildReportMeta } from './_context'

export interface PurchaseRegisterRow {
  purchaseReference: string
  date: string
  supplierName: string
  taxableAmount: number
  discount: number
  vatAmount: number
  total: number
  paidAmount?: number
  outstanding?: number
  paymentStatus?: string
}

export interface PurchaseRegisterSummary {
  totalPurchases: number
  taxablePurchases: number
  inputVat: number
}

export interface PurchaseRegisterPdfOptions {
  business: Business
  rows: PurchaseRegisterRow[]
  summary: PurchaseRegisterSummary
  yearLabel?: string
  dateFrom?: string
  dateTo?: string
}

export { sanitizeFilename }

export function generatePurchaseRegisterPdf(options: PurchaseRegisterPdfOptions): jsPDF {
  const { business, rows, summary, yearLabel, dateFrom, dateTo } = options
  const meta = buildReportMeta(business, { yearLabel, periodFrom: dateFrom, periodTo: dateTo })

  const doc = createPdf({ orientation: 'landscape' }) as jsPDF

  let y = drawReportHeader(doc, {
    businessName: meta.businessName,
    reportTitle: 'PURCHASE REGISTER',
    contactLine: meta.contactLine,
  })

  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Financial Year', value: yearLabel ?? '—' },
      { label: 'Report Period', value: `${dateFrom ? formatBsDate(dateFrom) : 'All History'} → ${dateTo ? formatBsDate(dateTo) : 'Present'}` },
      { label: 'Purchases', value: formatNumber(rows.length) },
      { label: 'Input VAT Rate', value: '13%' },
    ],
  })

  y = drawTotalsBar(doc, {
    startY: y,
    text:
      `Total Purchases: ${formatNpr(summary.totalPurchases)}   |   ` +
      `Taxable: ${formatNpr(summary.taxablePurchases)}   |   ` +
      `Input VAT: ${formatNpr(summary.inputVat)}`,
  })

  const pageHook = buildPageFooterHook(doc, {
    footerText: `Inventory Lite SaaS  |  ${business.name || 'Shop'}  |  Purchase Register`,
  })

  const body = rows.map((r) => [
    formatBsDate(r.date),
    safeText(r.purchaseReference),
    safeText(r.supplierName),
    formatNpr(r.taxableAmount),
    formatNpr(r.discount),
    formatNpr(r.vatAmount),
    formatNpr(r.total),
    formatNpr(r.paidAmount ?? 0),
    formatNpr(r.outstanding ?? 0),
    safeText(r.paymentStatus ?? 'PAID'),
  ])

  drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Date', width: 22 },
      { head: 'Purchase Ref', width: 34 },
      { head: 'Supplier' },
      { head: 'Taxable', align: 'right' },
      { head: 'Discount', align: 'right' },
      { head: 'Input VAT', align: 'right' },
      { head: 'Total', align: 'right' },
      { head: 'Paid', align: 'right' },
      { head: 'Payable', align: 'right' },
      { head: 'Status', width: 24 },
    ],
    body,
    totals: [
      {
        cells: [
          'TOTALS',
          `${formatNumber(rows.length)} purchases`,
          '',
          formatNpr(summary.taxablePurchases),
          '',
          formatNpr(summary.inputVat),
          formatNpr(summary.totalPurchases),
          '',
          '',
          '',
        ],
      },
    ],
    pageHook,
    fontScale: 'dense',
  })

  return finalizePdf(doc)
}
