"use client"

import React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, Package } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Intelligence & Reports"
        description="Analyze revenue, inventory valuation, profit margins, and sales trends."
        actions={
          <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700">
            <Download className="mr-2 h-4 w-4" /> Export Report (CSV)
          </Button>
        }
      />

      {/* Report Cards Shell */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-300">Sales Report</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">Daily & Monthly Revenue</div>
            <p className="text-xs text-slate-400 mt-1">Track sales volume breakdown</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-300">Stock Valuation</CardTitle>
            <Package className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">Asset Inventory Value</div>
            <p className="text-xs text-slate-400 mt-1">Cost vs Selling price analysis</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-300">Profit & Loss</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">Net Profit Margin</div>
            <p className="text-xs text-slate-400 mt-1">Revenue minus total expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart Container Placeholder */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
        <CardHeader className="px-0 pt-0 pb-4 border-b border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-white">Revenue & Expenses Trend</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-slate-800 bg-slate-950 text-slate-300">
              <Calendar className="mr-1.5 h-3.5 w-3.5" /> Last 30 Days
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-6">
          <EmptyState
            title="Insufficient data for reporting"
            description="Process sales and log inventory transactions to generate automated charts and analytics."
            icon={BarChart3}
          />
        </CardContent>
      </Card>
    </div>
  )
}
