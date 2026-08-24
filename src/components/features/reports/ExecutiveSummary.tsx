"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Activity, DollarSign, Users } from 'lucide-react'
import Link from 'next/link'
import { WhatDoesThisMean } from './WhatDoesThisMean'

export interface ExecutiveSummaryProps {
  metrics: {
    totalRevenue: number
    grossProfit: number
    netProfit: number
    totalExpenses: number
    totalSalesCount: number
    netMarginPercent: number
    totalCustomers: number
    totalProducts: number
    hasCostDataError?: boolean
  }
}

export function ExecutiveSummary({ metrics }: ExecutiveSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border border-slate-200 shadow-xs rounded-xl hover:border-slate-300 transition-all">
        <Link href="/app/sales" className="block hover:opacity-80 transition-opacity">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Revenue <span className="text-[11px] text-indigo-600 font-semibold">(View Sales)</span>
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-slate-500 mt-1">
              From {metrics.totalSalesCount} total sales transactions
            </p>
          </CardContent>
        </Link>
      </Card>

      <Card className="border border-slate-200 shadow-xs rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center">
            Estimated Net Profit <WhatDoesThisMean termKey="Estimated Profit" />
          </CardTitle>
          <Activity className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          {metrics.hasCostDataError ? (
            <div className="text-xs text-amber-700 font-bold bg-amber-50 p-2 rounded border border-amber-200">
              Unavailable — Product cost data required for COGS calculation.
            </div>
          ) : (
            <>
              <div
                className={`text-2xl font-extrabold ${
                  metrics.netProfit < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(metrics.netProfit)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {metrics.netMarginPercent.toFixed(1)}% Estimated Net Margin
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-xs rounded-xl hover:border-slate-300 transition-all">
        <Link href="/app/expenses" className="block hover:opacity-80 transition-opacity">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Expenses <span className="text-[11px] text-indigo-600 font-semibold">(View Expenses)</span>
            </CardTitle>
            <DollarSign className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(metrics.totalExpenses)}</div>
            <p className="text-xs text-slate-500 mt-1">
              {metrics.hasCostDataError ? 'Gross Profit: N/A' : `Gross Profit: ${formatCurrency(metrics.grossProfit)}`}
            </p>
          </CardContent>
        </Link>
      </Card>

      <Card className="border border-slate-200 shadow-xs rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Business Records</CardTitle>
          <Users className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/app/customers" className="block hover:opacity-80 transition-opacity">
            <div className="text-lg font-bold text-slate-900 flex items-center justify-between">
              <span>{metrics.totalCustomers}</span>
              <span className="text-xs text-indigo-600 font-semibold">Customers &rarr;</span>
            </div>
          </Link>
          <Link href="/app/products" className="block hover:opacity-80 transition-opacity border-t border-slate-100 pt-1.5">
            <div className="text-lg font-bold text-slate-900 flex items-center justify-between">
              <span>{metrics.totalProducts}</span>
              <span className="text-xs text-amber-600 font-semibold">Products &rarr;</span>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
