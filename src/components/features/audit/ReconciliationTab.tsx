"use client"

import React from 'react'
import { IrdReconciliationItem } from '@/types'
import { ReconciliationCheckResult } from '@/services/audit-center.service'
import { formatCurrency } from '@/lib/utils'
import { FileCheck2, ExternalLink, CheckCircle2, AlertTriangle, Scale } from 'lucide-react'

interface ReconciliationTabProps {
  items: IrdReconciliationItem[]
  checks?: ReconciliationCheckResult[]
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

export function ReconciliationTab({ items, checks = [], loading, onDrillDown }: ReconciliationTabProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Automated System Reconciliation Checks */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Scale className="h-4 w-4 text-indigo-600" />
            Automated Cross-Report Financial Reconciliation Engine
          </h3>
          <span className="text-xs font-bold text-slate-500">Single Source of Truth Audit</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {checks.map((chk) => (
            <div
              key={chk.id}
              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                chk.status === 'BALANCED'
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  : chk.status === 'WARNING'
                  ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                  : 'bg-rose-50/50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold">{chk.checkName}</span>
                {chk.status === 'BALANCED' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> BALANCED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {chk.status}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 font-medium">Expected:</span>
                  <div className="font-bold">{formatCurrency(chk.expected)}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Actual:</span>
                  <div className="font-bold">{formatCurrency(chk.actual)}</div>
                </div>
              </div>

              <p className="text-[11px] font-medium pt-1 border-t border-slate-200/50">{chk.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Reconciliation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-indigo-600" />
            IRD / CBMS Invoice Reconciliation Ledger
          </h3>
          <span className="text-xs text-slate-500 font-medium">{items.length} invoice records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4">Local Status</th>
                <th className="py-3 px-4">IRD CBMS Status</th>
                <th className="py-3 px-4">Reconciliation Notes</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No invoice records found for reconciliation.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">{item.invoiceNumber}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{item.invoiceDate}</td>
                    <td className="py-3 px-4 font-semibold">{item.customerName || 'Walk-in'}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">{formatCurrency(item.totalAmount)}</td>
                    <td className="py-3 px-4 uppercase font-bold text-slate-700">{item.localStatus}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 uppercase font-mono">
                        {item.irdStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">{item.resultMessage}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onDrillDown(`Reconciliation Record - ${item.invoiceNumber}`, item.id, item)}
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
