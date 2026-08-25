"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Invoice, Sale } from '@/types'
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { WhatDoesThisMean } from './WhatDoesThisMean'

export interface AuditHealthProps {
  sales: Sale[]
  invoices: Invoice[]
}

interface AuditCheck {
  id: string
  name: string
  termKey?: string
  status: 'OK' | 'REVIEW' | 'PROBLEM'
  message: string
}

export function AuditHealth({ sales, invoices }: AuditHealthProps) {
  const checks: AuditCheck[] = []

  // Helper to extract numeric sequence
  const getSequenceNumbers = (strings: string[]) => {
    return strings
      .filter(Boolean)
      .map((num) => {
        const parts = num.split('-')
        const lastPart = parts[parts.length - 1]
        return parseInt(lastPart, 10)
      })
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b)
  }

  // 1. Invoice Sequence
  const invoiceNumbers = getSequenceNumbers(invoices.map((i) => i.invoiceNumber))
  let invoiceGaps = 0
  for (let i = 1; i < invoiceNumbers.length; i++) {
    if (invoiceNumbers[i] - invoiceNumbers[i - 1] > 1) invoiceGaps++
  }
  checks.push({
    id: 'invoice-seq',
    name: 'Invoice Sequence',
    termKey: 'Invoice Sequence',
    status: invoiceGaps === 0 ? 'OK' : 'REVIEW',
    message: invoiceGaps === 0 ? 'Consistent' : `${invoiceGaps} sequence gap(s) to review`,
  })

  // 2. Sale Sequence
  const saleNumbers = getSequenceNumbers(sales.map((s) => s.saleNumber || ''))
  let saleGaps = 0
  for (let i = 1; i < saleNumbers.length; i++) {
    if (saleNumbers[i] - saleNumbers[i - 1] > 1) saleGaps++
  }
  checks.push({
    id: 'sale-seq',
    name: 'Sale Sequence',
    status: saleGaps === 0 ? 'OK' : 'REVIEW',
    message: saleGaps === 0 ? 'Consistent' : `${saleGaps} sequence gap(s) to review`,
  })

  // 3. Sales Reconciliation
  const mathMismatches = sales.filter((s) => {
    if (s.status === 'cancelled') return false
    const expected = (s.subtotal || 0) - (s.discount || 0) + (s.tax || 0)
    return Math.abs(expected - (s.total || 0)) > 0.05
  })
  checks.push({
    id: 'sales-recon',
    name: 'Sales Reconciliation',
    status: mathMismatches.length === 0 ? 'OK' : 'PROBLEM',
    message: mathMismatches.length === 0 ? 'Consistent' : `${mathMismatches.length} bill math mismatch(es)`,
  })

  // 4. Payment Reconciliation
  const paymentMismatches = sales.filter((s) => {
    if (s.status === 'cancelled') return false
    const total = s.total || 0
    const paid = s.paidAmount || 0
    const due = s.dueAmount || 0
    const expectedPaid = Math.max(0, total - due)
    return Math.abs(paid - expectedPaid) > 0.50
  })
  checks.push({
    id: 'payment-recon',
    name: 'Payment Reconciliation',
    termKey: 'Payment Reconciliation',
    status: paymentMismatches.length === 0 ? 'OK' : 'REVIEW',
    message: paymentMismatches.length === 0 ? 'Consistent' : `${paymentMismatches.length} payment variance(s) for review`,
  })

  // 5. Cancelled Invoices
  const cancelledSales = sales.filter((s) => s.status === 'cancelled')
  checks.push({
    id: 'cancelled',
    name: 'Cancelled Invoices',
    status: cancelledSales.length === 0 ? 'OK' : 'REVIEW',
    message: cancelledSales.length === 0 ? '0 cancelled' : `${cancelledSales.length} cancelled bill(s) to review`,
  })

  // 6. Duplicate Invoices
  const invCounts: Record<string, number> = {}
  let duplicates = 0
  invoices.forEach((i) => {
    if (i.invoiceNumber) {
      const num = i.invoiceNumber.trim()
      invCounts[num] = (invCounts[num] || 0) + 1
      if (invCounts[num] === 2) duplicates++
    }
  })
  checks.push({
    id: 'duplicate-inv',
    name: 'Duplicate Invoices',
    termKey: 'Duplicate Invoice',
    status: duplicates === 0 ? 'OK' : 'PROBLEM',
    message: duplicates === 0 ? '0 duplicates' : `${duplicates} duplicate number(s) found`,
  })

  // 7. Data Completeness
  const completedWithoutInvoice = sales.filter((s) => s.status === 'completed' && !s.invoiceId)
  checks.push({
    id: 'data-complete',
    name: 'Data Completeness',
    termKey: 'Data Completeness',
    status: completedWithoutInvoice.length === 0 ? 'OK' : 'REVIEW',
    message: completedWithoutInvoice.length === 0 ? 'Complete' : `${completedWithoutInvoice.length} sales lack invoice record`,
  })

  const getStatusIcon = (status: 'OK' | 'REVIEW' | 'PROBLEM') => {
    if (status === 'OK') return <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 shrink-0" />
    if (status === 'REVIEW') return <AlertTriangle className="w-5 h-5 text-amber-500 mr-3 shrink-0" />
    return <AlertCircle className="w-5 h-5 text-rose-500 mr-3 shrink-0" />
  }

  const hasProblems = checks.some((c) => c.status === 'PROBLEM')
  const hasReviews = checks.some((c) => c.status === 'REVIEW')

  return (
    <Card className="col-span-1 md:col-span-2 border border-slate-200 shadow-xs rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
        <CardTitle className="text-base font-extrabold text-slate-900">Audit Health & Data Checks</CardTitle>
        {hasProblems ? (
          <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md">
            Action Required
          </span>
        ) : hasReviews ? (
          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
            Needs Review
          </span>
        ) : (
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
            All Checks Passed
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.id} className="flex items-center justify-between border-b border-slate-100 pb-2.5 last:border-0 last:pb-0 text-xs sm:text-sm">
              <div className="flex items-center">
                {getStatusIcon(check.status)}
                <span className="font-bold text-slate-900">{check.name}</span>
                {check.termKey && <WhatDoesThisMean termKey={check.termKey} />}
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className={`font-semibold ${check.status === 'PROBLEM' ? 'text-rose-600' : check.status === 'REVIEW' ? 'text-amber-700' : 'text-emerald-600'}`}>
                  {check.message}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
