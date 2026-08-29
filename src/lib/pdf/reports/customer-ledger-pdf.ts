/**
 * Customer Receivables Ledger & Aging PDF report.
 *
 * Uses authoritative entries from auditCenterService.getCustomerLedgers.
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

export interface CustomerLedgerEntryLike {
  customerName: string
  invoicesTotal: number
  paymentsTotal: number
  returnsTotal?: number
  closingBalance: number
  overpaymentCredit?: number
  outstandingAmount?: number
  reconciliationStatus?: string
  aging?: {
    days0To30?: number
    days31To60?: number
    days61To90?: number
    days90Plus?: number
  }
}

export interface CustomerLedgerPdfOptions {
  business: Business
  customers: CustomerLedgerEntryLike[]
  yearLabel?: string
  dateFrom?: string
  dateTo?: string
}

export { sanitizeFilename }

export function generateCustomerLedgerPdf(options: CustomerLedgerPdfOptions): jsPDF {
  const { business, customers, yearLabel, dateFrom, dateTo } = options
  const meta = buildReportMeta(business, { yearLabel, periodFrom: dateFrom, periodTo: dateTo })

  const doc = createPdf({ orientation: 'landscape' }) as jsPDF

  let y = drawReportHeader(doc, {
    businessName: meta.businessName,
    reportTitle: 'CUSTOMER RECEIVABLES LEDGER & AGING',
    contactLine: meta.contactLine,
  })

  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Financial Year', value: yearLabel ?? '—' },
      { label: 'Report Period', value: `${dateFrom ? dateFrom : 'All History'} → ${dateTo ? dateTo : 'Present'}` },
      { label: 'Customers', value: formatNumber(customers.length) },
      { label: 'Customers with balance', value: formatNumber(customers.filter((c) => (c.closingBalance || 0) > 0).length) },
    ],
  })

  const pageHook = buildPageFooterHook(doc, {
    footerText: `Inventory Lite SaaS  |  ${business.name || 'Shop'}  |  Customer Ledger`,
  })

  const body = customers.map((c) => {
    const due = c.closingBalance || 0
    const aging = c.aging ?? {}
    return [
      safeText(c.customerName),
      formatNpr(c.invoicesTotal || 0),
      formatNpr(c.paymentsTotal || 0),
      formatNpr(c.returnsTotal ?? 0),
      formatNpr(due > 0 ? due : 0),
      formatNpr(c.overpaymentCredit ?? 0),
      formatNumber(aging.days0To30 ?? 0),
      formatNumber(aging.days31To60 ?? 0),
      formatNumber(aging.days61To90 ?? 0),
      formatNumber(aging.days90Plus ?? 0),
      safeText(c.reconciliationStatus ?? 'BALANCED'),
    ]
  })

  drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Customer', width: 44 },
      { head: 'Invoices', align: 'right' },
      { head: 'Paid', align: 'right' },
      { head: 'Returns', align: 'right' },
      { head: 'Net Due', align: 'right' },
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
