"use client"


import { formatCurrency } from '@/lib/utils'
import { FileText, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'

interface SalesRegisterData {
  rows: Array<{
    id: string
    invoiceNumber: string
    date: string
    customerName: string
    customerPan: string
    taxableAmount: number
    discount: number
    vat: number
    total: number
    paymentStatus: string
    invoiceStatus: string
    createdBy: string
    createdAt: string
    cbmsStatus: string
  }>
  summary: {
    totalInvoices: number
    totalSales: number
    totalDiscount: number
    totalTaxableAmount: number
    totalVat: number
    totalCancelled: number
  }
}

interface SalesRegisterTabProps {
  data: SalesRegisterData | null
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

export function SalesRegisterTab({ data, loading, onDrillDown }: SalesRegisterTabProps) {
  if (loading || !data) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  const { rows, summary } = data

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Invoices</div>
          <div className="text-base font-extrabold text-slate-900 mt-1">{summary.totalInvoices}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total Sales</div>
          <div className="text-base font-extrabold text-indigo-600 mt-1">{formatCurrency(summary.totalSales)}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Taxable Amount</div>
          <div className="text-base font-extrabold text-slate-800 mt-1">{formatCurrency(summary.totalTaxableAmount)}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Total VAT (13%)</div>
          <div className="text-base font-extrabold text-emerald-600 mt-1">{formatCurrency(summary.totalVat)}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Discounts</div>
          <div className="text-base font-extrabold text-amber-600 mt-1">{formatCurrency(summary.totalDiscount)}</div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase">Cancelled</div>
          <div className="text-base font-extrabold text-rose-600 mt-1">{summary.totalCancelled}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            Official Sales Register (Anugaman / Tax Audit View)
          </h3>
          <span className="text-xs text-slate-500 font-medium">Showing {rows.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">PAN</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Discount</th>
                <th className="py-3 px-4 text-right">VAT (13%)</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    No sales recorded for the selected period.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{row.invoiceNumber}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{row.date}</td>
                    <td className="py-3 px-4 font-semibold">{row.customerName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{row.customerPan}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(row.taxableAmount)}</td>
                    <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(row.discount)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatCurrency(row.vat)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">{formatCurrency(row.total)}</td>
                    <td className="py-3 px-4">
                      {row.invoiceStatus === 'cancelled' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3" /> CANCELLED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> ISSUED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onDrillDown(`Invoice Details - ${row.invoiceNumber}`, row.id, row)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Audit Drill Down"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
