/**
 * Shared summary/filter card + KPI bar.
 *
 * A light rounded card that lays out labeled columns (report scope / filters),
 * optionally followed by a KPI "totals" bar. Replaces the duplicated ad-hoc
 * cards in the old generators.
 */

import jsPDF from 'jspdf'
import { PDF_COLORS, PDF_FONT, PDF_SPACING } from '@/lib/pdf/theme'
import { safeText, truncateText } from '@/lib/pdf/fonts'
import { distributeColumns } from '@/lib/pdf/formatters'

export interface SummaryColumn {
  label: string
  value: string
}

export interface PdfSummaryCardOptions {
  startY: number
  columns: SummaryColumn[]
  /** Fixed height of the card if it must match a specific block. */
  height?: number
}

/** Draw the filter/scope card. Returns the new y below the card. */
export function drawSummaryCard(doc: jsPDF, opts: PdfSummaryCardOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const height = opts.height ?? PDF_SPACING.summaryCardHeight
  const columns = opts.columns.length > 0 ? opts.columns : [{ label: 'Scope', value: 'All' }]

  doc.setFillColor(PDF_COLORS.canvas50[0], PDF_COLORS.canvas50[1], PDF_COLORS.canvas50[2])
  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.roundedRect(margin, opts.startY, pageWidth - margin * 2, height, 2, 2, 'FD')

  const gap = 12
  const startXs = distributeColumns(margin + 4, pageWidth - margin - 4, columns.length, gap)

  columns.forEach((col, idx) => {
    const x = startXs[idx]
    doc.setFont(PDF_FONT.base, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
    doc.text(truncateText(safeText(col.label).toUpperCase(), 30), x, opts.startY + 7)

    doc.setFont(PDF_FONT.base, 'normal')
    doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
    doc.text(truncateText(safeText(col.value), 42), x, opts.startY + 14)
  })

  return opts.startY + height + 6
}

export interface PdfTotalsBarOptions {
  startY: number
  text: string
  /** Optional fill. Defaults to a light slate bar. */
  textColor?: readonly [number, number, number]
}

/** Draw a single-line KPI/totals bar. Returns the new y below it. */
export function drawTotalsBar(doc: jsPDF, opts: PdfTotalsBarOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const height = PDF_SPACING.totalsBarHeight

  doc.setFillColor(PDF_COLORS.canvas100[0], PDF_COLORS.canvas100[1], PDF_COLORS.canvas100[2])
  doc.setDrawColor(PDF_COLORS.ink300[0], PDF_COLORS.ink300[1], PDF_COLORS.ink300[2])
  doc.rect(margin, opts.startY, pageWidth - margin * 2, height, 'FD')

  doc.setFont(PDF_FONT.base, 'bold')
  doc.setFontSize(8)
  const color = opts.textColor ?? PDF_COLORS.ink900
  doc.setTextColor(color[0], color[1], color[2])
  doc.text(safeText(opts.text), margin + 4, opts.startY + height / 2 + 1)

  return opts.startY + height + 6
}
