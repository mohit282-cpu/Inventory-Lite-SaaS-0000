/**
 * Audit Pack PDF (inside the .zip) — rebuilt on the shared design system.
 *
 * Replaces the old 3-line inline `new jsPDF()` text stub in the audit-pack
 * exporters with a proper, wrapping-safe Sales Register summary document.
 */

import { generateSalesRegisterPdf } from '@/lib/pdf/reports/sales-register-pdf'
import type { ExportDataPayload } from './excel-export'

/**
 * Build a signed Sales Register summary PDF for the audit pack from the
 * business-intelligence payload. Returns the generated PDF as a Blob ready to
 * add into the JSZip archive.
 */
export function buildAuditPackPdf(data: ExportDataPayload): Blob {
  const businessName = data.businessName || 'My Business'
  const yearLabel = data.yearLabel || 'FY'

  const activeSales = (data.sales || []).filter((s) => s.status !== 'cancelled')

  const businessLike = {
    name: businessName,
    address: '',
    phone: '',
    email: '',
    panNumber: data.panNumber,
    vatNumber: undefined,
    taxRegistrationType: undefined,
    taxRegistrationNumber: undefined,
  }

  const summary = activeSales.reduce(
    (acc, s) => {
      acc.totalInvoices += 1
      acc.totalSales += s.total || 0
      acc.totalTaxableAmount += s.taxableAmount || 0
      acc.totalVat += s.vatAmount || 0
      acc.totalDiscount += s.discount || 0
      return acc
    },
    { totalInvoices: 0, totalSales: 0, totalDiscount: 0, totalTaxableAmount: 0, totalVat: 0, totalCancelled: 0 },
  )

  const doc = generateSalesRegisterPdf({
    business: businessLike as any,
    rows: activeSales.map((s) => ({
      invoiceNumber: s.saleNumber || `SALE-${(s.$id || '').slice(0, 6).toUpperCase()}`,
      date: s.createdAt || '',
      customerName: '—',
      taxableAmount: s.taxableAmount || 0,
      discount: s.discount || 0,
      vat: s.vatAmount || 0,
      total: s.total || 0,
      paidAmount: s.paidAmount || 0,
      outstanding: s.dueAmount || 0,
      paymentStatus: s.status === 'cancelled' ? 'CANCELLED' : (s.dueAmount || 0) > 0 ? 'UNPAID' : 'PAID',
    })),
    summary,
    yearLabel,
    dateFrom: data.dateFrom,
    dateTo: data.dateTo,
  })

  return doc.output('blob')
}
