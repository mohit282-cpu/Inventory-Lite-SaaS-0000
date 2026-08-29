/**
 * PDF page harness.
 *
 * Every report creates its document through `createPdf` and registers the
 * shared footer/page-number hook (repeated on every page) via `registerPageHook`.
 * Keeps paging logic in one place so all reports behave identically.
 */

import jsPDF from 'jspdf'
import { PDF_COLORS, PDF_FONT, PDF_SPACING, type PdfOrientation } from '@/lib/pdf/theme'
import { safeText } from '@/lib/pdf/fonts'

export interface PdfPageOptions {
  orientation?: PdfOrientation
}

/** Create an A4 jsPDF document. */
export function createPdf(options: PdfPageOptions = {}): jsPDF {
  const { orientation = 'portrait' } = options
  return new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  })
}

export type AutoTablePageHook = (payload: { pageNumber: number }) => void

export interface PageFooterOptions {
  footerText?: string
  didDrawPage?: (payload: { pageNumber: number }) => void
}

/**
 * Build the shared footer page-number hook. The returned function should be
 * passed as the `didDrawPage` option to every autoTable call so the footer is
 * repeated on each page that contains a table.
 */
export function buildPageFooterHook(doc: jsPDF, opts: PageFooterOptions = {}): AutoTablePageHook {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = PDF_SPACING.pageMargin
  const footerText = opts.footerText !== undefined && opts.footerText !== null
    ? opts.footerText
    : ''
  const didDrawPage = opts.didDrawPage

  return (payload: { pageNumber: number }): void => {
    doc.setFont(PDF_FONT.base, 'normal')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.ink500[0], PDF_COLORS.ink500[1], PDF_COLORS.ink500[2])

    if (footerText) {
      doc.text(safeText(footerText), margin, pageHeight - 6)
    }

    doc.text(
      `Page ${payload.pageNumber} of {totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' },
    )

    if (didDrawPage) {
      didDrawPage(payload)
    }
  }
}

/** Replace the {totalPages} macro after the last table renders. */
export function finalizePdf(doc: jsPDF): jsPDF {
  if (typeof (doc as any).putTotalPages === 'function') {
    ;(doc as any).putTotalPages('{totalPages}')
  }
  return doc
}

export { PDF_COLORS, PDF_FONT, PDF_SPACING }
