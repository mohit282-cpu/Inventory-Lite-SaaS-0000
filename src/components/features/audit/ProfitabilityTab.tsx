"use client"

import React from 'react'
import { ProfitabilityAuditSummary } from '@/services/audit-center.service'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, AlertTriangle } from 'lucide-react'

interface ProfitabilityTabProps {
  summary: ProfitabilityAuditSummary | null
  loading: boolean
}

export function ProfitabilityTab({ summary, loading }: ProfitabilityTabProps) {
  if (loading || !summary) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cost Data Missing Alert Banner */}
      {summary.costDataMissingCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-extrabold">Notice: Cost Data Missing for {summary.costDataMissingCount} Sold Items. </span>
              <span>
                Gross profit and margins are calculated based on recorded WAC cost prices. Update catalog purchase costs to achieve 100% accurate P&L margin metrics.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-200 text-amber-950 font-black text-xs font-mono">
            {summary.costDataMissingCount} Missing Costs
          </span>
        </div>
      )}

      {/* Waterfall P&L Summary */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Financial Statement & Profitability Audit (P&L Waterfall)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Traceable revenue, cost of goods sold, operating expenses, and net profit margins.
          </p>
        </div>

        {/* Waterfall Table */}
        <div className="max-w-3xl mx-auto space-y-3 font-sans text-xs">
          {/* Gross Sales */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between font-bold">
            <span className="text-slate-700">1. Gross Sales Revenue</span>
            <span className="text-slate-900 text-sm">{formatCurrency(summary.grossSales)}</span>
          </div>

          {/* Sales Returns */}
          <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100 flex items-center justify-between text-rose-800">
            <span className="font-semibold">Less: Sales Returns & Refunds</span>
            <span className="font-bold">-{formatCurrency(summary.salesReturns)}</span>
          </div>

          {/* Net Sales */}
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between text-indigo-900 font-extrabold text-sm">
            <span>2. Net Sales Revenue</span>
            <span>{formatCurrency(summary.netSales)}</span>
          </div>

          {/* COGS */}
          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between text-slate-700">
            <span className="font-semibold">Less: Cost of Goods Sold (COGS - WAC)</span>
            <span className="font-bold">-{formatCurrency(summary.cogs)}</span>
          </div>

          {/* Gross Profit */}
          <div className="p-4 rounded-xl bg-emerald-100/70 border border-emerald-300 flex items-center justify-between text-emerald-950 font-black text-base">
            <div>
              <div>3. Gross Profit</div>
              <div className="text-[11px] font-medium text-emerald-800 mt-0.5">
                Gross Margin: {summary.grossMarginPercent.toFixed(1)}%
              </div>
            </div>
            <span>{formatCurrency(summary.grossProfit)}</span>
          </div>

          {/* Expenses */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between text-amber-900">
            <span className="font-semibold">Less: Operating Expenses (Rent, Salary, Admin)</span>
            <span className="font-bold">-{formatCurrency(summary.expenses)}</span>
          </div>

          {/* Net Profit */}
          <div className="p-5 rounded-xl bg-indigo-950 text-white flex items-center justify-between shadow-md">
            <div>
              <div className="text-xs font-bold uppercase text-indigo-300">4. Net Profit</div>
              <div className="text-[11px] text-indigo-200 mt-0.5">
                Net Profit Margin: {summary.netMarginPercent.toFixed(1)}%
              </div>
            </div>
            <div className="text-2xl font-black">{formatCurrency(summary.netProfit)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
