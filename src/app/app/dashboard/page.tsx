"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/context/auth-context'
import { Card } from '@/components/ui/card'
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
  Info,
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
          <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm">
            <Link href="/app/sales/new">
              <Plus className="mr-2 h-4 w-4" /> Open POS Terminal
            </Link>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Sales */}
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today&apos;s Sales
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <ShoppingCart className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono tracking-tight">
            {currency} {(metrics?.todaySales || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-400 shrink-0" /> Revenue generated today
          </p>
        </Card>

        {/* 2. This Month's Sales */}
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              This Month&apos;s Sales
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
            {currency} {(metrics?.thisMonthSales || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Current calendar month total</p>
        </Card>

        {/* 3. Products Summary */}
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Products
            </span>
            <div className="h-7 w-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Package className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
            {metrics?.totalProducts || 0}
          </div>
          <div className="flex items-center gap-2 text-[11px] mt-1">
            <span className="text-amber-400 font-medium">{metrics?.lowStockProducts || 0} Low</span>
            <span className="text-slate-600">•</span>
            <span className="text-red-400 font-medium">{metrics?.outOfStockProducts || 0} Out</span>
          </div>
        </Card>

        {/* 4. Today's Expenses */}
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today&apos;s Expenses
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-400 font-mono tracking-tight">
            {currency} {(metrics?.todayExpenses || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Logged operational costs today</p>
        </Card>
      </div>

      {/* Secondary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Monthly Expenses
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {currency} {(metrics?.thisMonthExpenses || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Current month expenses</p>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Outstanding Dues
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {currency} {(metrics?.totalDue || 0).toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{metrics?.totalCustomers || 0} registered customers</p>
        </Card>
      </div>

      {/* Notice Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white mr-1.5">Notice:</span>
            Inventory Lite provides operational profit estimates (Revenue − COGS − Expenses). For full financial tax reporting, export detailed reports.
          </div>
        </div>
        <Link href="/app/reports" className="shrink-0">
          <Button size="sm" variant="outline" className="h-8 border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 whitespace-nowrap">
            View Reports
          </Button>
        </Link>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Over Time Area Chart */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Sales Revenue Trend</h3>
              <p className="text-xs text-slate-400">Daily sales breakdown (Last 7 Days)</p>
            </div>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                  formatter={(val: number) => [`Rs. ${val.toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sales by Payment Method Pie Chart */}
        <Card className="border-slate-800 bg-slate-900/60 p-5">
          <div className="pb-4 border-b border-slate-800/60 mb-4">
            <h3 className="text-sm font-semibold text-white">Payment Method Share</h3>
            <p className="text-xs text-slate-400">Sales volume by payment channel</p>
          </div>
          <div className="h-60 w-full flex items-center justify-center">
            {paymentMethods.some((p) => p.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMethods} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={4}>
                    {paymentMethods.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(val: number) => [`Rs. ${val.toFixed(2)}`, 'Total']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500 text-xs py-8">
                <CreditCard className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
                No payment data recorded yet
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top Products & Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/60 mb-4">
            <h3 className="text-sm font-semibold text-white">Top-Selling Products</h3>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-indigo-400 hover:text-indigo-300">
              <Link href="/app/products">
                Catalog <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          {topProducts.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={110} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(val: number) => [`Rs. ${val.toFixed(2)}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-xs">
              <Package className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
              Sales will automatically populate your top performers here.
            </div>
          )}
        </Card>

        {/* Stock Alerts */}
        <Card className="border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Stock Alerts
            </h3>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-indigo-400 hover:text-indigo-300">
              <Link href="/app/stock">Ledger</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {lowStockList.length > 0 ? (
              lowStockList.map((prod) => (
                <div key={prod.$id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{prod.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    {prod.stockQuantity === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/30">
                        <XCircle className="h-3 w-3" /> Out
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                        <AlertTriangle className="h-3 w-3" /> {prod.stockQuantity} left
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
          </div>
        </Card>
      </div>

      {/* Recent Sales Orders Table */}
      <Card className="border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-indigo-400" /> Recent Sales Orders
          </h3>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs text-indigo-400 hover:text-indigo-300">
            <Link href="/app/sales">
              View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        {recentSales.length > 0 ? (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-2 px-3">Sale #</th>
                  <th className="py-2 px-3">Total</th>
                  <th className="py-2 px-3">Paid</th>
                  <th className="py-2 px-3">Payment</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {recentSales.map((sale) => (
                  <tr key={sale.$id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-indigo-400">
                      {sale.saleNumber || sale.$id.slice(0, 8)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400">
                      Rs. {sale.total.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      Rs. {sale.paidAmount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] text-slate-400">{sale.paymentMethod}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11px] text-slate-400">
                      {new Date(sale.createdAt || '').toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">
            <p>No recent sales orders recorded yet.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
