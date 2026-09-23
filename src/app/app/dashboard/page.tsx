"use client"

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import {
  analyticsService,
  DashboardMetrics,
  SalesChartPoint,
  TopProductPoint,
  PaymentMethodPoint,
} from '@/services/analytics.service'
import { saleService } from '@/services/sale.service'
import { productService } from '@/services/product.service'
import { Sale, Product } from '@/types'
import { formatBSDate } from '@/lib/date/bs-date'
import { formatCurrency, formatPaymentMethodLabel } from '@/lib/utils'
import {
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  XCircle,
  Clock,
  Info,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'

// Code-split Recharts chart components dynamically to reduce initial JS bootup & TBT
const SalesTrendChart = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((mod) => mod.SalesTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full bg-slate-50 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">
        Loading Sales Chart...
      </div>
    ),
  }
)

const PaymentMethodsChart = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((mod) => mod.PaymentMethodsChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full bg-slate-50 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">
        Loading Payment Chart...
      </div>
    ),
  }
)

const TopProductsChart = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((mod) => mod.TopProductsChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full bg-slate-50 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">
        Loading Top Products...
      </div>
    ),
  }
)

export default function DashboardPage() {
  const { activeBusiness, userProfile } = useAuth()

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [salesTrend, setSalesTrend] = useState<SalesChartPoint[]>([])
  const [topProducts, setTopProducts] = useState<TopProductPoint[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodPoint[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [lowStockList, setLowStockList] = useState<Product[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isError, setIsError] = useState<boolean>(false)

  const fetchDashboardData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    const bId = activeBusiness.$id

    setIsLoading(true)
    setIsError(false)

    try {
      // Stage 1: Critical KPIs & Recent Activity
      const [m, recentSalesList, prodsList] = await Promise.all([
        analyticsService.getDashboardMetrics(bId),
        saleService.listSales(bId, { limit: 5 }),
        productService.listProducts(bId, { limit: 50 }),
      ])

      setMetrics(m)
      setRecentSales(recentSalesList)

      const alerts = prodsList.filter(
        (p) => (p.stockQuantity || 0) <= (p.lowStockThreshold ?? 5)
      )
      setLowStockList(alerts.slice(0, 5))
      setIsLoading(false)
    } catch (err) {
      console.error('Failed to load critical dashboard metrics:', err)
      setIsError(true)
      setIsLoading(false)
      return
    }

    // Stage 2: Secondary Analytics & Charts
    try {
      const [trend, topProds, payMethods] = await Promise.all([
        analyticsService.getSalesChartData(bId, 7),
        analyticsService.getTopSellingProducts(bId, 5),
        analyticsService.getSalesByPaymentMethod(bId),
      ])

      setSalesTrend(trend)
      setTopProducts(topProds)
      setPaymentMethods(payMethods)
    } catch (err) {
      console.error('Failed to load secondary dashboard charts:', err)
    }
  }, [activeBusiness?.$id])

  // Clear state on business change to avoid cross-tenant flashing
  useEffect(() => {
    setMetrics(null)
    setSalesTrend([])
    setTopProducts([])
    setPaymentMethods([])
    setRecentSales([])
    setLowStockList([])
    fetchDashboardData()
  }, [fetchDashboardData])

  const currency = activeBusiness?.currency || 'NPR'
  const firstName = userProfile?.name?.split(' ')[0] || 'Store Owner'
  const businessName = activeBusiness?.name || 'your business'

  // Loading State Skeletons
  if (isLoading && !metrics) {
    return (
      <div className="space-y-6 text-slate-900 animate-pulse">
        <div className="h-16 bg-slate-100 rounded-xl w-1/2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    )
  }

  // Error State Card
  if (isError && !metrics) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 border border-slate-200 rounded-2xl bg-white shadow-xs space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Unable to load dashboard data</h2>
        <p className="text-xs text-slate-500">
          We encountered a connection issue while attempting to retrieve metrics for {businessName}.
        </p>
        <Button onClick={fetchDashboardData} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs">
          <RefreshCw className="mr-2 h-4 w-4" /> Retry Loading
        </Button>
      </div>
    )
  }

  const todaySalesVal = metrics?.todaySales || 0
  const todayExpensesVal = metrics?.todayExpenses || 0
  const customerCount = metrics?.totalCustomers || 0

  return (
    <div className="space-y-6 text-slate-900">
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-indigo-600 mb-1">
            Dashboard Overview
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Here&apos;s what&apos;s happening with <span className="font-semibold text-slate-900">{businessName}</span> today.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            asChild
            className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs"
          >
            <Link href="/app/sales/new">
              <Plus className="mr-2 h-4 w-4" /> Open POS Terminal
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's Sales */}
        <Card className="p-5 border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500">
              Today&apos;s Sales
            </span>
            <ShoppingCart className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
            {formatCurrency(todaySalesVal, currency)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            {todaySalesVal > 0 ? 'Revenue generated today' : 'No sales recorded today'}
          </p>
        </Card>

        {/* This Month's Sales */}
        <Card className="p-5 border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500">
              This Month&apos;s Sales
            </span>
            <TrendingUp className="h-4 w-4 text-indigo-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {formatCurrency(metrics?.thisMonthSales || 0, currency)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Current calendar month total</p>
        </Card>

        {/* Cataloged Products Summary */}
        <Card className="p-5 border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500">
              Cataloged Products
            </span>
            <Package className="h-4 w-4 text-indigo-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {metrics?.totalProducts || 0}
          </div>
          <div className="flex items-center gap-2 text-xs mt-1.5 font-medium">
            <Link href="/app/stock" className="text-amber-600 hover:underline">
              Low Stock: {metrics?.lowStockProducts || 0}
            </Link>
            <span className="text-slate-400">•</span>
            <Link href="/app/stock" className="text-rose-600 hover:underline">
              Out of Stock: {metrics?.outOfStockProducts || 0}
            </Link>
          </div>
        </Card>

        {/* Today's Expenses */}
        <Card className="p-5 border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500">
              Today&apos;s Expenses
            </span>
            <CreditCard className="h-4 w-4 text-rose-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 font-mono tracking-tight">
            {formatCurrency(todayExpensesVal, currency)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {todayExpensesVal > 0 ? 'Logged operational costs today' : 'No expenses recorded today'}
          </p>
        </Card>

        {/* Monthly Expenses */}
        <Card className="p-5 border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500">
              Monthly Expenses
            </span>
            <CreditCard className="h-4 w-4 text-slate-500 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {formatCurrency(metrics?.thisMonthExpenses || 0, currency)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Current month total expenses</p>
        </Card>

        {/* Outstanding Dues */}
        <Card className="p-5 border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500">
              Outstanding Dues (Udhar)
            </span>
            <Users className="h-4 w-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono tracking-tight">
            {formatCurrency(metrics?.totalDue || 0, currency)}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-slate-500">
              From {customerCount} {customerCount === 1 ? 'registered customer' : 'registered customers'}
            </p>
            <Link href="/app/credit" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center">
              View Receivables <ArrowUpRight className="ml-0.5 h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* 3. Financial Notice Banner */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 mr-1.5">Notice:</span>
            Dashboard profit is an estimate based on sales, COGS, and expenses. For detailed financial records, open Audit & Compliance.
          </div>
        </div>
        <Link href="/app/audit" className="shrink-0">
          <Button size="sm" variant="outline" className="h-8 border-slate-300 bg-white text-xs text-slate-900 hover:bg-slate-50 whitespace-nowrap font-semibold">
            Open Audit & Compliance →
          </Button>
        </Link>
      </div>

      {/* 4. Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <Card className="lg:col-span-2 border-slate-200 bg-white p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900">Sales Revenue Trend</h2>
            <p className="text-xs text-slate-500">Daily sales breakdown • Last 7 Days</p>
          </div>
          <SalesTrendChart data={salesTrend} currency={currency} />
        </Card>

        {/* Payment Methods Share */}
        <Card className="border-slate-200 bg-white p-6 shadow-xs">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900">Payment Method Share</h2>
            <p className="text-xs text-slate-500">Sales volume by payment channel</p>
          </div>
          <PaymentMethodsChart data={paymentMethods} currency={currency} />
        </Card>
      </div>

      {/* 5. Top Products & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="lg:col-span-2 border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Top-Selling Products</h2>
              <p className="text-xs text-slate-500">Highest revenue catalog items</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              <Link href="/app/products">
                Catalog <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <TopProductsChart data={topProducts} currency={currency} />
        </Card>

        {/* Stock Alerts */}
        <Card className="border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Low Stock Alerts
            </h2>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              <Link href="/app/stock">View Inventory</Link>
            </Button>
          </div>

          <div className="space-y-2.5">
            {lowStockList.length > 0 ? (
              lowStockList.map((prod) => (
                <Link
                  key={prod.$id}
                  href="/app/stock"
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-colors block"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                    <p className="text-xs text-slate-500 font-mono">SKU: {prod.sku}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {prod.stockQuantity === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <XCircle className="h-3 w-3" /> OUT OF STOCK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="h-3 w-3" /> LOW STOCK ({prod.stockQuantity} left)
                      </span>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-10 text-slate-600 text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <p className="font-semibold text-slate-800">✓ All stock levels are within healthy thresholds.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 6. Recent Sales Activity */}
      <Card className="border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" /> Recent Sales Activity
            </h2>
            <p className="text-xs text-slate-500">Latest orders recorded at the POS counter</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            <Link href="/app/sales">
              View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {recentSales.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-2.5 px-3">Sale #</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3">Paid Amount</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((sale) => (
                    <tr key={sale.$id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-indigo-600">
                        {sale.saleNumber ? sale.saleNumber.replace(/^SALE-/, 'Sale-') : sale.$id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                        {formatCurrency(sale.total, currency)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {formatCurrency(sale.paidAmount, currency)}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 font-medium">
                        {formatPaymentMethodLabel(sale.paymentMethod)}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-slate-500 font-medium">
                        {formatBSDate(sale.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {recentSales.map((sale) => (
                <div key={sale.$id} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-600">
                      {sale.saleNumber ? sale.saleNumber.replace(/^SALE-/, 'Sale-') : sale.$id.slice(0, 8)}
                    </span>
                    <StatusBadge status={sale.status} />
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                    <div>
                      <div className="font-mono font-extrabold text-emerald-600">
                        {formatCurrency(sale.total, currency)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Paid: {formatCurrency(sale.paidAmount, currency)} • {formatPaymentMethodLabel(sale.paymentMethod)}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {formatBSDate(sale.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs space-y-3">
            <p>No sales have been recorded yet.</p>
            <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs">
              <Link href="/app/sales/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Open POS Terminal
              </Link>
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
