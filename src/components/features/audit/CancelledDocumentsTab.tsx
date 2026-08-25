"use client"

import React from 'react'
import { CancelledDocumentRecord } from '@/services/audit-center.service'
import { formatCurrency } from '@/lib/utils'
import { XCircle, ExternalLink, ShieldAlert } from 'lucide-react'

interface CancelledDocumentsTabProps {
  cancelled: CancelledDocumentRecord[]
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

export function CancelledDocumentsTab({ cancelled, loading, onDrillDown }: CancelledDocumentsTabProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  const totalCancelledValue = cancelled.reduce((sum, c) => sum + c.amount, 0)

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-400" />
          <div>
            <h3 className="text-sm font-extrabold">Cancelled & Voided Document Immutability Audit</h3>
            <p className="text-xs text-slate-300">
              Hard deletes are strictly prohibited. Cancelled invoice numbers remain preserved in sequence history.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold bg-rose-950 text-rose-200 px-3 py-1 rounded-lg border border-rose-800">
          {cancelled.length} Cancelled Docs
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Cancelled Invoice Value</div>
          <div className="text-lg font-black text-rose-600 mt-1">{formatCurrency(totalCancelledValue)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Cancelled Document Count</div>
          <div className="text-lg font-black text-slate-900 mt-1">{cancelled.length}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-rose-600" />
            Cancelled Invoices & Voided Documents Audit Log
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Original Ref #</th>
                <th className="py-3 px-4">Doc Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Cancellation Reason</th>
                <th className="py-3 px-4">Cancelled By</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {cancelled.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No cancelled documents recorded.
                  </td>
                </tr>
              ) : (
                cancelled.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 line-through text-rose-700">
                      {c.originalNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-600">{c.documentType}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{c.date}</td>
                    <td className="py-3 px-4 font-semibold">{c.partyName}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">{formatCurrency(c.amount)}</td>
                    <td className="py-3 px-4 font-medium text-rose-800 bg-rose-50/50 p-2 rounded">{c.reason}</td>
                    <td className="py-3 px-4 text-slate-600">{c.cancelledBy}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onDrillDown(`Cancelled Doc - ${c.originalNumber}`, c.id, c)}
                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
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
