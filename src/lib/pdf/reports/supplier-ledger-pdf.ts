/**
 * Supplier Payables Ledger & Aging PDF report.
 *
 * Uses authoritative entries from auditCenterService.getSupplierLedgers.
 */

import jsPDF from 'jspdf'
import type { Business } from '@/types'
import { safeText } from '@/lib/pdf/fonts'
import { formatNpr, formatNumber, sanitizeFilename } from '@/lib/pdf/formatters'
import { createPdf, buildPageFooterHook, finalizePdf } from '@/lib/pdf/components/page'
import { drawReportHeader } from '@/lib/pdf/components/header'
import { drawSummaryCard } from '@/lib/pdf/components/summary'
import { drawTable } from '@/lib/pdf/components/table'
import { buildReportMeta } from './_context'

export interface SupplierLedgerEntryLike {
  supplierName: string
  purchasesTotal: number
  paymentsTotal: number
  purchaseReturnsTotal?: number
  closingPayable: number
  overpaymentCredit?: number
  reconciliationStatus?: string
  aging?: {
    days0To30?: number
    days31To60?: number
    days61To90?: number
    days90Plus?: number
  }
}

export interface SupplierLedgerPdfOptions {
  business: Business
  suppliers: SupplierLedgerEntryLike[]
  yearLabel?: string
  dateFrom?: string
  dateTo?: string
}

export { sanitizeFilename }

export function generateSupplierLedgerPdf(options: SupplierLedgerPdfOptions): jsPDF {
  const { business, suppliers, yearLabel, dateFrom, dateTo } = options
  const meta = buildReportMeta(business, { yearLabel, periodFrom: dateFrom, periodTo: dateTo })

  const doc = createPdf({ orientation: 'landscape' }) as jsPDF

  let y = drawReportHeader(doc, {
    businessName: meta.businessName,
    reportTitle: 'SUPPLIER PAYABLES LEDGER & AGING',
    contactLine: meta.contactLine,
  })

  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Financial Year', value: yearLabel ?? '—' },
      { label: 'Report Period', value: `${dateFrom ? dateFrom : 'All History'} → ${dateTo ? dateTo : 'Present'}` },
      { label: 'Suppliers', value: formatNumber(suppliers.length) },
      { label: 'Suppliers with balance', value: formatNumber(suppliers.filter((s) => (s.closingPayable || 0) > 0).length) },
    ],
  })

  const pageHook = buildPageFooterHook(doc, {
    footerText: `Inventory Lite SaaS  |  ${business.name || 'Shop'}  |  Supplier Ledger`,
  })

  const body = suppliers.map((s) => {
    const payable = s.closingPayable || 0
    const aging = s.aging ?? {}
    return [
      safeText(s.supplierName),
      formatNpr(s.purchasesTotal || 0),
      formatNpr(s.paymentsTotal || 0),
      formatNpr(s.purchaseReturnsTotal ?? 0),
      formatNpr(payable > 0 ? payable : 0),
      formatNpr(s.overpaymentCredit ?? 0),
      formatNumber(aging.days0To30 ?? 0),
      formatNumber(aging.days31To60 ?? 0),
      formatNumber(aging.days61To90 ?? 0),
      formatNumber(aging.days90Plus ?? 0),
      safeText(s.reconciliationStatus ?? 'BALANCED'),
    ]
  })

  drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Supplier', width: 44 },
      { head: 'Purchases', align: 'right' },
      { head: 'Paid', align: 'right' },
      { head: 'Returns', align: 'right' },
      { head: 'Net Payable', align: 'right' },
      { head: 'Overpaid', align: 'right' },
      { head: '0-30d', align: 'right' },
      { head: '31-60d', align: 'right' },
      { head: '61-90d', align: 'right' },
      { head: '90d+', align: 'right' },
      { head: 'Status', width: 26 },
    ],
    body,
    pageHook,
    fontScale: 'dense',
  })

  return finalizePdf(doc)
}
