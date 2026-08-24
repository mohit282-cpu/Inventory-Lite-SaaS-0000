"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Invoice, Sale } from '@/types'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'

export interface AuditHealthProps {
  sales: Sale[]
  invoices: Invoice[]
}

interface AuditIssue {
  type: 'error' | 'warning' | 'info'
  message: string
  reference?: string
}

export function AuditHealth({ sales, invoices }: AuditHealthProps) {
  const issues: AuditIssue[] = []

  // 1. Missing Invoice Check
  const completedSalesWithoutInvoice = sales.filter(s => s.status === 'completed' && (!s.invoiceId || s.invoiceId === ''))
  if (completedSalesWithoutInvoice.length > 0) {
    issues.push({
      type: 'warning',
      message: `${completedSalesWithoutInvoice.length} completed sales have no associated invoice generated.`,
    })
  }

  // 2. Invoice Sequence Gap Check
  const invoiceNumbers = invoices
    .map(i => i.invoiceNumber)
    .filter(Boolean)
    .map(num => {
      // Assuming format INV-83/84-000001
      const parts = num!.split('-')
      if (parts.length === 3) {
        return parseInt(parts[2], 10)
      }
      return NaN
    })
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b)

  if (invoiceNumbers.length > 0) {
    let gaps = 0
    for (let i = 1; i < invoiceNumbers.length; i++) {
      if (invoiceNumbers[i] - invoiceNumbers[i - 1] > 1) {
        gaps++
      }
    }
    if (gaps > 0) {
      issues.push({
        type: 'error',
        message: `Detected ${gaps} potential gap(s) in invoice numbering sequence. This may trigger audit questions.`,
      })
    }
  }

  // 3. Discount Check
  const salesWithHighDiscount = sales.filter(s => (s.discountValue || 0) > 0 && (s.discountValue || 0) > (s.total || 0) * 0.5)
  if (salesWithHighDiscount.length > 0) {
    issues.push({
      type: 'info',
      message: `${salesWithHighDiscount.length} sales have unusually high discounts (>50%).`,
    })
  }

  // 4. Cancelled Sales
  const cancelledSales = sales.filter(s => s.status === 'cancelled')
  if (cancelledSales.length > 0) {
    issues.push({
      type: 'info',
      message: `${cancelledSales.length} cancelled sales recorded in this period.`,
    })
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Audit & Health Checks</CardTitle>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium">All Checks Passed</h3>
            <p className="text-muted-foreground">No anomalies or compliance issues detected in this financial period.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {issues.map((issue, i) => (
              <div 
                key={i} 
                className={`flex items-start p-4 rounded-lg border ${
                  issue.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                  issue.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                  'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                {issue.type === 'error' ? <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 shrink-0 text-red-600" /> :
                 issue.type === 'warning' ? <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 shrink-0 text-yellow-600" /> :
                 <Info className="h-5 w-5 mr-3 mt-0.5 shrink-0 text-blue-600" />}
                
                <div>
                  <p className="font-medium text-sm">{issue.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
