'use client'

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
import { SalesChartPoint, TopProductPoint, PaymentMethodPoint } from '@/services/analytics.service'
import { CreditCard, Package } from 'lucide-react'

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']

interface SalesTrendChartProps {
  data: SalesChartPoint[]
}

export function SalesTrendChart({ data }: SalesTrendChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              color: '#0f172a',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(val: number) => [`Rs. ${val.toFixed(2)}`, 'Revenue']}
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
  )
}

interface PaymentMethodsChartProps {
  data: PaymentMethodPoint[]
}

export function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  if (!data.some((p) => p.count > 0)) {
    return (
      <div className="text-center text-slate-400 text-xs py-8 space-y-2">
        <CreditCard className="h-8 w-8 mx-auto opacity-30" />
        <p>No payment method transactions logged yet.</p>
      </div>
    )
  }

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={4}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
            formatter={(val: number) => [`Rs. ${val.toFixed(2)}`, 'Total']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

interface TopProductsChartProps {
  data: TopProductPoint[]
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs space-y-2">
        <Package className="h-8 w-8 mx-auto opacity-30" />
        <p>Top selling products will automatically populate here as sales occur.</p>
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            stroke="#475569"
            fontSize={11}
            width={120}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e2e8f0',
              color: '#0f172a',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(val: number) => [`Rs. ${val.toFixed(2)}`, 'Revenue']}
          />
          <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
