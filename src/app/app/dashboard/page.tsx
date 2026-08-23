"use client"

import React, { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/context/auth-context'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
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
} from 'lucide-react'

// Code-split Recharts chart components dynamically to reduce initial JS bootup & TBT
const SalesTrendChart = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((mod) => mod.SalesTrendChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full bg-slate-50 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">Loading Sales Chart...</div>,
  }
)

const PaymentMethodsChart = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((mod) => mod.PaymentMethodsChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full bg-slate-50 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">Loading Payment Chart...</div>,
  }
)

const TopProductsChart = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then((mod) => mod.TopProductsChart),
  {
    ssr: false,
    loading: () => <div className="h-56 w-full bg-slate-50 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400">Loading Top Products...</div>,
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

  const fetchDashboardData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    const bId = activeBusiness.$id

    // Stage 1: Critical KPIs & Recent Activity (Immediate Render)
    try {
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
    } catch (err) {
      console.error('Failed to load critical dashboard metrics:', err)
    }

    // Stage 2: Secondary Analytics & Charts (Progressive Background Load)
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

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const currency = activeBusiness?.currency || 'NPR'
  const firstName = userProfile?.name?.split(' ')[0] || 'Store Owner'

  return (
    <div className="space-y-6 text-slate-900">
      {/* 1. Refined Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
            Dashboard Overview
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Here&apos;s what&apos;s happening with {activeBusiness?.name || 'your business'} today.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            asChild
            className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm"
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
        <Card className="p-5 border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Today&apos;s Sales
            </span>
            <ShoppingCart className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono tracking-tight">
            {currency} {(metrics?.todaySales || 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Revenue generated today
          </p>
        </Card>

        {/* This Month's Sales */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              This Month&apos;s Sales
            </span>
            <TrendingUp className="h-4 w-4 text-indigo-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {currency} {(metrics?.thisMonthSales || 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Current calendar month total</p>
        </Card>

        {/* Cataloged Products Summary */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Cataloged Products
            </span>
            <Package className="h-4 w-4 text-blue-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {metrics?.totalProducts || 0}
          </div>
          <div className="flex items-center gap-2 text-xs mt-1.5 font-medium">
            <span className="text-amber-600">{metrics?.lowStockProducts || 0} Low Stock</span>
            <span className="text-slate-300">•</span>
            <span className="text-red-600">{metrics?.outOfStockProducts || 0} Out of Stock</span>
          </div>
        </Card>

        {/* Today's Expenses */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Today&apos;s Expenses
            </span>
            <CreditCard className="h-4 w-4 text-rose-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-700 font-mono tracking-tight">
            {currency} {(metrics?.todayExpenses || 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Logged operational costs today</p>
        </Card>

        {/* Monthly Expenses */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Monthly Expenses
            </span>
            <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {currency} {(metrics?.thisMonthExpenses || 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">Current month total expenses</p>
        </Card>

        {/* Outstanding Dues */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Outstanding Dues (Udharo)
            </span>
            <Users className="h-4 w-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono tracking-tight">
            {currency} {(metrics?.totalDue || 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">From {metrics?.totalCustomers || 0} registered customers</p>
        </Card>
      </div>

      {/* 3. Quiet Informational Notice Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 mr-1.5">Notice:</span>
            Inventory Lite provides operational profit estimates (Revenue − COGS − Expenses). For full financial reporting, export detailed reports.
          </div>
        </div>
        <Link href="/app/reports" className="shrink-0">
          <Button size="sm" variant="outline" className="h-8 border-slate-300 bg-white text-xs text-slate-800 hover:bg-slate-50 whitespace-nowrap font-semibold">
            View Reports
          </Button>
        </Link>
      </div>

      {/* 4. Analytics & Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <Card className="lg:col-span-2 border-slate-200 bg-white p-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-base font-bold text-slate-900">Sales Revenue Trend</h3>
            <p className="text-xs text-slate-500">Daily sales breakdown • Last 7 Days</p>
          </div>
          <SalesTrendChart data={salesTrend} />
        </Card>

        {/* Payment Methods Share */}
        <Card className="border-slate-200 bg-white p-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 mb-4">
            <h3 className="text-base font-bold text-slate-900">Payment Method Share</h3>
            <p className="text-xs text-slate-500">Sales volume by payment channel</p>
          </div>
          <PaymentMethodsChart data={paymentMethods} />
        </Card>
      </div>

      {/* 5. Top Products & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card className="lg:col-span-2 border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Top-Selling Products</h3>
              <p className="text-xs text-slate-500">Highest revenue catalog items</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              <Link href="/app/products">
                Catalog <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <TopProductsChart data={topProducts} />
        </Card>

        {/* Stock Alerts */}
        <Card className="border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Low Stock Alerts
            </h3>
            <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              <Link href="/app/stock">Ledger</Link>
            </Button>
          </div>

          <div className="space-y-2.5">
            {lowStockList.length > 0 ? (
              lowStockList.map((prod) => (
                <div key={prod.$id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">SKU: {prod.sku}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {prod.stockQuantity === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-200">
                        <XCircle className="h-3 w-3" /> Out of Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                        <AlertTriangle className="h-3 w-3" /> {prod.stockQuantity} Left
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                <p>All stock levels are within healthy thresholds.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 6. Recent Sales Orders Table */}
      <Card className="border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" /> Recent Sales Activity
            </h3>
            <p className="text-xs text-slate-500">Latest orders recorded at the POS counter</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            <Link href="/app/sales">
              View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {recentSales.length > 0 ? (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
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
                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                      {sale.saleNumber || sale.$id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                      Rs. {sale.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      Rs. {sale.paidAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-600">{sale.paymentMethod}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="py-3 px-3 text-right text-[11px] text-slate-500 font-medium">
                      {formatBSDate(sale.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-xs">
            <p>No recent sales orders recorded yet. Open POS Terminal to create your first sale.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
