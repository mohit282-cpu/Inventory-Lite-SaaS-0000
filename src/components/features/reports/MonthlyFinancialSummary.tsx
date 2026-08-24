"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils'

export interface MonthlyData {
  month: string
  revenue: number
  expenses: number
  profit: number
}

interface MonthlyFinancialSummaryProps {
  data: MonthlyData[]
}

export function MonthlyFinancialSummary({ data }: MonthlyFinancialSummaryProps) {
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4">
      <CardHeader>
        <CardTitle>Monthly Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] print:h-auto">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(val) => `Rs.${val / 1000}k`} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              cursor={{ fill: 'transparent' }}
            />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
