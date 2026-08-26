"use client"


import { formatCurrency } from '@/lib/utils'
import { ShoppingBag, ExternalLink } from 'lucide-react'

interface PurchaseRegisterData {
  rows: Array<{
    id: string
    purchaseReference: string
    date: string
    supplierName: string
    supplierPan: string
    taxableAmount: number
    vatAmount: number
    total: number
    paymentStatus: string
    returnStatus: string
    createdBy: string
    createdAt: string
  }>
  summary: {
    totalPurchases: number
    taxablePurchases: number
    inputVat: number
    purchaseReturns: number
    netPurchases: number
  }
}

interface PurchaseRegisterTabProps {
  data: PurchaseRegisterData | null
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

export function PurchaseRegisterTab({ data, loading, onDrillDown }: PurchaseRegisterTabProps) {
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Purchases</div>
          <div className="text-lg font-black text-purple-600 mt-1">{formatCurrency(summary.totalPurchases)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Taxable Purchases</div>
          <div className="text-lg font-black text-slate-800 mt-1">{formatCurrency(summary.taxablePurchases)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Claimable Input VAT</div>
          <div className="text-lg font-black text-teal-600 mt-1">{formatCurrency(summary.inputVat)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Net Purchase Book</div>
          <div className="text-lg font-black text-slate-900 mt-1">{formatCurrency(summary.netPurchases)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-purple-600" />
            Official Purchase Register (Kharid Khata)
          </h3>
          <span className="text-xs text-slate-500 font-medium">Showing {rows.length} purchase records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Ref / Bill #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">PAN</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Input VAT (13%)</th>
                <th className="py-3 px-4 text-right">Total Bill</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No purchase records found for the selected period.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">{row.purchaseReference}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{row.date}</td>
                    <td className="py-3 px-4 font-semibold">{row.supplierName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{row.supplierPan}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(row.taxableAmount)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-teal-600">{formatCurrency(row.vatAmount)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">{formatCurrency(row.total)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 uppercase">
                        {row.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onDrillDown(`Purchase Details - ${row.purchaseReference}`, row.id, row)}
                        className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
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
