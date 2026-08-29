/**
 * Mega Business Report — PDF charts.
 *
 * Professional, print-safe bar charts drawn with raw jsPDF primitives so they
 * render identically everywhere (no external chart lib). Charts are only drawn
 * when the data is meaningful; otherwise the caller renders a clear
 * "no sufficient data" note. Values are formatted via the shared formatters so
 * numbers always match the rest of the report.
 */

import type jsPDF from 'jspdf'
import { PDF_COLORS, PDF_SPACING } from '@/lib/pdf/theme'
import { safeText } from '@/lib/pdf/fonts'
import { formatNpr, formatNumber } from '@/lib/pdf/formatters'

export interface MegaChartBar {
  label: string
  value: number
  /** Optional secondary value forming a paired/grouped bar. */
  value2?: number
}

export interface MegaChartOptions {
  title: string
  /** Y-axis caption, e.g. 'Amount (NPR)'. */
  unitLabel?: string
  formatValue?: (v: number) => string
  /** Draw as grouped (paired) bars when a bar has value2. */
  paired?: boolean
  legend?: [string, string]
}

const MARGIN = PDF_SPACING.pageMargin
const NEGATIVE = PDF_COLORS.negative800
const ACCENT = PDF_COLORS.accent700
const INK = PDF_COLORS.ink900

/**
 * Draw a vertical (grouped) bar chart. Returns the y just below the chart.
 * Falls back to a compact "no sufficient data" box when bars is empty.
 */
export function drawBarChart(
  doc: jsPDF,
  opts: MegaChartOptions,
  bars: MegaChartBar[],
  x: number,
  y: number,
  chartHeight: number,
  width: number,
): number {
  const fmt = opts.formatValue ?? formatNpr

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(safeText(opts.title).toUpperCase(), x, y)

  if (!bars || bars.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text('No sufficient data for chart.', x + 2, y + 6)
    return y + 12
  }

  const isPaired = opts.paired && bars.some((b) => typeof b.value2 === 'number')

  const padTop = 10
  const padBottom = 16
  const axisLeft = 34
  const innerWidth = width - axisLeft - 6
  const plotHeight = chartHeight - padTop - padBottom - 8
  const plotTop = y + padTop + 4
  const plotBottom = plotTop + plotHeight

  // Determine max value (>= 0) for scaling.
  let maxV = 0
  bars.forEach((b) => {
    if (b.value > maxV) maxV = b.value
    if (typeof b.value2 === 'number' && b.value2 > maxV) maxV = b.value2
  })
  if (maxV <= 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text('No sufficient data for chart.', x + 2, plotTop + 4)
    return y + 14
  }
  const niceMax = niceCeil(maxV)

  const n = bars.length
  const groupWidth = innerWidth / n
  const barSpacing = 3
  const barMax = Math.max(6, groupWidth - barSpacing * 2 - (isPaired ? 2 : 0))
  const barWidth = isPaired ? Math.max(2.5, (barMax - 2) / 2) : barMax

  // Horizontal gridlines + Y axis labels (0, 25%, 50%, 75%, 100% of niceMax)
  doc.setDrawColor(PDF_COLORS.line200[0], PDF_COLORS.line200[1], PDF_COLORS.line200[2])
  doc.setFont('helvetica', 'normal')
  for (let g = 0; g <= 4; g++) {
    const gy = plotBottom - (plotHeight * g) / 4
    doc.setLineWidth(0.15)
    doc.line(x + axisLeft, gy, x + width - 3, gy)
    doc.setFontSize(6.5)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text(fmt((niceMax * g) / 4), x + axisLeft - 2, gy + 2, { align: 'right' })
  }

  // Bars
  bars.forEach((b, i) => {
    const gx = x + axisLeft + i * groupWidth + barSpacing
    const val = Math.max(0, b.value)
    const h = (val / niceMax) * plotHeight

    if (isPaired && typeof b.value2 === 'number') {
      // value2 = accent, value = ink
      const h2 = (Math.max(0, b.value2) / niceMax) * plotHeight
      doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2])
      doc.rect(gx, plotBottom - h2, barWidth, h2, 'F')
      doc.setFillColor(INK[0], INK[1], INK[2])
      doc.rect(gx + barWidth + 2, plotBottom - h, barWidth, h, 'F')
    } else {
      doc.setFillColor(INK[0], INK[1], INK[2])
      doc.rect(gx, plotBottom - h, barWidth, h, 'F')
      if (b.value < 0) {
        doc.setFillColor(NEGATIVE[0], NEGATIVE[1], NEGATIVE[2])
        doc.rect(gx, plotBottom, barWidth, Math.min((Math.abs(b.value) / niceMax) * plotHeight, plotHeight), 'F')
      }
    }

    // Value labels above bars (only when there's room)
    if (plotHeight > 26) {
      doc.setFontSize(6)
      doc.setTextColor(PDF_COLORS.ink600[0], PDF_COLORS.ink600[1], PDF_COLORS.ink600[2])
      doc.text(formatShort(val), gx + barWidth / 2, plotBottom - h - 1.5, { align: 'center' })
    }

    // X label (rotated not supported; show first N labels and trim)
    doc.setFontSize(6.5)
    doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
    const lbl = safeText(b.label)
    const maxLabelChars = Math.max(1, Math.floor(groupWidth / 1.3))
    doc.text(truncateChart(lbl, maxLabelChars), gx + groupWidth / 2, plotBottom + 4, { align: 'center' })
  })

  // Unit label for Y axis (rotated manually via lines of text going up)
  if (opts.unitLabel) {
    doc.setFontSize(6.5)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text(safeText(opts.unitLabel), x + 2, y + padTop + 2)
  }

  // Legend
  let ly = plotBottom + 6
  if (opts.legend) {
    doc.setFontSize(6.5)
    doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
    if (isPaired) {
      doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2])
      doc.rect(x + 2, ly - 3, 4, 3, 'F')
      doc.text(safeText(opts.legend[0] ?? ''), x + 8, ly)
      doc.setFillColor(INK[0], INK[1], INK[2])
      doc.rect(x + 30, ly - 3, 4, 3, 'F')
      doc.text(safeText(opts.legend[1] ?? ''), x + 36, ly)
    } else {
      doc.setFillColor(INK[0], INK[1], INK[2])
      doc.rect(x + 2, ly - 3, 4, 3, 'F')
      doc.text(safeText(opts.legend[0] ?? ''), x + 8, ly)
    }
    ly += 4
  }

  return ly + 2
}

/**
 * Draw a horizontal bar breakdown (e.g. expense by category). Returns y below.
 */
export function drawHorizontalBars(
  doc: jsPDF,
  opts: MegaChartOptions,
  items: { label: string; value: number }[],
  x: number,
  y: number,
  maxWidth: number,
): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(INK[0], INK[1], INK[2])
  doc.text(safeText(opts.title).toUpperCase(), x, y)

  if (!items || items.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text('No sufficient data for chart.', x + 2, y + 6)
    return y + 12
  }

  let maxV = 0
  items.forEach((it) => {
    if (it.value > maxV) maxV = it.value
  })
  if (maxV <= 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])
    doc.text('No sufficient data for chart.', x + 2, y + 6)
    return y + 12
  }

  const labelW = 40
  const barW = maxWidth - labelW - 26
  const rowH = 6
  const fmt = opts.formatValue ?? formatNpr

  let yy = y + 6
  items.forEach((it) => {
    const bw = (it.value / maxV) * barW
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(PDF_COLORS.ink800[0], PDF_COLORS.ink800[1], PDF_COLORS.ink800[2])
    doc.text(truncateChart(safeText(it.label), 28), x, yy)
    doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2])
    doc.rect(x + labelW, yy - 3, Math.max(2, bw), 3.4, 'F')
    doc.setFontSize(6.5)
    doc.setTextColor(PDF_COLORS.ink600[0], PDF_COLORS.ink600[1], PDF_COLORS.ink600[2])
    doc.text(fmt(it.value), x + labelW + barW + 3, yy)
    yy += rowH
  })
  return yy + 2
}

function niceCeil(v: number): number {
  if (v <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return nice * pow
}

function formatShort(v: number): string {
  if (v >= 1_00_00_000) return `${(v / 1_00_00_000).toFixed(1)}Cr`
  if (v >= 1_00_000) return `${(v / 1_00_000).toFixed(1)}L`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return formatNumber(v)
}

function truncateChart(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s
  return s.slice(0, Math.max(1, maxChars - 1)) + '…'
}

export { MARGIN }
