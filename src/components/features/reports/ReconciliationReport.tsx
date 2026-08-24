"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { PaymentMethodPoint } from '@/services/analytics.service'
import { Sale } from '@/types'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

export interface ReconciliationReportProps {
  salesTotal: number
  collectedTotal: number
  outstandingTotal: number
  paymentMethods: PaymentMethodPoint[]
  sales?: Sale[]
}

export function ReconciliationReport({
  salesTotal,
  collectedTotal,
  outstandingTotal,
  paymentMethods,
  sales = []
}: ReconciliationReportProps) {
  const grossTotal = sales.reduce((sum, s) => sum + (s.subtotal || 0), 0)
  const discountTotal = sales.reduce((sum, s) => sum + (s.discount || 0), 0)
  const vatTotal = sales.reduce((sum, s) => sum + (s.tax || 0), 0)

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <Link href="/app/sales" className="group inline-flex items-center hover:opacity-80 transition-opacity">
          <CardTitle>Sales & Reconciliation Report</CardTitle>
          <ExternalLink className="ml-2 w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-b pb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Gross Sales</p>
              <p className="text-lg font-bold">{formatCurrency(grossTotal)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Discounts</p>
              <p className="text-lg font-bold text-red-500">-{formatCurrency(discountTotal)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground group inline-flex items-center hover:opacity-80 transition-opacity">
                <Link href="/app/sales">Total VAT</Link>
                <ExternalLink className="ml-1 w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-lg font-bold">{formatCurrency(vatTotal)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Net Sales (Billed)</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(salesTotal)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b pb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground group inline-flex items-center hover:opacity-80 transition-opacity">
                <Link href="/app/sales">Total Collected</Link>
                <ExternalLink className="ml-1 w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(collectedTotal)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground group inline-flex items-center hover:opacity-80 transition-opacity">
                <Link href="/app/sales?status=pending">Outstanding (Uncollected)</Link>
                <ExternalLink className="ml-1 w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(outstandingTotal)}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Collection Breakdown by Method</h4>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div key={method.method} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                  <span className="text-sm">{method.name} ({method.count} txn)</span>
                  <span className="font-medium">{formatCurrency(method.total)}</span>
                </div>
              ))}
              {paymentMethods.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No collections recorded.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
