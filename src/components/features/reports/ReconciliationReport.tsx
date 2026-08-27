"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { PaymentMethodPoint } from '@/services/analytics.service'
import { Sale } from '@/types'
import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { WhatDoesThisMean } from './WhatDoesThisMean'

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
  sales = [],
}: ReconciliationReportProps) {
  const grossTotal = sales.reduce((sum, s) => sum + (s.subtotal || 0), 0)
  const discountTotal = sales.reduce((sum, s) => sum + (s.discount || 0), 0)
    const vatTotal = sales.reduce((sum, s) => sum + (s.vatAmount || 0), 0)

  return (
    <Card className="col-span-1 md:col-span-2 border border-slate-200 shadow-xs rounded-xl">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <Link href="/app/sales" className="group inline-flex items-center hover:opacity-80 transition-opacity">
            <CardTitle className="text-base font-extrabold text-slate-900">Sales & Payment Reconciliation</CardTitle>
            <ExternalLink className="ml-2 w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <WhatDoesThisMean termKey="Payment Reconciliation" />
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-5 text-xs sm:text-sm">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="font-bold text-slate-500 flex items-center">
                Gross Sales <WhatDoesThisMean termKey="Gross Sales" />
              </p>
              <p className="text-lg font-extrabold text-slate-900 mt-1">{formatCurrency(grossTotal)}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500">Total Discounts</p>
              <p className="text-lg font-extrabold text-rose-600 mt-1">-{formatCurrency(discountTotal)}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500 flex items-center">
                Total VAT Recorded <WhatDoesThisMean termKey="VAT" />
              </p>
              <p className="text-lg font-extrabold text-indigo-700 mt-1">{formatCurrency(vatTotal)}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500 flex items-center">
                Net Billed Sales <WhatDoesThisMean termKey="Net Sales" />
              </p>
              <p className="text-lg font-extrabold text-emerald-600 mt-1">{formatCurrency(salesTotal)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
            <div>
              <p className="font-bold text-slate-500">Total Collections Recorded</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatCurrency(collectedTotal)}</p>
            </div>
            <div>
              <p className="font-bold text-slate-500">Outstanding (Uncollected Customer Dues)</p>
              <p className="text-2xl font-extrabold text-rose-600 mt-1">{formatCurrency(outstandingTotal)}</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2.5">Collection Breakdown by Payment Method</h4>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div key={method.method} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <span className="font-medium text-slate-700 capitalize">
                    {method.name} ({method.count} transaction{method.count > 1 ? 's' : ''})
                  </span>
                  <span className="font-bold text-slate-900">{formatCurrency(method.total)}</span>
                </div>
              ))}
              {paymentMethods.length === 0 && (
                <p className="text-slate-500 text-center py-3 bg-slate-50 rounded-lg">No payment collections recorded.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
