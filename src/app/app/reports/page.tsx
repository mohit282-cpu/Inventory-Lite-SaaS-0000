"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { LoadingPage } from '@/components/ui/loading'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuth } from '@/context/auth-context'
import { analyticsService, ProfitEstimateReport } from '@/services/analytics.service'
import { productService } from '@/services/product.service'
import { customerService } from '@/services/customer.service'
import { saleService } from '@/services/sale.service'
import { expenseService } from '@/services/expense.service'
import { Product, Sale, Customer, Expense } from '@/types'
import {
  TrendingUp,
  Download,
  Package,
  Users,
  Receipt,
  DollarSign,
} from 'lucide-react'

export default function ReportsPage() {
  const { activeBusiness } = useAuth()

  const [activeTab, setActiveTab] = useState<'sales' | 'stock' | 'dues' | 'expenses' | 'profit'>('sales')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Real database datasets
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [profitReport, setProfitReport] = useState<ProfitEstimateReport | null>(null)

  const fetchReportsData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setLoading(true)
      const bId = activeBusiness.$id

      const [sData, pData, cData, eData, pReport] = await Promise.all([
        saleService.listSales(bId),
        productService.listProducts(bId),
        customerService.listCustomers(bId),
        expenseService.listExpenses(bId),
        analyticsService.getProfitEstimateReport(bId),
      ])

      setSales(sData)
      setProducts(pData)
      setCustomers(cData)
      setExpenses(eData)
      setProfitReport(pReport)
    } catch (err) {
      console.error('Failed to load reports data:', err)
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.$id])

  useEffect(() => {
    fetchReportsData()
  }, [fetchReportsData])

  if (loading) {
    return <LoadingPage message="Generating real-time business reports..." />
  }

  const currency = activeBusiness?.currency || 'NPR'

  // Calculations for Stock Valuation
  const totalStockValuationCost = products.reduce((sum, p) => sum + (p.stockQuantity || 0) * (p.purchasePrice || 0), 0)
  const totalStockValuationRetail = products.reduce((sum, p) => sum + (p.stockQuantity || 0) * (p.sellingPrice || 0), 0)
  const potentialProfitMargin = totalStockValuationRetail - totalStockValuationCost

  // Total Customer Due
  const totalCustomerDues = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0)

  // Total Expenses
  const totalExpensesAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // CSV Export Handler
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,'
    if (activeTab === 'sales') {
      csvContent += 'Sale Number,Total,Paid,Due,Payment Method,Status,Date\n'
      sales.forEach((s) => {
        csvContent += `${s.saleNumber || s.$id},${s.total},${s.paidAmount},${s.dueAmount},${s.paymentMethod},${s.status},${s.createdAt}\n`
      })
    } else if (activeTab === 'stock') {
      csvContent += 'Product Name,SKU,Stock Qty,Purchase Price,Selling Price,Valuation (Cost)\n'
      products.forEach((p) => {
        csvContent += `"${p.name}",${p.sku},${p.stockQuantity},${p.purchasePrice},${p.sellingPrice},${p.stockQuantity * p.purchasePrice}\n`
      })
    } else if (activeTab === 'dues') {
      csvContent += 'Customer Name,Phone,Email,Total Due\n'
      customers.forEach((c) => {
        csvContent += `"${c.name}",${c.phone || ''},${c.email || ''},${c.totalDue}\n`
      })
    } else if (activeTab === 'expenses') {
      csvContent += 'Title,Category,Amount,Date,Notes\n'
      expenses.forEach((e) => {
        csvContent += `"${e.title}",${e.category},${e.amount},${e.date},"${e.notes || ''}"\n`
      })
    } else if (activeTab === 'profit' && profitReport) {
      csvContent += 'Metric,Amount (Rs)\n'
      csvContent += `Total Sales Revenue,${profitReport.totalRevenue}\n`
      csvContent += `Cost of Goods Sold (COGS),${profitReport.cogs}\n`
      csvContent += `Gross Profit,${profitReport.grossProfit}\n`
      csvContent += `Total Expenses,${profitReport.totalExpenses}\n`
      csvContent += `Net Profit,${profitReport.netProfit}\n`
      csvContent += `Net Profit Margin %,${profitReport.netMarginPercent}%\n`
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Inventory_Lite_${activeTab.toUpperCase()}_Report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Intelligence & Reports"
        description="Comprehensive real-data financial, sales, inventory, and net profit analytics."
        actions={
          <Button onClick={handleExportCSV} variant="outline" className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 shadow-md">
            <Download className="mr-2 h-4 w-4 text-emerald-400" /> Export Active Report (CSV)
          </Button>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="h-4 w-4" /> 1. Sales Report
        </button>

        <button
          onClick={() => setActiveTab('stock')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'stock' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Package className="h-4 w-4" /> 2. Product & Stock Report
        </button>

        <button
          onClick={() => setActiveTab('dues')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'dues' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="h-4 w-4" /> 3. Customer Dues Report
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'expenses' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Receipt className="h-4 w-4" /> 4. Expense Report
        </button>

        <button
          onClick={() => setActiveTab('profit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'profit' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <DollarSign className="h-4 w-4" /> 5. Profit Estimate
        </button>
      </div>

      {/* TAB 1: SALES REPORT */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <SearchInput placeholder="Search sales by invoice # or customer..." value={searchQuery} onChange={setSearchQuery} />
            <div className="text-sm font-semibold text-slate-300">
              Total Sales Volume: <span className="text-emerald-400 font-mono font-bold">Rs. {sales.reduce((sum, s) => sum + s.total, 0).toFixed(2)}</span>
            </div>
          </div>

          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Sale #</th>
                    <th className="py-2.5 px-3">Subtotal</th>
                    <th className="py-2.5 px-3">VAT (13%)</th>
                    <th className="py-2.5 px-3">Grand Total</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {sales
                    .filter((s) => (s.saleNumber || s.$id).toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((s) => (
                      <tr key={s.$id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-mono font-medium text-indigo-400">{s.saleNumber || s.$id.slice(0, 8)}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">Rs. {s.subtotal.toFixed(2)}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">Rs. {s.tax.toFixed(2)}</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-400">Rs. {s.total.toFixed(2)}</td>
                        <td className="py-3 px-3 uppercase text-xs text-slate-300">{s.paymentMethod}</td>
                        <td className="py-3 px-3"><StatusBadge status={s.status} /></td>
                        <td className="py-3 px-3 text-right text-xs text-slate-400">{new Date(s.createdAt || '').toLocaleDateString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: PRODUCT & STOCK REPORT */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-4">
              <p className="text-xs text-slate-400 uppercase font-semibold">Cost Valuation</p>
              <p className="text-2xl font-bold font-mono text-indigo-400 mt-1">{currency} {totalStockValuationCost.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">Based on purchase prices</p>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-4">
              <p className="text-xs text-slate-400 uppercase font-semibold">Retail Valuation</p>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{currency} {totalStockValuationRetail.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">Based on selling prices</p>
            </Card>

            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-4">
              <p className="text-xs text-slate-400 uppercase font-semibold">Potential Margin</p>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{currency} {potentialProfitMargin.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">Estimated gross asset profit</p>
            </Card>
          </div>

          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-center">Stock Qty</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Total Cost Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {products.map((p) => (
                    <tr key={p.$id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-medium text-slate-200">{p.name}</td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-400">{p.sku}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-white">{p.stockQuantity}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">Rs. {p.purchasePrice.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400">Rs. {p.sellingPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-400">
                        Rs. {(p.stockQuantity * p.purchasePrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: CUSTOMER DUES REPORT */}
      {activeTab === 'dues' && (
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Outstanding Customer Dues Summary</h3>
              <div className="text-right font-mono font-bold text-amber-400 text-lg">
                Total Credit Due: Rs. {totalCustomerDues.toFixed(2)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {customers.map((c) => (
                    <tr key={c.$id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-medium text-slate-200">{c.name}</td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-400">{c.phone || '-'}</td>
                      <td className="py-3 px-3 text-slate-400 text-xs">{c.email || '-'}</td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${c.totalDue > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        Rs. {(c.totalDue || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: EXPENSE REPORT */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Expenditure Log & Summary</h3>
              <div className="text-right font-mono font-bold text-rose-400 text-lg">
                Total Expenses: Rs. {totalExpensesAmount.toFixed(2)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {expenses.map((e) => (
                    <tr key={e.$id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-medium text-slate-200">{e.title}</td>
                      <td className="py-3 px-3 uppercase text-xs font-mono text-slate-400">{e.category}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-400">Rs. {e.amount.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-xs text-slate-400">{e.date || e.createdAt?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: NET PROFIT ESTIMATE REPORT */}
      {activeTab === 'profit' && profitReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Revenue Card */}
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
              <p className="text-xs text-slate-400 uppercase font-semibold">1. Total Revenue</p>
              <p className="text-3xl font-black font-mono text-emerald-400 mt-2">{currency} {profitReport.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">From {profitReport.totalSalesCount} completed sales</p>
            </Card>

            {/* COGS Card */}
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
              <p className="text-xs text-slate-400 uppercase font-semibold">2. Cost of Goods Sold (COGS)</p>
              <p className="text-3xl font-black font-mono text-amber-400 mt-2">{currency} {profitReport.cogs.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">Purchase cost of sold items</p>
            </Card>

            {/* Total Expenses */}
            <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
              <p className="text-xs text-slate-400 uppercase font-semibold">3. Total Operating Expenses</p>
              <p className="text-3xl font-black font-mono text-rose-400 mt-2">{currency} {profitReport.totalExpenses.toFixed(2)}</p>
              <p className="text-xs text-slate-500 mt-1">Logged operational expenses</p>
            </Card>
          </div>

          {/* Profit & Loss Executive Summary Card */}
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 space-y-6">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Executive Profit & Loss Statement
            </h3>

            <div className="space-y-4 font-mono text-sm max-w-xl">
              <div className="flex justify-between text-slate-300">
                <span>Total Gross Sales Revenue:</span>
                <span className="font-bold text-white">+ {currency} {profitReport.totalRevenue.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Less: Cost of Goods Sold (COGS):</span>
                <span className="text-amber-400">- {currency} {profitReport.cogs.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-200 border-t border-slate-800 pt-2 font-bold">
                <span>Gross Profit:</span>
                <span className="text-emerald-400">= {currency} {profitReport.grossProfit.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Less: Total Operating Expenses:</span>
                <span className="text-rose-400">- {currency} {profitReport.totalExpenses.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-lg font-black border-t-2 border-slate-700 pt-3 text-white bg-slate-950/80 p-4 rounded-xl">
                <span>Net Estimated Profit:</span>
                <span className={profitReport.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {currency} {profitReport.netProfit.toFixed(2)} ({profitReport.netMarginPercent}%)
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
