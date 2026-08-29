/**
 * VAT Summary Statement PDF report.
 *
 * Uses authoritative figures from auditCenterService.getVatSummary
 * (taxable/sales/purchases, output/input VAT, net VAT position).
 */

import jsPDF from 'jspdf'
import type { Business } from '@/types'
import { PDF_COLORS } from '@/lib/pdf/theme'
import { formatNpr, sanitizeFilename } from '@/lib/pdf/formatters'
import { createPdf, buildPageFooterHook, finalizePdf } from '@/lib/pdf/components/page'
import { drawReportHeader } from '@/lib/pdf/components/header'
import { drawSummaryCard, drawTotalsBar } from '@/lib/pdf/components/summary'
import { drawTable } from '@/lib/pdf/components/table'
import { buildReportMeta } from './_context'

export interface VatSummaryData {
  taxableSales: number
  nonTaxableSales: number
  outputVat: number
  taxablePurchases: number
  nonTaxablePurchases: number
  inputVat: number
  netVatPosition: number
  vatRate?: number
  status?: 'PAYABLE' | 'REFUNDABLE_CREDIT'
}

export interface VatSummaryPdfOptions {
  business: Business
  data: VatSummaryData
  yearLabel?: string
  dateFrom?: string
  dateTo?: string
}

export { sanitizeFilename }

export function generateVatSummaryPdf(options: VatSummaryPdfOptions): jsPDF {
  const { business, data, yearLabel, dateFrom, dateTo } = options
  const meta = buildReportMeta(business, { yearLabel, periodFrom: dateFrom, periodTo: dateTo })
  const vatRate = data.vatRate ?? 13

  const doc = createPdf({ orientation: 'portrait' }) as jsPDF

  let y = drawReportHeader(doc, {
    businessName: meta.businessName,
    reportTitle: `VAT SUMMARY STATEMENT (${vatRate}%)`,
    contactLine: meta.contactLine,
  })

  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Financial Year', value: yearLabel ?? '—' },
      { label: 'VAT Rate', value: `${vatRate}%` },
    ],
  })

  const statusColor =
    data.status === 'REFUNDABLE_CREDIT' ? PDF_COLORS.positive800 : PDF_COLORS.negative800
  y = drawTotalsBar(doc, {
    startY: y,
    text:
      `Net VAT Position: ${formatNpr(data.netVatPosition)}  |  ` +
      `Status: ${data.status === 'REFUNDABLE_CREDIT' ? 'Refundable Credit (Input > Output)' : 'Payable to Government'}`,
    textColor: statusColor,
  })

  const rows = [
    ['A', 'Taxable Supplies (Output)', formatNpr(data.taxableSales)],
    ['B', 'Non-Taxable / Exempt Supplies', formatNpr(data.nonTaxableSales)],
    ['C', 'Output VAT (13%)', formatNpr(data.outputVat)],
    ['', ''],
    ['D', 'Taxable Purchases (Input)', formatNpr(data.taxablePurchases)],
    ['E', 'Non-Taxable Purchases', formatNpr(data.nonTaxablePurchases)],
    ['F', 'Input VAT (13%)', formatNpr(data.inputVat)],
  ]

  const pageHook = buildPageFooterHook(doc, {
    footerText: `Inventory Lite SaaS  |  ${business.name || 'Shop'}  |  VAT Summary`,
  })

  drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Ref', width: 16, align: 'center' },
      { head: 'Description' },
      { head: 'Amount', align: 'right' },
    ],
    body: rows,
    totals: [
      { cells: ['', 'Net VAT Payable / (Credit)', formatNpr(data.netVatPosition)] },
    ],
    pageHook,
    striped: true,
  })

  return finalizePdf(doc)
}
