"use client"

import dynamic from 'next/dynamic'
import { ExecutiveSummary } from '../ExecutiveSummary'
import type { MonthlyData } from '../MonthlyFinancialSummary'

const MonthlyFinancialSummary = dynamic(
  () => import('../MonthlyFinancialSummary').then((m) => m.MonthlyFinancialSummary),
  { ssr: false, loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl" /> }
)
import { SalesRegister } from '../SalesRegister'
import { ReconciliationReport } from '../ReconciliationReport'
import { CustomerDuesReport } from '../CustomerDuesReport'
import { InventoryReport } from '../InventoryReport'
import { ExpenseReport } from '../ExpenseReport'
import { AuditHealth } from '../AuditHealth'
import { PrintDisclaimer } from '../PrintDisclaimer'
import { PurchaseRegister } from '../PurchaseRegister'
import { TaxVatSummary } from '../TaxVatSummary'
import { Sale, Customer, Expense, Invoice, Product, Purchase, Supplier, CreditNote, DebitNote } from '@/types'
import { ProfitEstimateReport, PaymentMethodPoint } from '@/services/analytics.service'
import { ShieldCheck } from 'lucide-react'

export interface AccountantReportViewProps {
  sales: Sale[]
  products: Product[]
  customers: Customer[]
  expenses: Expense[]
  invoices: Invoice[]
  purchases?: Purchase[]
  suppliers?: Supplier[]
  creditNotes?: CreditNote[]
  debitNotes?: DebitNote[]
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
  purchases = [],
  suppliers = [],
  creditNotes = [],
  debitNotes = [],
  profitReport,
  monthlyData,
  paymentMethods,
  dateRange,
}: AccountantReportViewProps) {
  const hasCostDataError = profitReport.hasCostDataError

  // Sales calculations
  const salesTotal = sales.reduce((acc, sale) => acc + (sale.total || 0), 0)
  const collectedTotal = sales.reduce((acc, sale) => acc + (sale.paidAmount || 0), 0)
  const outstandingTotal = sales.reduce((acc, sale) => acc + (sale.dueAmount || 0), 0)

  // Tax calculations
  const salesTaxable = sales.reduce((acc, sale) => acc + (sale.subtotal || sale.total || 0), 0)
  const outputVat = sales.reduce((acc, sale) => acc + (sale.tax || 0), 0)
  const purchasesTaxable = purchases.reduce((acc, p) => acc + (p.subtotal || p.totalAmount || 0), 0)
  const inputVat = purchases.reduce((acc, p) => acc + (p.taxAmount || 0), 0)
  const cnVatAdj = creditNotes.reduce((acc, cn) => acc + (cn.vatAmount || 0), 0)
  const dnVatAdj = debitNotes.reduce((acc, dn) => acc + (dn.vatAmount || 0), 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Accountant Mode Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Accountant & Audit View</h2>
              <span className="bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 text-[11px] font-bold px-2 py-0.5 rounded">
                Full Audit Trail
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Exposes complete reconciliation details, exact transaction references, invoice sequences, duplicate checks, and exportable ledgers for audit compliance.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono bg-slate-800 px-3 py-1.5 rounded border border-slate-700 shrink-0">
          Period: {dateRange.label}
        </div>
      </div>

      {/* 1. Executive Summary */}
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
          hasCostDataError,
        }}
      />

      {/* 2. Basic Tax & VAT Summary */}
      <TaxVatSummary
        salesTaxable={salesTaxable}
        outputVat={outputVat}
        purchasesTaxable={purchasesTaxable}
        inputVat={inputVat}
        creditNoteVatAdjustments={cnVatAdj}
        debitNoteVatAdjustments={dnVatAdj}
      />

      {/* 3. Audit Health & Reconciliation */}
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

      {/* 4. Customer Dues & Expenses */}
      <div className="grid gap-6 md:grid-cols-2">
        <CustomerDuesReport customers={customers} />
        <ExpenseReport expenses={expenses} />
      </div>

      {/* 5. Inventory Valuation, Sales Register & Purchase Register */}
      <InventoryReport products={products} />
      <SalesRegister sales={sales} customers={customers} invoices={invoices} />
      <PurchaseRegister purchases={purchases} suppliers={suppliers} />

      <PrintDisclaimer />
    </div>
  )
}
