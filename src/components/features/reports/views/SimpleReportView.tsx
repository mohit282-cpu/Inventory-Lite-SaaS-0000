"use client"

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Sale, Customer, Expense, Invoice, Product } from '@/types'
import { ProfitEstimateReport } from '@/services/analytics.service'
import dynamic from 'next/dynamic'
import { WhatDoesThisMean } from '../WhatDoesThisMean'
import { PrintDisclaimer } from '../PrintDisclaimer'
import type { MonthlyData } from '../MonthlyFinancialSummary'
import { WhatNeedsAttention } from '../WhatNeedsAttention'
import { TraceableMetricCard, TraceableItem } from '../TraceableMetricCard'
import { YearEndReviewChecklist } from '../YearEndReviewChecklist'

const MonthlyFinancialSummary = dynamic(
  () => import('../MonthlyFinancialSummary').then((m) => m.MonthlyFinancialSummary),
  { ssr: false, loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl" /> }
)
import { analyzeBusinessHealth } from '@/lib/report-auditor'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export interface SimpleReportViewProps {
  sales: Sale[]
  products: Product[]
  customers: Customer[]
  expenses: Expense[]
  invoices: Invoice[]
  profitReport: ProfitEstimateReport
  monthlyData: MonthlyData[]
  dateRange: { isoFrom: string; isoTo: string; label: string }
  onReviewIssue: () => void
}

export function SimpleReportView({
  sales,
  products,
  customers,
  expenses,
  invoices,
  profitReport,
  monthlyData,
  dateRange,
  onReviewIssue,
}: SimpleReportViewProps) {
  // 1. RUN AUDIT ENGINE
  const healthSummary = useMemo(() => {
    return analyzeBusinessHealth(sales, invoices, customers, expenses, products)
  }, [sales, invoices, customers, expenses, products])

  // 2. METRIC BREAKDOWNS & DRILL-DOWN TRACEABILITY
  const activeProducts = products.filter((p) => p.isActive)
  const totalValueAtCost = activeProducts.reduce(
    (sum, p) => sum + (p.stockQuantity || 0) * (p.purchasePrice || 0),
    0
  )
  const totalValueAtRetail = activeProducts.reduce(
    (sum, p) => sum + (p.stockQuantity || 0) * (p.sellingPrice || 0),
    0
  )

  const duesTotal = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0)
  const customersWithDues = customers.filter((c) => (c.totalDue || 0) > 0)

  const discountTotal = sales.reduce((sum, s) => sum + (s.discount || 0), 0)
  const vatTotal = sales.reduce((sum, s) => sum + (s.tax || 0), 0)
  const collectedTotal = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0)
  const outstandingTotal = sales.reduce((sum, s) => sum + (s.dueAmount || 0), 0)
  const grossSales = sales.reduce((sum, s) => sum + (s.subtotal || 0), 0)

  // Traceable Items for Sales
  const traceableSales: TraceableItem[] = sales
    .filter((s) => s.status !== 'cancelled')
    .map((s) => ({
      id: s.$id,
      title: s.saleNumber || `Sale #${s.$id.substring(0, 8)}`,
      subtitle: `${s.customerName || 'Walk-in Customer'} • ${s.paymentMethod || 'cash'}`,
      value: s.total || 0,
      date: (s.createdAt || '').slice(0, 10),
      url: `/app/sales/${s.$id}`,
    }))

  // Traceable Items for Expenses
  const traceableExpenses: TraceableItem[] = expenses.map((e) => ({
    id: e.$id,
    title: e.title || e.category || 'Business Expense',
    subtitle: e.category ? `Category: ${e.category}` : undefined,
    value: e.amount || 0,
    date: e.date || (e.createdAt || '').slice(0, 10),
    url: '/app/expenses',
  }))

  // Traceable Items for Customer Dues
  const traceableDues: TraceableItem[] = customersWithDues.map((c) => ({
    id: c.$id,
    title: c.name,
    subtitle: c.phone ? `Phone: ${c.phone}` : 'Outstanding Credit Balance',
    value: c.totalDue || 0,
    url: `/app/customers/${c.$id}`,
  }))

  // Traceable Items for Stock Valuation
  const traceableProducts: TraceableItem[] = activeProducts.map((p) => ({
    id: p.$id,
    title: p.name,
    subtitle: `Stock Qty: ${p.stockQuantity || 0} • SKU: ${p.sku || 'N/A'}`,
    value: (p.stockQuantity || 0) * (p.purchasePrice || 0),
    url: '/app/products',
  }))

  const businessId = sales[0]?.businessId || 'default'

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. AT A GLANCE SUMMARY BOX */}
      <Card className="border border-indigo-100 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-xl shadow-md overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Summary Report
                </span>
                <span className="text-xs text-indigo-300 font-semibold">{dateRange.label}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white mt-1.5">Your Business Report At A Glance</h1>
              <p className="text-xs text-indigo-200 mt-1">
                {healthSummary.overallStatus === 'ok'
                  ? 'Overall, your financial records look good and consistent.'
                  : healthSummary.overallStatus === 'needs_review'
                  ? `Your records need attention. Please review the ${healthSummary.issuesCount.needs_review} item(s) listed below.`
                  : `Action required: Please resolve the ${healthSummary.issuesCount.action_required} data issue(s) listed below.`}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onReviewIssue}
              className="bg-indigo-600/40 hover:bg-indigo-600 text-white border-indigo-400/40 font-bold text-xs shrink-0 h-10 px-4"
            >
              Open Accountant View <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            <div className="bg-white/10 p-3 rounded-lg border border-white/10">
              <span className="text-indigo-200 font-medium block">Total Sales</span>
              <span className="text-lg font-extrabold text-white">{formatCurrency(profitReport.totalRevenue)}</span>
            </div>
            <div className="bg-white/10 p-3 rounded-lg border border-white/10">
              <span className="text-indigo-200 font-medium block">Total Expenses</span>
              <span className="text-lg font-extrabold text-white">{formatCurrency(profitReport.totalExpenses)}</span>
            </div>
            <div className="bg-white/10 p-3 rounded-lg border border-white/10">
              <span className="text-indigo-200 font-medium block">Customer Dues</span>
              <span className="text-lg font-extrabold text-amber-300">{formatCurrency(duesTotal)}</span>
            </div>
            <div className="bg-white/10 p-3 rounded-lg border border-white/10">
              <span className="text-indigo-200 font-medium block">Stock Cost Value</span>
              <span className="text-lg font-extrabold text-white">{formatCurrency(totalValueAtCost)}</span>
            </div>
            <div className="bg-white/10 p-3 rounded-lg border border-white/10">
              <span className="text-indigo-200 font-medium block">Estimated Profit</span>
              <span
                className={`text-lg font-extrabold ${
                  profitReport.netProfit < 0 ? 'text-rose-400' : 'text-emerald-300'
                }`}
              >
                {formatCurrency(profitReport.netProfit)}
              </span>
            </div>
            <div className="bg-white/10 p-3 rounded-lg border border-white/10">
              <span className="text-indigo-200 font-medium block">Records Needing Review</span>
              <span
                className={`text-lg font-extrabold ${
                  healthSummary.issuesCount.action_required > 0
                    ? 'text-rose-400'
                    : healthSummary.issuesCount.needs_review > 0
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {healthSummary.issuesCount.needs_review + healthSummary.issuesCount.action_required}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. BUSINESS HEALTH & WHAT NEEDS ATTENTION */}
      <WhatNeedsAttention summary={healthSummary} onSwitchToAccountantView={onReviewIssue} />

      {/* 3. TRACEABLE KPI CARDS GRID */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TraceableMetricCard
          title="TOTAL SALES"
          amount={profitReport.totalRevenue}
          explanation="Total billed amount across all completed sales."
          termKey="Gross Sales"
          viewLabel={`View ${traceableSales.length} sales`}
          items={traceableSales}
        />

        <TraceableMetricCard
          title="TOTAL EXPENSES"
          amount={profitReport.totalExpenses}
          explanation="Operational expenses (rent, electricity, transport) recorded."
          viewLabel={`View ${traceableExpenses.length} expenses`}
          items={traceableExpenses}
        />

        <TraceableMetricCard
          title="CUSTOMER DUES (UDHA)"
          amount={duesTotal}
          amountColorClass="text-rose-600"
          explanation="Money customers still owe your shop on credit."
          termKey="Outstanding"
          viewLabel={`View ${traceableDues.length} customers`}
          items={traceableDues}
        />

        <TraceableMetricCard
          title="STOCK COST VALUE"
          amount={totalValueAtCost}
          explanation="Estimated cost value of physical inventory currently in stock."
          termKey="Stock Cost Value"
          viewLabel={`View ${traceableProducts.length} items`}
          items={traceableProducts}
        />
      </div>

      {/* 4. ESTIMATED PROFIT CARD */}
      <Card className="border border-slate-200 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              ESTIMATED PROFIT
            </span>
            <WhatDoesThisMean termKey="Estimated Profit" triggerText="[ How is this calculated? ]" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {profitReport.hasCostDataError ? (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
              <div className="text-lg font-bold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" /> Cost Data Missing for Accurate Calculation
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Some items sold during this period do not have purchase prices recorded. Add cost prices to products in Stock to generate accurate profit estimates.
              </p>
              <Link href="/app/products" className="inline-block text-xs font-bold text-indigo-700 underline pt-1">
                Go to Products to Update Costs &rarr;
              </Link>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50 border border-slate-200 p-5 rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Estimated Net Profit</span>
                <div
                  className={`text-3xl font-extrabold mt-1 ${
                    profitReport.netProfit < 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(profitReport.netProfit)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Sales revenue ({formatCurrency(profitReport.totalRevenue)}) − Recorded costs ({formatCurrency(profitReport.cogs)}) − Recorded expenses ({formatCurrency(profitReport.totalExpenses)})
                </p>
              </div>

              <div className="space-y-2 text-xs font-medium text-slate-700 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6 shrink-0">
                <div className="flex justify-between gap-8">
                  <span className="text-slate-500">Gross Sales Revenue:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(profitReport.totalRevenue)}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-slate-500">− Product Cost (COGS):</span>
                  <span className="font-bold text-rose-600">−{formatCurrency(profitReport.cogs)}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-slate-500">− Recorded Expenses:</span>
                  <span className="font-bold text-rose-600">−{formatCurrency(profitReport.totalExpenses)}</span>
                </div>
                <div className="flex justify-between gap-8 border-t border-slate-200 pt-1.5 font-bold">
                  <span className="text-slate-900">= Estimated Profit:</span>
                  <span className={profitReport.netProfit < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    {formatCurrency(profitReport.netProfit)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. MONTHLY BUSINESS SUMMARY CHART */}
      <div className="grid gap-4">
        <MonthlyFinancialSummary
          data={monthlyData}
          hasCostDataError={profitReport.hasCostDataError}
          title="MONTHLY BUSINESS TRENDS (BS CALENDAR)"
        />
      </div>

      {/* 6. SALES & VAT SUMMARY CARDS */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales Breakdown */}
        <Card className="border border-slate-200 shadow-xs rounded-xl">
          <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center justify-between">
              <span>SALES BREAKDOWN</span>
              <WhatDoesThisMean termKey="Gross Sales" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3.5 text-xs sm:text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2.5">
              <span className="text-slate-500 font-medium">Gross Billed Sales</span>
              <span className="font-bold text-slate-900">{formatCurrency(grossSales)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2.5">
              <span className="text-slate-500 font-medium flex items-center">
                Discounts Given
                <WhatDoesThisMean explanation="Total discount deducted from customer bills during this period." />
              </span>
              <span className="font-bold text-rose-600">−{formatCurrency(discountTotal)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2.5">
              <span className="text-slate-500 font-medium">Net Sales Billed</span>
              <span className="font-bold text-emerald-600">{formatCurrency(profitReport.totalRevenue)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2.5">
              <span className="text-slate-500 font-medium">Amount Collected</span>
              <span className="font-bold text-emerald-700">{formatCurrency(collectedTotal)}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500 font-medium">Amount Still Due</span>
              <span className="font-bold text-rose-600">{formatCurrency(outstandingTotal)}</span>
            </div>
            <div className="pt-2">
              <Link href="/app/sales" className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1">
                View All Sales &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* VAT Summary */}
        <Card className="border border-slate-200 shadow-xs rounded-xl">
          <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center justify-between">
              <span>VAT & TAX SUMMARY</span>
              <WhatDoesThisMean termKey="VAT" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-xs sm:text-sm">
            {vatTotal > 0 ? (
              <>
                <div className="flex justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-slate-500 font-medium">Sales Subject to VAT</span>
                  <span className="font-bold text-slate-900">{formatCurrency(grossSales - discountTotal)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-slate-500 font-medium">VAT Recorded (13%)</span>
                  <span className="font-bold text-indigo-700">{formatCurrency(vatTotal)}</span>
                </div>
                <div className="mt-3 bg-indigo-50/80 border border-indigo-100 p-3.5 rounded-lg text-xs leading-relaxed space-y-1">
                  <span className="font-bold text-indigo-900 block">What does this mean for Nepal Tax?</span>
                  <p className="text-slate-700">
                    This shows VAT recorded in your Inventory Lite transactions. It is a software report and does not by itself determine legal VAT registration rules or final tax returns. Confirm filing details with your accountant or IRD.
                  </p>
                </div>
              </>
            ) : (
              <div className="p-4 bg-slate-50 rounded-lg text-slate-600 text-xs leading-relaxed border border-slate-200">
                ℹ️ VAT is currently not enabled for this business, or no VAT was recorded on sales during this period.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7. CUSTOMER DUES & STOCK SUMMARY */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Dues */}
        <Card className="border border-slate-200 shadow-xs rounded-xl">
          <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center justify-between">
              <span>CUSTOMERS WHO OWE YOU</span>
              <WhatDoesThisMean termKey="Outstanding" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {customersWithDues.length === 0 ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>You&apos;re all caught up. No customers currently have outstanding payments.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {customersWithDues.slice(0, 5).map((c) => (
                  <div key={c.$id} className="flex justify-between items-center border-b border-slate-100 pb-2 text-xs sm:text-sm">
                    <span className="font-bold text-slate-800">{c.name}</span>
                    <span className="font-bold text-rose-600">{formatCurrency(c.totalDue || 0)}</span>
                  </div>
                ))}
                <Link href="/app/customers" className="text-xs font-bold text-indigo-600 hover:underline inline-block pt-1">
                  View All Customer Credit Ledgers &rarr;
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Summary */}
        <Card className="border border-slate-200 shadow-xs rounded-xl">
          <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100">
            <CardTitle className="text-base font-extrabold text-slate-900 flex items-center justify-between">
              <span>STOCK & INVENTORY VALUE</span>
              <WhatDoesThisMean termKey="Potential Gross Margin" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2.5">
              <span className="text-slate-500 font-medium">Active Products Count</span>
              <span className="font-bold text-slate-900">{activeProducts.length}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2.5">
              <span className="text-slate-500 font-medium">Current Stock Cost</span>
              <span className="font-bold text-slate-900">{formatCurrency(totalValueAtCost)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2.5">
              <span className="text-slate-500 font-medium">Current Stock Retail Value</span>
              <span className="font-bold text-indigo-700">{formatCurrency(totalValueAtRetail)}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500 font-medium flex items-center">
                Potential Gross Margin
                <WhatDoesThisMean explanation="Difference between stock retail value and stock cost value. This is unrealized profit." />
              </span>
              <span className="font-bold text-emerald-600">{formatCurrency(totalValueAtRetail - totalValueAtCost)}</span>
            </div>
            <p className="text-[11px] text-slate-400 italic pt-1">
              Potential margin is the difference between total retail value and total purchase cost. It is realized only as products are sold.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 8. YEAR-END REVIEW CHECKLIST */}
      <YearEndReviewChecklist businessId={businessId} yearLabel={dateRange.label} />

      <PrintDisclaimer />
    </div>
  )
}
