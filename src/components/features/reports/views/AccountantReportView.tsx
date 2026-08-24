"use client"

import React from 'react'
import { ExecutiveSummary } from '../ExecutiveSummary'
import { MonthlyFinancialSummary, MonthlyData } from '../MonthlyFinancialSummary'
import { SalesRegister } from '../SalesRegister'
import { ReconciliationReport } from '../ReconciliationReport'
import { CustomerDuesReport } from '../CustomerDuesReport'
import { InventoryReport } from '../InventoryReport'
import { ExpenseReport } from '../ExpenseReport'
import { AuditHealth } from '../AuditHealth'
import { PrintDisclaimer } from '../PrintDisclaimer'
import { Sale, Customer, Expense, Invoice, Product } from '@/types'
import { ProfitEstimateReport, PaymentMethodPoint } from '@/services/analytics.service'

export interface AccountantReportViewProps {
  sales: Sale[]
  products: Product[]
  customers: Customer[]
  expenses: Expense[]
  invoices: Invoice[]
  profitReport: ProfitEstimateReport
  monthlyData: MonthlyData[]
  paymentMethods: PaymentMethodPoint[]
  dateRange: { isoFrom: string; isoTo: string; label: string }
}

export function AccountantReportView({
  sales,
  products,
  customers,
  expenses,
  invoices,
  profitReport,
  monthlyData,
  paymentMethods
}: AccountantReportViewProps) {
  const hasCostDataError = profitReport.hasCostDataError

  // Sales calculations
  const salesTotal = sales.reduce((acc, sale) => acc + (sale.total || 0), 0)
  const collectedTotal = sales.reduce((acc, sale) => acc + (sale.paidAmount || 0), 0)
  const outstandingTotal = sales.reduce((acc, sale) => acc + (sale.dueAmount || 0), 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between no-print">
        <h2 className="text-xl font-semibold">Accountant & Audit View</h2>
      </div>

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
          hasCostDataError
        }} 
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MonthlyFinancialSummary data={monthlyData} hasCostDataError={hasCostDataError} />
        <ReconciliationReport 
          salesTotal={salesTotal}
          collectedTotal={collectedTotal}
          outstandingTotal={outstandingTotal}
          paymentMethods={paymentMethods}
          sales={sales}
        />
        <AuditHealth sales={sales} invoices={invoices} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CustomerDuesReport customers={customers} />
        <ExpenseReport expenses={expenses} />
      </div>

      <InventoryReport products={products} />
      <SalesRegister sales={sales} customers={customers} invoices={invoices} />

      <PrintDisclaimer />
    </div>
  )
}
