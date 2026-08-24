"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { ReportsPageSkeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/auth-context'
import { analyticsService, ProfitEstimateReport, PaymentMethodPoint } from '@/services/analytics.service'
import { productService } from '@/services/product.service'
import { customerService } from '@/services/customer.service'
import { saleService } from '@/services/sale.service'
import { expenseService } from '@/services/expense.service'
import { invoiceService } from '@/services/invoice.service'
import { Product, Sale, Customer, Expense, Invoice } from '@/types'
import { adToBS, formatBSMonth } from '@/lib/date/bs-date'
import { FinancialYearSelector } from '@/components/features/reports/FinancialYearSelector'
import { PrintHeader } from '@/components/features/reports/PrintHeader'

import { ExportMenu } from '@/components/features/reports/ExportMenu'
import { ExportDataPayload } from '@/lib/export/excel-export'
import { SimpleReportView } from '@/components/features/reports/views/SimpleReportView'
import { AccountantReportView } from '@/components/features/reports/views/AccountantReportView'
import { MonthlyData } from '@/components/features/reports/MonthlyFinancialSummary'

export default function ReportsPage() {
  const { activeBusiness } = useAuth()
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'simple' | 'accountant'>('simple')

  const [dateRange, setDateRange] = useState<{ isoFrom: string; isoTo: string; label: string } | null>(null)

  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [profitReport, setProfitReport] = useState<ProfitEstimateReport | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodPoint[]>([])

  const fetchReportsData = useCallback(async () => {
    if (!activeBusiness?.$id || !dateRange) return
    try {
      setLoading(true)
      const bId = activeBusiness.$id
      const queryParams = { dateFrom: dateRange.isoFrom, dateTo: dateRange.isoTo }

      const [sData, pData, cData, eData, iData, pReport] = await Promise.all([
        saleService.listAllSales(bId, queryParams),
        productService.listAllProducts(bId), // Products don't use date filter for inventory valuation
        customerService.listAllCustomers(bId), // Customers don't use date filter for dues
        expenseService.listAllExpenses(bId, queryParams),
        invoiceService.listAllInvoices(bId, queryParams),
        analyticsService.getProfitEstimateReport(bId, dateRange.isoFrom, dateRange.isoTo),
      ])

      setSales(sData)
      setProducts(pData)
      setCustomers(cData)
      setExpenses(eData)
      setInvoices(iData)
      setProfitReport(pReport)

      // Calculate payment methods manually based on filtered sales
      const methodMap = new Map<string, { count: number; total: number }>()
      for (const sale of sData) {
        if (sale.status === 'cancelled') continue
        const method = sale.paymentMethod || 'cash'
        const curr = methodMap.get(method) || { count: 0, total: 0 }
        curr.count += 1
        curr.total += sale.total || 0
        methodMap.set(method, curr)
      }
      const pMethodsArr: PaymentMethodPoint[] = []
      for (const [method, val] of methodMap.entries()) {
        if (val.count > 0) {
          pMethodsArr.push({
            method,
            name: method.replace('_', ' '),
            count: val.count,
            total: val.total
          })
        }
      }
      setPaymentMethods(pMethodsArr)
    } catch (err) {
      console.error('Failed to load reports data:', err)
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.$id, dateRange])

  useEffect(() => {
    if (dateRange) {
      fetchReportsData()
    }
  }, [fetchReportsData, dateRange])

  const monthlyData = useMemo(() => {
    const dataMap = new Map<string, MonthlyData>()
    
    // Initialize map with exactly 12 BS months (Shrawan to Ashadh)
    // We assume the dateRange starts in Shrawan
    if (dateRange) {
      const fromBS = adToBS(dateRange.isoFrom)
      // Enforce the Nepalese Financial Year: Always starts in Shrawan (Month 4)
      let currYear = fromBS.month < 4 ? fromBS.year - 1 : fromBS.year
      let currMonth = 4 // Shrawan
      
      for (let i = 0; i < 12; i++) {
        const monthName = formatBSMonth(currMonth, 'en')
        // Using "MonthName Year" to avoid collisions if spanning years, e.g., "Shrawan 2083"
        const monthKey = `${monthName} ${currYear}`
        dataMap.set(monthKey, { month: monthKey, revenue: 0, expenses: 0, profit: 0 })
        
        currMonth++
        if (currMonth > 12) {
          currMonth = 1
          currYear++
        }
      }
    }

    sales.forEach(s => {
      if (s.status === 'cancelled') return
      const bsDate = adToBS(s.createdAt)
      const monthKey = `${formatBSMonth(bsDate.month, 'en')} ${bsDate.year}`
      if (dataMap.has(monthKey)) {
        const val = dataMap.get(monthKey)!
        val.revenue += s.total || 0
        // We cannot calculate profit from sales alone without COGS.
        // If profitReport.hasCostDataError is true, we ignore profit completely.
      }
    })

    expenses.forEach(e => {
      const bsDate = adToBS(e.date || e.createdAt)
      const monthKey = `${formatBSMonth(bsDate.month, 'en')} ${bsDate.year}`
      if (dataMap.has(monthKey)) {
        const val = dataMap.get(monthKey)!
        val.expenses += e.amount || 0
        val.profit -= e.amount || 0
      }
    })

    return Array.from(dataMap.values())
  }, [sales, expenses, dateRange])

  if (!activeBusiness) {
    return <ReportsPageSkeleton />
  }

  const exportData: ExportDataPayload | null = dateRange && profitReport && activeBusiness ? {
    businessName: activeBusiness.name,
    yearLabel: dateRange.label,
    dateFrom: dateRange.isoFrom,
    dateTo: dateRange.isoTo,
    sales,
    invoices,
    expenses,
    products,
    customers,
    profitReport,
    monthlyData,
    paymentMethods
  } : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <PageHeader
          title="Business Intelligence & Audit Center"
          description="Complete financial reporting, reconciliation, and year-end audit package."
        />
        <div className="flex-shrink-0 flex flex-col items-end gap-4">
          <div className="flex bg-muted p-1 rounded-md">
            <button
              onClick={() => setViewMode('simple')}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${viewMode === 'simple' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Simple View
            </button>
            <button
              onClick={() => setViewMode('accountant')}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${viewMode === 'accountant' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Accountant View
            </button>
          </div>
          <div className="flex items-center gap-4">
            <FinancialYearSelector onYearChange={setDateRange} />
            {exportData && <ExportMenu data={exportData} />}
          </div>
        </div>
      </div>

      {exportData && (
        <PrintHeader
          businessName={exportData.businessName}
          yearLabel={exportData.yearLabel}
          dateFrom={exportData.dateFrom}
          dateTo={exportData.dateTo}
        />
      )}

      {loading && (
        <div className="print:hidden">
          <ReportsPageSkeleton />
        </div>
      )}

      {!loading && profitReport && exportData && dateRange && (
        viewMode === 'simple' ? (
          <SimpleReportView 
            sales={sales}
            products={products}
            customers={customers}
            expenses={expenses}
            invoices={invoices}
            profitReport={profitReport}
            monthlyData={monthlyData}
            dateRange={dateRange}
            onReviewIssue={() => setViewMode('accountant')}
          />
        ) : (
          <AccountantReportView
            sales={sales}
            products={products}
            customers={customers}
            expenses={expenses}
            invoices={invoices}
            profitReport={profitReport}
            monthlyData={monthlyData}
            paymentMethods={paymentMethods}
            dateRange={dateRange}
          />
        )
      )}
    </div>
  )
}
