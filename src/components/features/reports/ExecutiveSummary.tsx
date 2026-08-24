import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Activity, DollarSign, Users } from 'lucide-react'

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

import Link from 'next/link'

export function ExecutiveSummary({ metrics }: ExecutiveSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <Link href="/app/sales" className="block hover:opacity-80 transition-opacity">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue <span className="text-xs text-blue-500 font-normal">(View Sales)</span></CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {metrics.totalSalesCount} total sales
            </p>
          </CardContent>
        </Link>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {metrics.hasCostDataError ? (
            <div className="text-sm text-red-500 font-medium">
              Status: Unavailable. Reason: Cost data required.
            </div>
          ) : (
            <>
              <div className={`text-2xl font-bold ${metrics.netProfit < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {formatCurrency(metrics.netProfit)}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.netMarginPercent.toFixed(1)}% Net Margin
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <Link href="/app/expenses" className="block hover:opacity-80 transition-opacity">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses <span className="text-xs text-blue-500 font-normal">(View Expenses)</span></CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.hasCostDataError ? 'Gross Profit: N/A' : `Gross Profit: ${formatCurrency(metrics.grossProfit)}`}
            </p>
          </CardContent>
        </Link>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Business Records</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Link href="/app/customers" className="block hover:opacity-80 transition-opacity">
            <div className="text-2xl font-bold">
              <span className="text-blue-500">{metrics.totalCustomers}</span>
              <span className="text-sm text-muted-foreground font-normal ml-1">Customers</span>
            </div>
          </Link>
          <Link href="/app/products" className="block hover:opacity-80 transition-opacity mt-2">
            <div className="text-2xl font-bold">
              <span className="text-orange-500">{metrics.totalProducts}</span>
              <span className="text-sm text-muted-foreground font-normal ml-1">Products</span>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
