"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingPage } from '@/components/ui/loading'
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
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

export default function DashboardPage() {
  const { activeBusiness, userProfile } = useAuth()

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [salesTrend, setSalesTrend] = useState<SalesChartPoint[]>([])
  const [topProducts, setTopProducts] = useState<TopProductPoint[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodPoint[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [lowStockList, setLowStockList] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setLoading(true)
      const bId = activeBusiness.$id

      const [m, trend, topProds, payMethods, allSales, allProds] = await Promise.all([
        analyticsService.getDashboardMetrics(bId),
        analyticsService.getSalesChartData(bId, 7),
        analyticsService.getTopSellingProducts(bId, 5),
        analyticsService.getSalesByPaymentMethod(bId),
        saleService.listSales(bId),
        productService.listProducts(bId),
      ])

      setMetrics(m)
      setSalesTrend(trend)
      setTopProducts(topProds)
      setPaymentMethods(payMethods)
      setRecentSales(allSales.slice(0, 5))

      const alerts = allProds.filter(
        (p) => (p.stockQuantity || 0) <= (p.lowStockThreshold ?? 5)
      )
      setLowStockList(alerts.slice(0, 5))
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.$id])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (loading) {
    return <LoadingPage message="Loading real-time business dashboard..." />
  }

  const currency = activeBusiness?.currency || 'NPR'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${userProfile?.name?.split(' ')[0] || 'Partner'}`}
        description={`Live business performance and analytics for ${activeBusiness?.name || 'your business'}.`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20">
              <Link href="/app/sales/new">
                <Plus className="mr-2 h-4 w-4" /> Open POS Terminal
              </Link>
            </Button>
          </div>
        }
      />

      {/* 7 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Sales */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today&apos;s Sales
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {currency} {(metrics?.todaySales || 0).toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" /> Revenue generated today
            </p>
          </CardContent>
        </Card>

        {/* 2. This Month's Sales */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              This Month&apos;s Sales
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">
              {currency} {(metrics?.thisMonthSales || 0).toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Current calendar month total</p>
          </CardContent>
        </Card>

        {/* 3. Products Summary */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Products
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">{metrics?.totalProducts || 0}</div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="text-amber-400 font-medium">{metrics?.lowStockProducts || 0} Low</span>
              <span className="text-slate-600">•</span>
              <span className="text-red-400 font-medium">{metrics?.outOfStockProducts || 0} Out</span>
            </div>
          </CardContent>
        </Card>

        {/* 4. Today's Expenses */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today&apos;s Expenses
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400 font-mono">
              {currency} {(metrics?.todayExpenses || 0).toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Logged operational costs today</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Row: Monthly Expenses & Customer Dues */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Monthly Expenses
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">
              {currency} {(metrics?.thisMonthExpenses || 0).toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Current month expenses</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Outstanding Dues
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400 font-mono">
              {currency} {(metrics?.totalDue || 0).toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-1">{metrics?.totalCustomers || 0} registered customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounting Disclaimer Banner */}
      <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-200">
        <div>
          <span className="font-bold text-indigo-300 uppercase tracking-wider block sm:inline mr-2">Operational Estimate Notice:</span>
          Inventory Lite provides simplified operational profit estimates (Sales Revenue − COGS − Expenses) for small businesses. It is an inventory and billing platform, not a full double-entry accounting software.
        </div>
        <Link href="/app/reports">
          <Button size="sm" variant="outline" className="border-indigo-700 bg-indigo-900/60 text-indigo-200 hover:bg-indigo-800 whitespace-nowrap">
            View Reports & P&L
          </Button>
        </Link>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Over Time Area Chart */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
          <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between border-b border-slate-800">
            <div>
              <CardTitle className="text-base font-bold text-white">Sales Revenue Trend (Last 7 Days)</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Daily sales volume breakdown</p>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                    formatter={(val: number) => [`Rs. ${val.toFixed(2)}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Payment Method Donut/Pie Chart */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
          <CardHeader className="px-0 pt-0 pb-4 border-b border-slate-800">
            <CardTitle className="text-base font-bold text-white">Payment Method Share</CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">Sales distribution by payment channel</p>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-6">
            <div className="h-64 w-full flex items-center justify-center">
              {paymentMethods.some((p) => p.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentMethods} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                      {paymentMethods.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                      formatter={(val: number) => [`Rs. ${val.toFixed(2)}`, 'Total']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-500 text-sm py-12">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No payment data recorded yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products Bar Chart */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
          <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between border-b border-slate-800">
            <CardTitle className="text-base font-bold text-white">Top-Selling Products</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs text-indigo-400 hover:text-indigo-300">
              <Link href="/app/products">
                Catalog <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-6">
            {topProducts.length > 0 ? (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={120} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                      formatter={(val: number) => [`Rs. ${val.toFixed(2)}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Completed sales will calculate your top-performing products.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock & Out of Stock Alerts */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 space-y-4">
          <CardHeader className="px-0 pt-0 pb-3 flex items-center justify-between border-b border-slate-800">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Inventory Alerts
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs text-indigo-400 hover:text-indigo-300">
              <Link href="/app/stock">Stock Ledger</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0 space-y-3">
            {lowStockList.length > 0 ? (
              lowStockList.map((prod) => (
                <div key={prod.$id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{prod.name}</p>
                    <p className="text-xs text-slate-400 font-mono">SKU: {prod.sku}</p>
                  </div>
                  <div className="text-right">
                    {prod.stockQuantity === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-950/50 px-2 py-0.5 rounded border border-red-800">
                        <XCircle className="h-3 w-3" /> Out of Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800">
                        <AlertTriangle className="h-3 w-3" /> {prod.stockQuantity} Left
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                <p>All stock levels are healthy.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales Orders Table */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
        <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between border-b border-slate-800">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" /> Recent Sales Orders
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs text-indigo-400 hover:text-indigo-300">
            <Link href="/app/sales">
              View All Sales <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-4">
          {recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Sale #</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3">Paid</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentSales.map((sale) => (
                    <tr key={sale.$id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-mono font-medium text-indigo-400">
                        {sale.saleNumber || sale.$id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        Rs. {sale.total.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        Rs. {sale.paidAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 uppercase text-xs text-slate-400">{sale.paymentMethod}</td>
                      <td className="py-3 px-3">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-slate-400">
                        {new Date(sale.createdAt || '').toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              <p>No recent sales orders recorded yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
