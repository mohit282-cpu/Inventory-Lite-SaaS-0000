"use client"

import React from 'react'
import { PaymentAuditRecord } from '@/services/audit-center.service'
import { formatCurrency } from '@/lib/utils'
import { Wallet, ExternalLink, CheckCircle2, XCircle } from 'lucide-react'

interface PaymentAuditTabProps {
  payments: PaymentAuditRecord[]
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

export function PaymentAuditTab({ payments, loading, onDrillDown }: PaymentAuditTabProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  const totalCollected = payments
    .filter((p) => p.entityType === 'customer' && p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPaidOut = payments
    .filter((p) => p.entityType === 'supplier' && p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Customer Collections</div>
          <div className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(totalCollected)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Supplier Disbursements</div>
          <div className="text-lg font-black text-slate-900 mt-1">{formatCurrency(totalPaidOut)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Transactions</div>
          <div className="text-lg font-black text-indigo-600 mt-1">{payments.length}</div>
        </div>
      </div>

      {/* Payment Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-600" />
            Payment Transaction Audit Trail
          </h3>
          <span className="text-xs text-slate-500 font-medium">{payments.length} payment records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Payment ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4">Ref Document</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.id}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{p.date}</td>
                    <td className="py-3 px-4 uppercase font-extrabold text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          p.entityType === 'customer'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {p.entityType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">{p.entityName}</td>
                    <td className="py-3 px-4 font-mono text-indigo-600 font-bold">{p.reference}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">{formatCurrency(p.amount)}</td>
                    <td className="py-3 px-4 capitalize font-medium">{p.method.replace('_', ' ')}</td>
                    <td className="py-3 px-4">
                      {p.status === 'CANCELLED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3" /> CANCELLED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" /> COMPLETED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onDrillDown(`Payment Record - ${p.id}`, p.id, p)}
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
