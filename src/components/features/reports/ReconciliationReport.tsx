"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { PaymentMethodPoint } from '@/services/analytics.service'

export interface ReconciliationReportProps {
  salesTotal: number
  collectedTotal: number
  outstandingTotal: number
  paymentMethods: PaymentMethodPoint[]
}

export function ReconciliationReport({
  salesTotal,
  collectedTotal,
  outstandingTotal,
  paymentMethods
}: ReconciliationReportProps) {
  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Reconciliation Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 border-b pb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sales (Billed)</p>
              <p className="text-2xl font-bold">{formatCurrency(salesTotal)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(collectedTotal)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outstanding (Uncollected)</p>
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
