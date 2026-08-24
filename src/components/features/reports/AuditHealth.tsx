"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Invoice, Sale } from '@/types'
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

export interface AuditHealthProps {
  sales: Sale[]
  invoices: Invoice[]
}

interface AuditCheck {
  id: string
  name: string
  status: 'OK' | 'REVIEW' | 'PROBLEM'
  message: string
}

export function AuditHealth({ sales, invoices }: AuditHealthProps) {
  const checks: AuditCheck[] = []

  // Helper to extract numeric sequence
  const getSequenceNumbers = (strings: string[]) => {
    return strings
      .filter(Boolean)
      .map(num => {
        const parts = num.split('-')
        const lastPart = parts[parts.length - 1]
        return parseInt(lastPart, 10)
      })
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b)
  }

  // 1. Invoice Sequence
  const invoiceNumbers = getSequenceNumbers(invoices.map(i => i.invoiceNumber))
  let invoiceGaps = 0
  for (let i = 1; i < invoiceNumbers.length; i++) {
    if (invoiceNumbers[i] - invoiceNumbers[i - 1] > 1) invoiceGaps++
  }
  checks.push({
    id: 'invoice-seq',
    name: 'Invoice Sequence',
    status: invoiceGaps === 0 ? 'OK' : 'PROBLEM',
    message: invoiceGaps === 0 ? 'OK' : `${invoiceGaps} sequence gaps detected`,
  })

  // 2. Sale Sequence
  const saleNumbers = getSequenceNumbers(sales.map(s => s.saleNumber || ''))
  let saleGaps = 0
  for (let i = 1; i < saleNumbers.length; i++) {
    if (saleNumbers[i] - saleNumbers[i - 1] > 1) saleGaps++
  }
  checks.push({
    id: 'sale-seq',
    name: 'Sale Sequence',
    status: saleGaps === 0 ? 'OK' : 'PROBLEM',
    message: saleGaps === 0 ? 'OK' : `${saleGaps} sequence gaps detected`,
  })

  // 3. Sales Reconciliation
  const mathMismatches = sales.filter(s => {
    const expected = (s.subtotal || 0) - (s.discount || 0) + (s.tax || 0)
    return Math.abs(expected - (s.total || 0)) > 0.05
  })
  checks.push({
    id: 'sales-recon',
    name: 'Sales Reconciliation',
    status: mathMismatches.length === 0 ? 'OK' : 'PROBLEM',
    message: mathMismatches.length === 0 ? 'OK' : `${mathMismatches.length} total mismatches`,
  })

  // 4. Payment Reconciliation
  const paymentMismatches = sales.filter(s => {
    // A sale's total should be equal to the amount paid (minus any change returned) plus the amount still due.
    const expected = (s.paidAmount || 0) - (s.changeAmount || 0) + (s.dueAmount || 0)
    return Math.abs(expected - (s.total || 0)) > 0.05
  })
  checks.push({
    id: 'payment-recon',
    name: 'Payment Reconciliation',
    status: paymentMismatches.length === 0 ? 'OK' : 'PROBLEM',
    message: paymentMismatches.length === 0 ? 'OK' : `${paymentMismatches.length} paid/due mismatches`,
  })

  // 5. Cancelled Invoices
  const cancelledSales = sales.filter(s => s.status === 'cancelled')
  checks.push({
    id: 'cancelled',
    name: 'Cancelled Invoices',
    status: cancelledSales.length === 0 ? 'OK' : 'REVIEW',
    message: cancelledSales.length === 0 ? '0' : `${cancelledSales.length} to review`,
  })

  // 6. Duplicate Invoices
  const invCounts: Record<string, number> = {}
  let duplicates = 0
  invoices.forEach(i => {
    if (i.invoiceNumber) {
      invCounts[i.invoiceNumber] = (invCounts[i.invoiceNumber] || 0) + 1
      if (invCounts[i.invoiceNumber] === 2) duplicates++
    }
  })
  checks.push({
    id: 'duplicate-inv',
    name: 'Duplicate Invoices',
    status: duplicates === 0 ? 'OK' : 'PROBLEM',
    message: duplicates === 0 ? '0' : `${duplicates} duplicates found`,
  })

  // 7. Data Completeness
  const completedWithoutInvoice = sales.filter(s => s.status === 'completed' && !s.invoiceId)
  checks.push({
    id: 'data-complete',
    name: 'Data Completeness',
    status: completedWithoutInvoice.length === 0 ? 'OK' : 'REVIEW',
    message: completedWithoutInvoice.length === 0 ? 'OK' : `${completedWithoutInvoice.length} completed sales lack invoices`,
  })

  const getStatusIcon = (status: 'OK' | 'REVIEW' | 'PROBLEM') => {
    if (status === 'OK') return <CheckCircle2 className="w-5 h-5 text-green-500 mr-3 shrink-0" />
    if (status === 'REVIEW') return <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 shrink-0" />
    return <AlertCircle className="w-5 h-5 text-red-500 mr-3 shrink-0" />
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Audit Health</CardTitle>
        {checks.some(c => c.status !== 'OK') ? (
          <span className="text-sm font-medium text-red-500 bg-red-50 px-2 py-1 rounded">Attention Required</span>
        ) : (
          <span className="text-sm font-medium text-green-500 bg-green-50 px-2 py-1 rounded">All Checks Passed</span>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
              <div className="flex items-center">
                {getStatusIcon(check.status)}
                <span className="font-medium text-sm">{check.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px] sm:max-w-none text-right">
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
