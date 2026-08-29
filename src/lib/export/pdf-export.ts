/**
 * Generic Business Intelligence & Audit report / Export-Center PDF.
 *
 * Rewritten on the shared PDF design system so every caller (ExportMenu,
 * ExportAuditPack, ExportCenterTab) gets consistent production styling, proper
 * word wrapping (fixing the vertical one-character-per-line bug), page numbers
 * and repeated headers — without duplicating jsPDF styling anywhere.
 *
 * Cross-references the report generators in src/lib/pdf/reports for the typed
 * report types. This module handles the generic/combined payloads.
 */

import jsPDF from 'jspdf'
import { safeText } from '@/lib/pdf/fonts'
import { formatNpr, formatBsDateTime, sanitizeFilename } from '@/lib/pdf/formatters'
import { createPdf, buildPageFooterHook, finalizePdf } from '@/lib/pdf/components/page'
import { drawReportHeader } from '@/lib/pdf/components/header'
import { drawSummaryCard } from '@/lib/pdf/components/summary'
import { drawTable } from '@/lib/pdf/components/table'

interface ExportPayload {
  title?: string
  businessName?: string
  panNumber?: string
  fiscalYear?: string
  yearLabel?: string
  dateFrom?: string
  dateTo?: string
  items?: any[]
  sales?: any[]
  profitReport?: any
  paymentMethods?: any[]
  customers?: any[]
  products?: any[]
  [key: string]: any
}

/** Build the shared header meta for a generic report. */
function genericMeta(data: ExportPayload, title: string) {
  return {
    businessName: data.businessName || 'My Business',
    reportTitle: data.title || title,
    contactLine: [
      data.panNumber ? `PAN/VAT: ${data.panNumber}` : undefined,
      data.fiscalYear ? `Fiscal Year: ${data.fiscalYear}` : data.yearLabel ? `Fiscal Year: ${data.yearLabel}` : undefined,
      data.dateFrom ? `Period: ${data.dateFrom} → ${data.dateTo || 'Present'}` : undefined,
    ]
      .filter((v): v is string => Boolean(v))
      .join('  |  '),
  }
}

/**
 * Export a report payload to PDF.
 * - Spreads Object keys (non-Appwrite) as a generic table when `items` is given
 *   (Export Center flow).
 * - Renders a Business Intelligence & Audit report when full BI payload is given.
 */
export function exportToPDF(data: ExportPayload): void {
  const meta = genericMeta(data, 'BUSINESS INTELLIGENCE & AUDIT REPORT')
  const pageHookFooter = `${meta.businessName}  |  ${meta.reportTitle}`

  // --- Item-array flow (Export Center) ---
  if (data.items && Array.isArray(data.items) && data.items.length > 0) {
    const first = data.items[0]
    if (typeof first === 'object' && first !== null) {
      const keys = Object.keys(first).filter((k) => !k.startsWith('$'))
      const head = keys.map((k) => k.replace(/([A-Z])/g, ' $1').toUpperCase())
      const limited = data.items.slice(0, 3000)
      const body = limited.map((item) =>
        keys.map((k) => {
          const val = item[k]
          if (typeof val === 'number') return Number.isFinite(val) ? val.toLocaleString() : '-'
          return val !== undefined && val !== null ? String(val) : '-'
        }),
      )

      const doc = createPdf({ orientation: 'landscape' }) as jsPDF
      const hook = buildPageFooterHook(doc, { footerText: pageHookFooter })
      let y = drawReportHeader(doc, { ...meta, contactLine: meta.contactLine })
      y = drawSummaryCard(doc, {
        startY: y,
        columns: [
          { label: 'Records', value: String(limited.length) },
          { label: 'Generated', value: formatBsDateTime(new Date().toISOString()) },
        ],
      })
      drawTable(doc, {
        startY: y,
        columns: head.map((h) => ({ head: h })),
        body,
        pageHook: hook,
        fontScale: 'dense',
      })
      finalizePdf(doc).save(`${sanitizeFilename(meta.businessName)}_${sanitizeFilename(meta.reportTitle)}.pdf`)
      return
    }

    // Flat value list
    const doc = createPdf() as jsPDF
    const hook = buildPageFooterHook(doc, { footerText: pageHookFooter })
    let y = drawReportHeader(doc, meta)
    y = drawSummaryCard(doc, {
      startY: y,
      columns: [{ label: 'Records', value: String(data.items.length) }],
    })
    drawTable(doc, {
      startY: y,
      columns: [{ head: 'Value' }],
      body: data.items.map((it) => [safeText(it)]),
      pageHook: hook,
    })
    finalizePdf(doc).save(`${sanitizeFilename(meta.businessName)}_${sanitizeFilename(meta.reportTitle)}.pdf`)
    return
  }

  // --- Full BI payload ---
  const profit = data.profitReport || {}
  const sales = data.sales || []
  const paymentMethods = data.paymentMethods || []

  const doc = createPdf() as jsPDF
  const hook = buildPageFooterHook(doc, { footerText: pageHookFooter })

  let y = drawReportHeader(doc, meta)
  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Total Revenue', value: formatNpr(profit.totalRevenue) },
      { label: 'Gross Profit', value: formatNpr(profit.grossProfit) },
      { label: 'Net Profit', value: formatNpr(profit.netProfit) },
      { label: 'Margin', value: `${Number.isFinite(profit.netMarginPercent) ? profit.netMarginPercent : 0}%` },
    ],
  })

  // 1. Executive summary
  const execRows = [
    ['Total Revenue', formatNpr(profit.totalRevenue)],
    ['COGS', formatNpr(profit.cogs)],
    ['Gross Profit', formatNpr(profit.grossProfit)],
    ['Total Expenses', formatNpr(profit.totalExpenses)],
    ['Net Profit', formatNpr(profit.netProfit)],
    ['Net Margin %', `${Number.isFinite(profit.netMarginPercent) ? profit.netMarginPercent : 0}%`],
    ['Total Sales Count', String(Number.isFinite(profit.totalSalesCount) ? profit.totalSalesCount : 0)],
  ]
  drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Metric' },
      { head: 'Value', align: 'right' },
    ],
    body: execRows,
    pageHook: hook,
  })

  // 2. Sales register summary (widely-columned so words wrap naturally)
  const activeSales = sales.filter((s: any) => s.status !== 'cancelled').slice(0, 3000)
  if (activeSales.length > 0) {
    const startY = (doc as any).lastAutoTable?.finalY ?? y
    const salesBody = activeSales.map((s: any) => [
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-GB') : '',
      safeText(s.saleNumber || `SALE-${(s.$id || '').substring(0, 6)}`),
      safeText(s.paymentMethod || '-'),
      formatNpr(s.total),
      formatNpr((s.paidAmount ?? 0)),
      formatNpr((s.dueAmount ?? 0)),
    ])
    drawTable(doc, {
      startY: startY + 8,
      columns: [
        { head: 'Date', width: 26 },
        { head: 'Sale #' },
        { head: 'Method', width: 30 },
        { head: 'Total', align: 'right' },
        { head: 'Paid', align: 'right' },
        { head: 'Due', align: 'right' },
      ],
      body: salesBody,
      pageHook: hook,
    })
  }

  // 3. Payment reconciliation
  if (paymentMethods.length > 0) {
    const startY = (doc as any).lastAutoTable?.finalY ?? y
    const payBody = paymentMethods.map((p: any) => [
      safeText(p.name),
      String(Number.isFinite(p.count) ? p.count : 0),
      formatNpr(p.total),
    ])
    drawTable(doc, {
      startY: startY + 8,
      columns: [
        { head: 'Method' },
        { head: 'Count', align: 'right' },
        { head: 'Total Collected', align: 'right' },
      ],
      body: payBody,
      pageHook: hook,
    })
  }

  finalizePdf(doc).save(
    `${sanitizeFilename(meta.businessName)}_Audit_Report_${sanitizeFilename((data.yearLabel || data.fiscalYear || 'FY').replace(/[/\\]/g, '_'))}.pdf`,
  )
}
