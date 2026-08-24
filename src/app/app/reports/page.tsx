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

import { FinancialYearSelector } from '@/components/features/reports/FinancialYearSelector'
import { ExecutiveSummary } from '@/components/features/reports/ExecutiveSummary'
import { MonthlyFinancialSummary, MonthlyData } from '@/components/features/reports/MonthlyFinancialSummary'
import { SalesRegister } from '@/components/features/reports/SalesRegister'
import { ReconciliationReport } from '@/components/features/reports/ReconciliationReport'
import { CustomerDuesReport } from '@/components/features/reports/CustomerDuesReport'
import { InventoryReport } from '@/components/features/reports/InventoryReport'
import { ExpenseReport } from '@/components/features/reports/ExpenseReport'
import { AuditHealth } from '@/components/features/reports/AuditHealth'
import { ExportAuditPack } from '@/components/features/reports/ExportAuditPack'
import { ExportMenu } from '@/components/features/reports/ExportMenu'
import { PrintHeader } from '@/components/features/reports/PrintHeader'
import { ExportDataPayload } from '@/lib/export/excel-export'

export default function ReportsPage() {
  const { activeBusiness } = useAuth()
  const [loading, setLoading] = useState(true)

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
    
    // Initialize map with months in the range (roughly)
    if (dateRange) {
      const from = new Date(dateRange.isoFrom)
      const to = new Date(dateRange.isoTo)
      const curr = new Date(from)
      while (curr <= to) {
        const monthKey = curr.toLocaleString('en-US', { month: 'short', year: 'numeric' })
        if (!dataMap.has(monthKey)) {
          dataMap.set(monthKey, { month: monthKey, revenue: 0, expenses: 0, profit: 0 })
        }
        curr.setMonth(curr.getMonth() + 1)
      }
    }

    sales.forEach(s => {
      if (s.status === 'cancelled') return
      const date = new Date(s.createdAt)
      const monthKey = date.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      if (dataMap.has(monthKey)) {
        const val = dataMap.get(monthKey)!
        val.revenue += s.total || 0
        val.profit += s.total || 0
      }
    })

    expenses.forEach(e => {
      const date = new Date(e.date || e.createdAt)
      const monthKey = date.toLocaleString('en-US', { month: 'short', year: 'numeric' })
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

  const collectedTotal = paymentMethods.reduce((sum, p) => sum + p.total, 0)
  const salesTotal = sales.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + (s.total || 0), 0)
  const outstandingTotal = salesTotal - collectedTotal

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
        <div className="flex-shrink-0 flex items-center gap-4">
          <FinancialYearSelector onYearChange={setDateRange} />
          {exportData && <ExportMenu data={exportData} />}
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

      {!loading && profitReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="col-span-1 md:col-span-2 lg:col-span-4">
            <ExecutiveSummary 
              metrics={{
                totalRevenue: profitReport.totalRevenue,
                grossProfit: profitReport.grossProfit,
                netProfit: profitReport.netProfit,
                totalExpenses: profitReport.totalExpenses,
                totalSalesCount: profitReport.totalSalesCount,
                netMarginPercent: profitReport.netMarginPercent,
                totalCustomers: customers.length,
                totalProducts: products.length,
              }} 
            />
          </div>

          <MonthlyFinancialSummary data={monthlyData} />

          <SalesRegister sales={sales} />
          
          <ReconciliationReport 
            salesTotal={salesTotal}
            collectedTotal={collectedTotal}
            outstandingTotal={outstandingTotal}
            paymentMethods={paymentMethods}
          />
          
          <CustomerDuesReport customers={customers} />

          <ExpenseReport expenses={expenses} />

          <AuditHealth sales={sales} invoices={invoices} />

          <InventoryReport products={products} />

          {dateRange && (
            <div className="print:hidden">
              <ExportAuditPack
                businessId={activeBusiness.$id}
                yearLabel={dateRange.label}
                sales={sales}
                invoices={invoices}
                expenses={expenses}
                products={products}
                customers={customers}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
