"use client"


import { AuditOverviewKPIs } from '@/services/audit-center.service'
import { formatCurrency } from '@/lib/utils'
import {
  ShoppingCart,
  Receipt,
  ShoppingBag,
  RotateCcw,
  Percent,
  Wallet,
  Building2,
  Boxes,
  TrendingUp,
  CreditCard,
  DollarSign,
  Info,
} from 'lucide-react'

interface AuditOverviewTabProps {
  kpis: AuditOverviewKPIs | null
  loading: boolean
  onSelectTab: (tabId: string) => void
}

export function AuditOverviewTab({ kpis, loading, onSelectTab }: AuditOverviewTabProps) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 animate-pulse">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="h-32 bg-slate-200/80 rounded-xl" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      id: 'sales-register',
      label: 'Total Sales',
      value: formatCurrency(kpis.totalSales),
      subtext: `${kpis.totalSalesCount} total sales recorded`,
      icon: ShoppingCart,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      tooltip: 'Gross value of all completed sales in selected period.',
      action: () => onSelectTab('sales'),
    },
    {
      id: 'sales-register-bills',
      label: 'Total Bills Issued',
      value: kpis.totalBills.toString(),
      subtext: 'Invoice document count',
      icon: Receipt,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      tooltip: 'Total count of customer sales invoices generated.',
      action: () => onSelectTab('sales'),
    },
    {
      id: 'purchase-register',
      label: 'Total Purchases',
      value: formatCurrency(kpis.totalPurchases),
      subtext: `${kpis.totalPurchaseCount} supplier bills`,
      icon: ShoppingBag,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
      tooltip: 'Total cost of goods & stock purchased from suppliers.',
      action: () => onSelectTab('purchases'),
    },
    {
      id: 'purchase-returns',
      label: 'Purchase Returns',
      value: formatCurrency(kpis.purchaseReturns),
      subtext: 'Debit note / return adjustments',
      icon: RotateCcw,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      tooltip: 'Total stock returned to suppliers.',
      action: () => onSelectTab('returns'),
    },
    {
      id: 'sales-returns',
      label: 'Sales Returns',
      value: formatCurrency(kpis.salesReturns),
      subtext: 'Customer credit notes issued',
      icon: RotateCcw,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      tooltip: 'Total customer refunds & credit notes.',
      action: () => onSelectTab('returns'),
    },
    {
      id: 'output-vat',
      label: 'Output VAT (Collected)',
      value: formatCurrency(kpis.outputVat),
      subtext: '13% tax collected from sales',
      icon: Percent,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      tooltip: 'Output VAT collected on customer sales.',
      action: () => onSelectTab('vat'),
    },
    {
      id: 'input-vat',
      label: 'Input VAT (Claimable)',
      value: formatCurrency(kpis.inputVat),
      subtext: '13% tax paid on purchases',
      icon: Percent,
      color: 'text-teal-600 bg-teal-50 border-teal-100',
      tooltip: 'Input VAT eligible to credit against Output VAT.',
      action: () => onSelectTab('vat'),
    },
    {
      id: 'net-vat',
      label: 'Net VAT Position',
      value: formatCurrency(kpis.netVatPosition),
      subtext: 'Output VAT minus Input VAT',
      icon: Wallet,
      color: 'text-sky-600 bg-sky-50 border-sky-100',
      tooltip: 'Net tax payable to tax office for the period.',
      action: () => onSelectTab('vat'),
    },
    {
      id: 'customer-credit',
      label: 'Outstanding Customer Credit',
      value: formatCurrency(kpis.outstandingCustomerCredit),
      subtext: 'Total Udhar due from customers',
      icon: Building2,
      color: 'text-orange-600 bg-orange-50 border-orange-100',
      tooltip: 'Total unpaid balances owed by customers.',
      action: () => onSelectTab('customers'),
    },
    {
      id: 'supplier-payables',
      label: 'Supplier Payables',
      value: formatCurrency(kpis.supplierPayables),
      subtext: 'Outstanding supplier bills',
      icon: CreditCard,
      color: 'text-red-600 bg-red-50 border-red-100',
      tooltip: 'Total pending amounts owed to suppliers.',
      action: () => onSelectTab('suppliers'),
    },
    {
      id: 'stock-value',
      label: 'Stock Asset Value',
      value: formatCurrency(kpis.stockValue),
      subtext: 'Inventory at cost price',
      icon: Boxes,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
      tooltip: 'Total cost value of current on-hand inventory.',
      action: () => onSelectTab('inventory'),
    },
    {
      id: 'cogs',
      label: 'Cost of Goods Sold (COGS)',
      value: formatCurrency(kpis.cogs),
      subtext: 'Direct cost of sold items',
      icon: DollarSign,
      color: 'text-slate-700 bg-slate-100 border-slate-200',
      tooltip: 'COGS = Sum of (unit cost × quantity sold).',
      action: () => onSelectTab('profitability'),
    },
    {
      id: 'gross-profit',
      label: 'Gross Profit',
      value: formatCurrency(kpis.grossProfit),
      subtext: 'Net Sales minus COGS',
      icon: TrendingUp,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      tooltip: 'Gross Profit = Net Sales − COGS.',
      action: () => onSelectTab('profitability'),
    },
    {
      id: 'expenses',
      label: 'Operating Expenses',
      value: formatCurrency(kpis.expenses),
      subtext: 'Rent, utilities, staff & admin',
      icon: Receipt,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      tooltip: 'Total recorded operational business expenses.',
      action: () => onSelectTab('profitability'),
    },
    {
      id: 'net-profit',
      label: 'Net Profit',
      value: formatCurrency(kpis.netProfit),
      subtext: 'Gross Profit minus Expenses',
      icon: TrendingUp,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      tooltip: 'Net Profit = Gross Profit − Operating Expenses.',
      action: () => onSelectTab('profitability'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-xl bg-indigo-950 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            Audit Overview & Financial Command Center
          </h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            Click any KPI card to drill down into line-item transaction evidence.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-indigo-900/80 px-3 py-1.5 rounded-lg border border-indigo-800">
          <Info className="h-4 w-4 text-indigo-400" />
          <span>Tenant Isolation Enforced</span>
        </div>
      </div>

      {/* Grid of 15 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.id}
              onClick={card.action}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-600 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg border shrink-0 ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className="text-lg font-black text-slate-900 tracking-tight">{card.value}</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">{card.subtext}</div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-indigo-500 font-semibold">
                <span>View Details</span>
                <span>→</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
