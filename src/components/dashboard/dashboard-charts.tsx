'use client'

import Link from 'next/link'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import { SalesChartPoint, TopProductPoint, PaymentMethodPoint } from '@/services/analytics.service'
import { CreditCard, Package, TrendingUp, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPaymentMethodLabel } from '@/lib/utils'

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

interface SalesTrendChartProps {
  data: SalesChartPoint[]
  currency?: string
}

export function SalesTrendChart({ data, currency = 'NPR' }: SalesTrendChartProps) {
  const meaningfulPoints = (data || []).filter((p) => p.revenue > 0)
  const totalRevenue = (data || []).reduce((acc, curr) => acc + (curr.revenue || 0), 0)

  // 0 meaningful data points
  if (meaningfulPoints.length === 0) {
    return (
      <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
          <TrendingUp className="h-4.5 w-4.5" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">No sales yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Your sales activity will appear here after your first transaction.
        </p>
      </div>
    )
  }

  // 1 meaningful data point
  if (meaningfulPoints.length === 1) {
    const single = meaningfulPoints[0]
    return (
      <div className="py-6 px-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Sales Period ({single.date})</span>
            <div className="text-2xl font-extrabold text-indigo-600 font-mono mt-0.5">
              {formatCurrency(single.revenue, currency)}
            </div>
          </div>
          <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
            Single Period Recorded
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div className="bg-indigo-600 h-full rounded-full w-full" />
        </div>
        <p className="text-xs text-slate-500 italic">
          Only one sales period is available. More sales activity will appear here as data accumulates over time.
        </p>
      </div>
    )
  }

  // 2+ meaningful data points
  return (
    <div className="space-y-2">
      <div
        className="h-64 w-full"
        role="region"
        aria-label={`Sales Revenue Trend Chart. Total sales revenue is ${formatCurrency(totalRevenue, currency)} across ${meaningfulPoints.length} active sales periods.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              width={90}
              tickFormatter={(val: number) => {
                if (val >= 100000) return `${currency} ${(val / 1000).toFixed(0)}k`
                if (val >= 1000) return `${currency} ${(val / 1000).toFixed(1)}k`
                return `${currency} ${val}`
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                color: '#0f172a',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(val: number) => [formatCurrency(val, currency), 'Revenue']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#salesGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">
        Sales revenue was {formatCurrency(totalRevenue, currency)} across {meaningfulPoints.length} recorded sales periods.
      </p>
    </div>
  )
}

interface PaymentMethodsChartProps {
  data: PaymentMethodPoint[]
  currency?: string
}

export function PaymentMethodsChart({ data, currency = 'NPR' }: PaymentMethodsChartProps) {
  const validMethods = (data || []).filter((p) => p.total > 0 || p.count > 0)
  const grandTotal = validMethods.reduce((acc, curr) => acc + curr.total, 0)

  // 0 payment methods
  if (validMethods.length === 0) {
    return (
      <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <CreditCard className="h-7 w-7 mx-auto text-slate-400 mb-2 opacity-50" />
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">No payment data</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Sales volume by payment channel will appear here as payments are recorded.
        </p>
      </div>
    )
  }

  // 1 payment method (No multi-color donut!)
  if (validMethods.length === 1) {
    const single = validMethods[0]
    const label = formatPaymentMethodLabel(single.name)
    return (
      <div className="py-6 px-5 border border-slate-200 rounded-xl bg-indigo-50/30 text-center space-y-2">
        <div className="inline-flex items-center justify-center p-2 rounded-full bg-indigo-100 text-indigo-700 mb-1">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="text-sm font-bold text-slate-900">{label}</div>
        <div className="text-2xl font-extrabold text-indigo-600 font-mono">
          {formatCurrency(single.total, currency)}
        </div>
        <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          100% Share ({single.count} transactions)
        </span>
        <p className="text-[11px] text-slate-500 pt-1">
          All payment transactions logged in this period were processed via {label}.
        </p>
      </div>
    )
  }

  // 2+ payment methods: Donut Chart + Legend Data Summary Table
  return (
    <div className="space-y-4" role="region" aria-label="Payment Methods Share Chart">
      <div className="h-48 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={validMethods}
              dataKey="total"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={4}
            >
              {validMethods.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  aria-label={`${formatPaymentMethodLabel(entry.name)}: ${formatCurrency(entry.total, currency)}`}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                color: '#0f172a',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(val: number, name: string) => [
                formatCurrency(val, currency),
                formatPaymentMethodLabel(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Data Table */}
      <div className="border-t border-slate-100 pt-3 space-y-2">
        {validMethods.map((item, index) => {
          const pct = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : '0'
          const label = formatPaymentMethodLabel(item.name)
          const color = CHART_COLORS[index % CHART_COLORS.length]

          return (
            <div key={item.name} className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="font-semibold text-slate-700">{label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-500 font-medium">{pct}%</span>
                <span className="font-mono font-bold text-slate-900 min-w-[90px] text-right">
                  {formatCurrency(item.total, currency)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface TopProductsChartProps {
  data: TopProductPoint[]
  currency?: string
}

export function TopProductsChart({ data, currency = 'NPR' }: TopProductsChartProps) {
  const validProducts = (data || []).filter((p) => p.revenue > 0 || p.quantity > 0)
  const sortedProducts = [...validProducts].sort((a, b) => b.revenue - a.revenue)
  const displayProducts = sortedProducts.slice(0, 5)

  // 0 products
  if (validProducts.length === 0) {
    return (
      <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <Package className="h-7 w-7 mx-auto text-slate-400 mb-2 opacity-50" />
        <h3 className="text-sm font-bold text-slate-900 mb-0.5">No Product Sales</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Top-selling products will automatically populate here as sales occur.
        </p>
      </div>
    )
  }

  // 1 product
  if (validProducts.length === 1) {
    const item = validProducts[0]
    return (
      <div className="py-5 px-5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Top Product #1</span>
            <h4 className="text-sm font-bold text-slate-900 truncate" title={item.name}>
              {item.name}
            </h4>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-extrabold text-emerald-600 font-mono">
              {formatCurrency(item.revenue, currency)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">{item.quantity} units sold</div>
          </div>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full w-full" />
        </div>
      </div>
    )
  }

  // 2–5 products (Ranked progress bars with tooltips and truncating)
  const maxRev = Math.max(...displayProducts.map((p) => p.revenue), 1)

  return (
    <div className="space-y-3" role="region" aria-label="Top Selling Products List">
      {displayProducts.map((item, idx) => {
        const pct = Math.min(100, Math.max(8, (item.revenue / maxRev) * 100))

        return (
          <div key={item.name + idx} className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                  {item.name}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold font-mono text-emerald-600">
                  {formatCurrency(item.revenue, currency)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}

      {validProducts.length > 5 && (
        <div className="pt-2 text-right">
          <Button variant="ghost" size="sm" asChild className="h-8 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            <Link href="/app/products">
              View all products <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
