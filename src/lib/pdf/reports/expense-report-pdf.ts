/**
 * Expense Report PDF.
 *
 * Uses authoritative expenses and computes a category breakdown for the report
 * display only (no business-logic changes; totals are sums of the given data).
 */

import jsPDF from 'jspdf'
import type { Business, Expense } from '@/types'
import { safeText, truncateText } from '@/lib/pdf/fonts'
import { formatBsDate, formatNpr, formatNumber, sanitizeFilename } from '@/lib/pdf/formatters'
import { createPdf, buildPageFooterHook, finalizePdf } from '@/lib/pdf/components/page'
import { drawReportHeader } from '@/lib/pdf/components/header'
import { drawSummaryCard } from '@/lib/pdf/components/summary'
import { drawTable } from '@/lib/pdf/components/table'
import { buildReportMeta } from './_context'

export interface ExpenseReportPdfOptions {
  business: Business
  expenses: Expense[]
  yearLabel?: string
  dateFrom?: string
  dateTo?: string
}

export { sanitizeFilename }

export function generateExpenseReportPdf(options: ExpenseReportPdfOptions): jsPDF {
  const { business, expenses, yearLabel, dateFrom, dateTo } = options
  const meta = buildReportMeta(business, { yearLabel, periodFrom: dateFrom, periodTo: dateTo })

  const doc = createPdf({ orientation: 'portrait' }) as jsPDF

  let y = drawReportHeader(doc, {
    businessName: meta.businessName,
    reportTitle: 'EXPENSE REPORT',
    contactLine: meta.contactLine,
  })

  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Financial Year', value: yearLabel ?? '—' },
      { label: 'Report Period', value: `${dateFrom ? formatBsDate(dateFrom) : 'All History'} → ${dateTo ? formatBsDate(dateTo) : 'Present'}` },
      { label: 'Expense Entries', value: formatNumber(expenses.length) },
      { label: 'Total Expenses', value: formatNpr(total) },
    ],
  })

  // Category breakdown (display only)
  const byCategory = new Map<string, number>()
  const byCategoryCount = new Map<string, number>()
  expenses.forEach((e) => {
    const cat = e.category || 'Uncategorized'
    byCategory.set(cat, (byCategory.get(cat) || 0) + (e.amount || 0))
    byCategoryCount.set(cat, (byCategoryCount.get(cat) || 0) + 1)
  })
  const categoryRows = [...byCategory.entries()].map(([cat, amt]) => [
    safeText(cat),
    formatNpr(amt),
    `${formatNumber(byCategoryCount.get(cat) || 0)} entries`,
    total > 0 ? `${formatNumber((amt / total) * 100, 1)}%` : '0%',
  ])

  drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Expense Category' },
      { head: 'Amount', align: 'right' },
      { head: 'Entries', align: 'right' },
      { head: 'Share', align: 'right' },
    ],
    body: categoryRows,
    totals: [{ cells: ['TOTAL', formatNpr(total), `${formatNumber(expenses.length)} entries`, '100%'] }],
  })

  const pageHook = buildPageFooterHook(doc, {
    footerText: `Inventory Lite SaaS  |  ${business.name || 'Shop'}  |  Expense Report`,
  })

  const detailBody = expenses.map((e) => [
    formatBsDate(e.date || e.createdAt),
    safeText(truncateText(e.category || 'Uncategorized', 20)),
    safeText(truncateText(e.title || e.description || '', 40)),
    formatNpr(e.amount || 0),
  ])

  // Adjust startY after category table via lastAutoTable
  const categoryFinalY = (doc as any).lastAutoTable?.finalY ?? y
  y = categoryFinalY + 8

  if (expenses.length > 0) {
    drawTable(doc, {
      startY: y,
      columns: [
        { head: 'Date', width: 26 },
        { head: 'Category', width: 40 },
        { head: 'Title / Description' },
        { head: 'Amount', align: 'right' },
      ],
      body: detailBody,
      pageHook,
      striped: true,
    })
  }

  return finalizePdf(doc)
}
