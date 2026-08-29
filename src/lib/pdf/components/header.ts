/**
 * Shared PDF report header.
 *
 * A dark bar with the business name on the left and the report title on the
 * right, plus an optional contact/metadata line. Returns the Y cursor position
 * just below the header so callers can continue.
 */

import jsPDF from 'jspdf'
import { PDF_COLORS, PDF_FONT, PDF_SPACING } from '@/lib/pdf/theme'
import { safeText, truncateText } from '@/lib/pdf/fonts'
import { formatBsDateTime } from '@/lib/pdf/formatters'

export interface PdfReportHeaderOptions {
  businessName: string
  reportTitle: string
  contactLine?: string
  generatedAt?: string
  showGenerated?: boolean
}

/** Render the header band. Returns the y position to continue drawing from. */
export function drawReportHeader(doc: jsPDF, opts: PdfReportHeaderOptions): number {
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin
  const barHeight = PDF_SPACING.headerBarHeight

  const title = safeText(opts.reportTitle, 'REPORT')
  const businessName = safeText(opts.businessName, 'Inventory Lite Store').toUpperCase()

  doc.setFillColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.rect(0, 0, pageWidth, barHeight, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont(PDF_FONT.base, 'bold')
  doc.setFontSize(15)
  doc.text(truncateText(businessName, 60), margin, 12)

  doc.setFont(PDF_FONT.base, 'normal')
  doc.setFontSize(9)
  doc.text(truncateText(title, 80), pageWidth - margin, 12, { align: 'right' })

  doc.setFontSize(8)
  doc.setTextColor(PDF_COLORS.ink300[0], PDF_COLORS.ink300[1], PDF_COLORS.ink300[2])
  const contact = opts.contactLine ? safeText(opts.contactLine) : ''
  doc.text(
    truncateText(contact, 110),
    margin,
    18,
  )

  if (opts.showGenerated !== false) {
    const generatedAt = opts.generatedAt ?? new Date().toISOString()
    doc.text(`Generated: ${formatBsDateTime(generatedAt)}`, pageWidth - margin, 18, { align: 'right' })
  }

  return barHeight + 6
}

// Re-export safeText truncation for convenience in report files.
export { safeText }
