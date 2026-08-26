"use client"


import { ReturnsAdjustmentsRecord } from '@/services/audit-center.service'
import { formatCurrency } from '@/lib/utils'
import { RotateCcw, ExternalLink } from 'lucide-react'

interface ReturnsAdjustmentsTabProps {
  records: ReturnsAdjustmentsRecord[]
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

export function ReturnsAdjustmentsTab({ records, loading, onDrillDown }: ReturnsAdjustmentsTabProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  const totalValue = records.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Returns & Adjustments</div>
          <div className="text-lg font-black text-rose-600 mt-1">{formatCurrency(totalValue)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Adjustment Events</div>
          <div className="text-lg font-black text-slate-900 mt-1">{records.length} events</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-rose-600" />
            Returns, Credit Notes & Stock Adjustments Log
          </h3>
          <span className="text-xs text-slate-500 font-medium">{records.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Ref Document</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Stock Impact</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No returns or adjustment records found.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{r.originalDocumentNumber}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{r.date}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 uppercase">
                        {r.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">{formatCurrency(r.amount)}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{r.reason}</td>
                    <td className="py-3 px-4 text-slate-600">{r.user}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600">{r.stockImpact}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onDrillDown(`Adjustment Record - ${r.id}`, r.id, r)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
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
