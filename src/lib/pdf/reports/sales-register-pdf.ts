/**
 * Sales Register PDF report.
 *
 * Uses the authoritative rows + summary produced by the audit center
 * (auditCenterService.getSalesRegister), so values always match the app and
 * no financial logic is re-derived here.
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

export interface SalesRegisterRow {
  invoiceNumber: string
  date: string
  customerName: string
  taxableAmount: number
  discount: number
  vat: number
  total: number
  paidAmount?: number
  outstanding?: number
  paymentStatus?: string
  invoiceStatus?: string
}

export interface SalesRegisterSummary {
  totalInvoices: number
  totalSales: number
  totalDiscount: number
  totalTaxableAmount: number
  totalVat: number
  totalCancelled?: number
}

export interface SalesRegisterPdfOptions {
  business: Business
  rows: SalesRegisterRow[]
  summary: SalesRegisterSummary
  yearLabel?: string
  dateFrom?: string
  dateTo?: string
  generatedBy?: string
}

export { sanitizeFilename }

export function generateSalesRegisterPdf(options: SalesRegisterPdfOptions): jsPDF {
  const { business, rows, summary, yearLabel, dateFrom, dateTo } = options
  const meta = buildReportMeta(business, { yearLabel, periodFrom: dateFrom, periodTo: dateTo })

  const doc = createPdf({ orientation: 'landscape' }) as jsPDF

  let y = drawReportHeader(doc, {
    businessName: meta.businessName,
    reportTitle: 'SALES REGISTER',
    contactLine: meta.contactLine,
  })

  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Financial Year', value: yearLabel ?? '—' },
      { label: 'Report Period', value: `${dateFrom ? formatBsDate(dateFrom) : 'All History'} → ${dateTo ? formatBsDate(dateTo) : 'Present'}` },
      { label: 'Invoices (Active)', value: formatNumber(summary.totalInvoices) },
      { label: 'Cancelled', value: formatNumber(summary.totalCancelled ?? 0) },
    ],
  })

  y = drawTotalsBar(doc, {
    startY: y,
    text:
      `Total Sales: ${formatNpr(summary.totalSales)}   |   ` +
      `Taxable: ${formatNpr(summary.totalTaxableAmount)}   |   ` +
      `Discount: ${formatNpr(summary.totalDiscount)}   |   ` +
      `VAT: ${formatNpr(summary.totalVat)}`,
  })

  const pageHook = buildPageFooterHook(doc, {
    footerText: `Inventory Lite SaaS  |  ${business.name || 'Shop'}  |  Sales Register`,
  })

  const body = rows.map((r) => {
    const paymentStatus = r.paymentStatus ?? (r.total > 0 && (r.outstanding ?? 0) > 0 ? 'UNPAID' : 'PAID')
    return [
      formatBsDate(r.date),
      safeText(r.invoiceNumber),
      safeText(r.customerName),
      formatNpr(r.taxableAmount),
      formatNpr(r.discount),
      formatNpr(r.vat),
      formatNpr(r.total),
      formatNpr(r.paidAmount ?? 0),
      formatNpr(r.outstanding ?? 0),
      safeText(paymentStatus),
    ]
  })

  drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Date', width: 22 },
      { head: 'Invoice #', width: 34 },
      { head: 'Customer' },
      { head: 'Taxable', align: 'right' },
      { head: 'Discount', align: 'right' },
      { head: 'VAT', align: 'right' },
      { head: 'Total', align: 'right' },
      { head: 'Paid', align: 'right' },
      { head: 'Outstanding', align: 'right' },
      { head: 'Status', width: 24 },
    ],
    body,
    totals: [
      {
        cells: [
          'TOTALS',
          `${formatNumber(summary.totalInvoices)} invoices`,
          '',
          formatNpr(summary.totalTaxableAmount),
          formatNpr(summary.totalDiscount),
          formatNpr(summary.totalVat),
          formatNpr(summary.totalSales),
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
