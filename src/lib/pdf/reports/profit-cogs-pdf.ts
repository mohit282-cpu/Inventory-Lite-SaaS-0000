/**
 * Profit / COGS Report PDF.
 *
 * Uses authoritative figures from the app's profit/Cost-of-Goods engine.
 * A profit & loss style summary with monthly trend when data is supplied.
 */

import jsPDF from 'jspdf'
import type { Business } from '@/types'
import { formatNpr, formatNumber, formatPercent, sanitizeFilename } from '@/lib/pdf/formatters'
import { createPdf, buildPageFooterHook, finalizePdf } from '@/lib/pdf/components/page'
import { drawReportHeader } from '@/lib/pdf/components/header'
import { drawSummaryCard, drawTotalsBar } from '@/lib/pdf/components/summary'
import { drawTable } from '@/lib/pdf/components/table'
import { buildReportMeta } from './_context'

export interface ProfitReportData {
  totalRevenue: number
  cogs: number
  grossProfit: number
  totalExpenses: number
  netProfit: number
  netMarginPercent: number
  totalSalesCount: number
}

export interface ProfitMonthlyRow {
  label: string
  revenue?: number
  expenses?: number
  profit?: number
}

export interface ProfitCogsPdfOptions {
  business: Business
  profit: ProfitReportData
  monthly?: ProfitMonthlyRow[]
  yearLabel?: string
  dateFrom?: string
  dateTo?: string
}

export { sanitizeFilename }

export function generateProfitCogsPdf(options: ProfitCogsPdfOptions): jsPDF {
  const { business, profit, monthly = [], yearLabel, dateFrom, dateTo } = options
  const meta = buildReportMeta(business, { yearLabel, periodFrom: dateFrom, periodTo: dateTo })
  const p = {
    totalRevenue: profit.totalRevenue ?? 0,
    cogs: profit.cogs ?? 0,
    grossProfit: profit.grossProfit ?? 0,
    totalExpenses: profit.totalExpenses ?? 0,
    netProfit: profit.netProfit ?? 0,
    netMarginPercent: profit.netMarginPercent ?? 0,
    totalSalesCount: profit.totalSalesCount ?? 0,
  }

  const doc = createPdf({ orientation: 'portrait' }) as jsPDF

  let y = drawReportHeader(doc, {
    businessName: meta.businessName,
    reportTitle: 'PROFIT / COGS REPORT',
    contactLine: meta.contactLine,
  })

  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Financial Year', value: yearLabel ?? '—' },
      { label: 'Report Period', value: `${dateFrom ? dateFrom : 'All History'} → ${dateTo ? dateTo : 'Present'}` },
      { label: 'Sales Count', value: formatNumber(p.totalSalesCount) },
    ],
  })

  y = drawTotalsBar(doc, {
    startY: y,
    text: `Net Margin: ${formatPercent(p.netMarginPercent)}  |  Net Profit: ${formatNpr(p.netProfit)}`,
  })

  const plRows = [
    ['Total Revenue (Sales)', formatNpr(p.totalRevenue)],
    ['Cost of Goods Sold (COGS)', `(${formatNpr(p.cogs)})`],
    ['Gross Profit', formatNpr(p.grossProfit)],
    ['Operating Expenses', `(${formatNpr(p.totalExpenses)})`],
    ['Net Profit', formatNpr(p.netProfit)],
    ['Net Margin %', formatPercent(p.netMarginPercent)],
  ]

  drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Line Item' },
      { head: 'Amount', align: 'right' },
    ],
    body: plRows,
    totals: [{ cells: ['Net Profit', formatNpr(p.netProfit)] }],
  })

  const pageHook = buildPageFooterHook(doc, {
    footerText: `Inventory Lite SaaS  |  ${business.name || 'Shop'}  |  Profit / COGS`,
  })

  if (monthly.length > 0) {
    const startY = (doc as any).lastAutoTable?.finalY ?? y
    const monthBody = monthly.map((m) => [
      safeLabel(m.label),
      formatNpr(m.revenue ?? 0),
      formatNpr(m.expenses ?? 0),
      formatNpr(m.profit ?? 0),
    ])
    drawTable(doc, {
      startY: startY + 8,
      columns: [
        { head: 'Period' },
        { head: 'Revenue', align: 'right' },
        { head: 'Expenses', align: 'right' },
        { head: 'Profit', align: 'right' },
      ],
      body: monthBody,
      pageHook,
      striped: true,
    })
  }

  return finalizePdf(doc)
}

function safeLabel(v: string): string {
  return typeof v === 'string' && v.length > 0 ? v : '-'
}
