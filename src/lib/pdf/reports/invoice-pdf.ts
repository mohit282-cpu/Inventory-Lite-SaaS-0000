/**
 * Invoice PDF report.
 *
 * Renders a production-grade invoice generated from authoritative transaction
 * data already computed by the app (sale totals, VAT, line items, customer).
 * Portrait A4, print-friendly.
 */

import jsPDF from 'jspdf'
import type { Business } from '@/types'
import { safeText, truncateText } from '@/lib/pdf/fonts'
import { formatBsDate, formatNpr, formatNumber, sanitizeFilename } from '@/lib/pdf/formatters'
import { PDF_COLORS, PDF_FONT, PDF_SPACING } from '@/lib/pdf/theme'
import { createPdf, buildPageFooterHook, finalizePdf } from '@/lib/pdf/components/page'
import { drawTable } from '@/lib/pdf/components/table'
import { buildReportMeta } from './_context'

export interface InvoiceLineItem {
  name: string
  sku?: string
  quantity: number
  price: number
  amount?: number
}

export interface InvoiceCustomer {
  name?: string
  phone?: string
  pan?: string
  address?: string
}

export interface InvoicePdfData {
  business: Business
  invoiceNumber: string
  invoiceTitle?: string
  date?: string
  dueDate?: string
  customer?: InvoiceCustomer
  items: InvoiceLineItem[]
  subtotal: number
  discount: number
  vatAmount: number
  taxableAmount?: number
  total: number
  paidAmount?: number
  dueAmount?: number
  paymentMethod?: string
  note?: string
}

export { sanitizeFilename }

export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  const { business, customer } = data
  const meta = buildReportMeta(business)

  const doc = createPdf({ orientation: 'portrait' }) as jsPDF
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = PDF_SPACING.pageMargin

  // --- Business header ---
  doc.setFillColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont(PDF_FONT.base, 'bold')
  doc.setFontSize(16)
  doc.text(truncateText(meta.businessName, 50), margin, 14)
  doc.setFont(PDF_FONT.base, 'normal')
  doc.setFontSize(8)
  doc.text(truncateText(meta.contactLine, 90), margin, 22)

  doc.setFont(PDF_FONT.base, 'bold')
  doc.setFontSize(13)
  doc.text(
    truncateText(data.invoiceTitle || 'INVOICE', 26),
    pageWidth - margin,
    14,
    { align: 'right' },
  )

  let y = 38

  // --- Invoice reference + customer block ---
  doc.setFont(PDF_FONT.base, 'bold')
  doc.setFontSize(9)
  doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
  doc.text('BILL TO', margin, y)
  doc.text('INVOICE DETAILS', pageWidth / 2, y)

  doc.setFont(PDF_FONT.base, 'normal')
  doc.setTextColor(PDF_COLORS.ink900[0], PDF_COLORS.ink900[1], PDF_COLORS.ink900[2])
  doc.setFontSize(11)
  doc.text(truncateText(safeText(customer?.name || 'Walk-in Customer'), 40), margin, y + 7)

  doc.setFontSize(9)
  doc.text(`Invoice #: ${safeText(data.invoiceNumber)}`, pageWidth / 2, y + 7)
  doc.text(`Date: ${formatBsDate(data.date)}`, pageWidth / 2, y + 12)
  if (data.dueDate) doc.text(`Due Date: ${formatBsDate(data.dueDate)}`, pageWidth / 2, y + 17)

  if (customer?.phone || customer?.pan || customer?.address) {
    const custLine = [customer.address, customer.phone ? `Ph: ${customer.phone}` : null, customer.pan ? `PAN: ${customer.pan}` : null]
      .filter(Boolean)
      .join('  |  ')
    doc.setFontSize(8.5)
    doc.text(truncateText(custLine, 60), margin, y + 12)
  }

  y += 26

  // --- Line items table ---
  const body: any[][] = data.items.map((it) => [
    `${safeText(it.name)}${it.sku ? `\n(${it.sku})` : ''}${it.quantity > 1 ? `\n(${formatNumber(it.quantity)} × ${formatNpr(it.price)})` : ''}`,
    formatNpr(it.amount ?? it.quantity * it.price),
  ])

  const pageHook = buildPageFooterHook(doc, {
    footerText: `Inventory Lite SaaS  |  ${business.name || 'Shop'}  |  Invoice ${safeText(data.invoiceNumber)}`,
  })

  drawTable(doc, {
    startY: y,
    columns: [
      { head: `${data.items.length} items` },
      { head: 'Amount', align: 'right' },
    ],
    body,
    striped: false,
    pageHook,
    fontScale: 'default',
  })

  // --- Totals block to the right of a spacer row ---
  const tableY = (doc as any).lastAutoTable?.finalY ?? y
  y = tableY + 8

  const totalsBody: any[][] = [
    ['Subtotal', formatNpr(data.subtotal)],
  ]
  if (data.taxableAmount !== undefined) {
    totalsBody.push(['Taxable Amount', formatNpr(data.taxableAmount)])
  }
  totalsBody.push(['Discount', `(${formatNpr(Math.abs(data.discount))})`])
  totalsBody.push(['VAT', formatNpr(data.vatAmount)])
  totalsBody.push(['TOTAL', formatNpr(data.total)])

  drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Summary', width: 70 },
      { head: 'Amount', align: 'right' },
    ],
    body: totalsBody,
    totals: [{ cells: ['GRAND TOTAL', formatNpr(data.total)] }],
    striped: false,
    pageHook,
  })

  y = (doc as any).lastAutoTable?.finalY ?? y

  // --- Payment info ---
  const payLines: string[] = []
  if (data.paymentMethod) payLines.push(`Payment Method: ${data.paymentMethod}`)
  if (data.paidAmount !== undefined) payLines.push(`Paid: ${formatNpr(data.paidAmount)}`)
  if (data.dueAmount !== undefined) payLines.push(`Balance Due: ${formatNpr(data.dueAmount)}`)

  if (payLines.length > 0) {
    doc.setFont(PDF_FONT.base, 'bold')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.ink700[0], PDF_COLORS.ink700[1], PDF_COLORS.ink700[2])
    doc.text(payLines.join('    |    '), margin, y + 2)
  }

  if (data.note) {
    doc.setFont(PDF_FONT.base, 'italic')
    doc.setFontSize(8)
    doc.setTextColor(PDF_COLORS.ink600[0], PDF_COLORS.ink600[1], PDF_COLORS.ink600[2])
    doc.text(truncateText(safeText(data.note), 90), margin, y + 8)
  }

  return finalizePdf(doc)
}
