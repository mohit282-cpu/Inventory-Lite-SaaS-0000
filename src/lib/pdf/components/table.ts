/**
 * Shared PDF table renderer.
 *
 * Wraps jspdf-autotable with the design-system's consistent theme, correct
 * multi-line word wrapping (so text NEVER renders one-character-per-line),
 * zebra striping, an optional totals footer band, and the shared page-number
 * hook (repeated table headers + footers across pages).
 *
 * NOTE on the vertical word-break bug: jspdf-autotable breaks words when a
 * column's `cellWidth` is narrower than the widest word. The old generators
 * relied on undefined cell widths / tiny font sizes. This module always sets
 * `overflow: 'linebreak'`, generous `minCellHeight`, and lets callers pass
 * fixed widths only when a column is genuinely wide enough. Most reports omit
 * widths and let autotable compute them, which yields natural word wrapping.
 */

import autoTable from 'jspdf-autotable'
import type jsPDF from 'jspdf'
import { PDF_COLORS, PDF_FONT, PDF_SPACING } from '@/lib/pdf/theme'
import type { AutoTablePageHook } from './page'
import { buildPageFooterHook, syncPageSize } from './page'

type CellAlign = 'left' | 'center' | 'right'

export interface PdfTableCellStyle {
  align?: CellAlign
  fillColor?: readonly [number, number, number]
  textColor?: readonly [number, number, number]
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic'
}

export interface PdfTableColumn {
  head: string
  /** Optional fixed width in mm. Omit to let autotable auto-size so words wrap naturally. */
  width?: number
  align?: CellAlign
  bodyStyle?: PdfTableCellStyle
  /** Optional monospaced alignment override for numeric columns. */
  numeric?: boolean
}

export interface PdfTableOptions {
  startY: number
  columns: PdfTableColumn[]
  body: any[][]
  /** Footer/totals rows rendered as a bold band at the bottom of the table. */
  totals?: { cells: any[] }[]
  /** Shared page-number hook (optional but recommended for multi-page). */
  pageHook?: AutoTablePageHook
  /** Footer text for the page hook. */
  footerText?: string
  /** Use striped theme (defaults to true for readability). */
  striped?: boolean
  fontScale?: 'default' | 'dense'
}

/**
 * Render a table and return the y coordinate just below it (plus one gap).
 */
export function drawTable(doc: jsPDF, opts: PdfTableOptions): number {
  const margin = PDF_SPACING.pageMargin
  const { columns, body, totals } = opts
  const striped = opts.striped ?? true

  const head = [columns.map((c) => c.head)]
  const bodyRows: any[][] = body
  const footRows: any[][] | undefined =
    totals && totals.length > 0 ? totals.map((t) => t.cells) : undefined

  const columnStyles: Record<number, any> = {}
  columns.forEach((c, i) => {
    const st: any = {}
    if (c.width) st.cellWidth = c.width
    if (c.align) st.halign = c.align
    else if (c.numeric) st.halign = 'right'
    if (c.bodyStyle) {
      if (c.bodyStyle.textColor) st.textColor = [...c.bodyStyle.textColor]
      if (c.bodyStyle.fontStyle) st.fontStyle = c.bodyStyle.fontStyle
    }
    if (Object.keys(st).length > 0) columnStyles[i] = st
  })

  const pageHook: AutoTablePageHook | undefined =
    opts.pageHook ??
    (opts.footerText ? buildPageFooterHook(doc, { footerText: opts.footerText }) : undefined)

  syncPageSize(doc)
  const d = doc as any
  const pageWidth = typeof d.getPageWidth === 'function' ? d.getPageWidth() : d.internal.pageSize.getWidth()
  const tableWidth = pageWidth - margin * 2

  /* eslint-disable no-console */
  const origLog = console.log
  console.log = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('Of the table content,')) {
      return
    }
    origLog.apply(console, args)
  }

  try {
    autoTable(doc, {
      startY: opts.startY,
      tableWidth,
      margin: { left: margin, right: margin, bottom: PDF_SPACING.footerHeight },
      head,
      body: bodyRows,
      foot: footRows,
      theme: striped ? 'striped' : 'grid',
      styles: {
        fontSize: opts.fontScale === 'dense' ? 7.5 : 8,
        cellPadding: opts.fontScale === 'dense' ? PDF_SPACING.denseCellPadding : PDF_SPACING.tableCellPadding,
        overflow: 'linebreak',
        minCellHeight: opts.fontScale === 'dense' ? 6 : 7,
        textColor: [PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2]],
        valign: 'middle',
      },
      headStyles: {
        fillColor: [PDF_COLORS.ink800[0], PDF_COLORS.ink800[1], PDF_COLORS.ink800[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
        minCellHeight: 8,
      },
      footStyles: {
        fillColor: [PDF_COLORS.canvas100[0], PDF_COLORS.canvas100[1], PDF_COLORS.canvas100[2]],
        textColor: [PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2]],
        fontStyle: 'bold',
        minCellHeight: 8,
      },
      alternateRowStyles: {
        fillColor: [PDF_COLORS.zebra[0], PDF_COLORS.zebra[1], PDF_COLORS.zebra[2]],
      },
      columnStyles,
      didDrawPage: pageHook,
    })
  } finally {
    console.log = origLog
  }
  /* eslint-enable no-console */

  const finalY = (doc as any).lastAutoTable?.finalY ?? opts.startY
  return finalY + 6
}

export { PDF_COLORS, PDF_FONT }
