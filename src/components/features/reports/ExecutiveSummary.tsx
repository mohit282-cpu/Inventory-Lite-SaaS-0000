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
  }
}

export function ExecutiveSummary({ metrics }: ExecutiveSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            From {metrics.totalSalesCount} total sales
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.netProfit < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {formatCurrency(metrics.netProfit)}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.netMarginPercent.toFixed(1)}% Net Margin
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.totalExpenses)}</div>
          <p className="text-xs text-muted-foreground">
            Gross Profit: {formatCurrency(metrics.grossProfit)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Database</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className="text-blue-500">{metrics.totalCustomers}</span>
            <span className="text-sm text-muted-foreground font-normal ml-1">Customers</span>
          </div>
          <div className="text-2xl font-bold mt-2">
            <span className="text-orange-500">{metrics.totalProducts}</span>
            <span className="text-sm text-muted-foreground font-normal ml-1">Products</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
