"use client"

import { useState } from 'react'
import { PaymentAuditRecord } from '@/services/audit-center.service'
import { formatCurrency } from '@/lib/utils'
import {
  Wallet,
  Eye,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatAuditTimestamp } from '@/lib/audit-formatters'

interface PaymentAuditTabProps {
  payments: PaymentAuditRecord[]
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

function truncatePaymentId(id: string): string {
  if (!id) return '—'
  if (id.length <= 18) return id
  return `${id.slice(0, 14)}...`
}

function formatMethodLabel(method?: string): string {
  if (!method) return 'Cash'
  const m = method.toLowerCase().replace(/_/g, ' ')
  if (m === 'bank transfer') return 'Bank Transfer'
  if (m === 'digital wallet') return 'Digital Wallet'
  if (m === 'full udhaar') return 'Full Udhaar'
  return m.replace(/\b\w/g, (l) => l.toUpperCase())
}

export function PaymentAuditTab({ payments, loading, onDrillDown }: PaymentAuditTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 h-24" />
          ))}
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <div className="h-6 bg-slate-200 rounded w-1/4" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  // Calculate Customer Collections (excludes cancelled)
  const totalCollected = payments
    .filter((p) => p.entityType === 'customer' && p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + p.amount, 0)

  // Calculate Supplier Disbursements (excludes cancelled)
  const totalPaidOut = payments
    .filter((p) => p.entityType === 'supplier' && p.status !== 'CANCELLED')
    .reduce((sum, p) => sum + p.amount, 0)

  const cancelledCount = payments.filter((p) => p.status === 'CANCELLED').length

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Customer Collections */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Customer Collections</span>
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600 tracking-tight">
            {formatCurrency(totalCollected)}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Valid customer payments (excl. cancelled)</p>
        </div>

        {/* Supplier Disbursements */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Supplier Disbursements</span>
            <div className="p-1.5 rounded-md bg-purple-50 text-purple-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {formatCurrency(totalPaidOut)}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Valid vendor payments (excl. cancelled)</p>
        </div>

        {/* Total Transactions */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Transactions</span>
            <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-600 tracking-tight">
            {payments.length}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {cancelledCount > 0 ? `${cancelledCount} cancelled payment record(s)` : 'All records active & verified'}
          </p>
        </div>
      </div>

      {/* Payment Audit Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span>Payment Transaction Audit Trail</span>
          </h3>
          <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-md">
            {payments.length} Payment Records
          </span>
        </div>

        {/* Desktop Payment Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-52">Payment ID</th>
                <th className="py-3 px-4 w-32">Date</th>
                <th className="py-3 px-4 w-28">Type</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4 w-40">Ref Document</th>
                <th className="py-3 px-4 text-right w-36">Amount</th>
                <th className="py-3 px-4 w-32">Method</th>
                <th className="py-3 px-4 w-32">Status</th>
                <th className="py-3 px-4 text-right w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No payment transaction records found.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try adjusting the filter parameters or fiscal year selection.</p>
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isCustomer = p.entityType === 'customer'
                  const isCancelled = p.status === 'CANCELLED'

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Truncated Payment ID with Copy */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1" title={p.id}>
                          <span className="font-bold">{truncatePaymentId(p.id)}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(p.id, e)}
                            className="p-1 hover:bg-slate-200/70 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                            aria-label="Copy payment ID"
                            title="Copy Payment ID"
                          >
                            {copiedId === p.id ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {formatAuditTimestamp(p.date)}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            isCustomer
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {p.entityType}
                        </span>
                      </td>

                      {/* Party Name */}
                      <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                        {p.entityName}
                      </td>

                      {/* Reference Document */}
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        {p.reference}
                      </td>

                      {/* Amount (Right Aligned) */}
                      <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap font-mono text-xs">
                        {formatCurrency(p.amount)}
                      </td>

                      {/* Method */}
                      <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatMethodLabel(p.method)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                            <XCircle className="h-3 w-3 text-red-500" /> CANCELLED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> COMPLETED
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`View payment audit details for ${truncatePaymentId(p.id)}`}
                          onClick={() => onDrillDown(`Payment Record - ${p.id}`, p.id, p)}
                          className="h-7 text-[11px] font-bold gap-1 border-slate-300 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 focus:ring-2 focus:ring-indigo-500 min-h-[32px]"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Payment Cards (md:hidden) */}
        <div className="md:hidden divide-y divide-slate-100">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Info className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No payment transaction records found.</p>
            </div>
          ) : (
            payments.map((p) => {
              const isCustomer = p.entityType === 'customer'
              const isCancelled = p.status === 'CANCELLED'

              return (
                <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                        isCustomer
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-purple-50 text-purple-800 border-purple-200'
                      }`}
                    >
                      {p.entityType}
                    </span>

                    {isCancelled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                        <XCircle className="h-3 w-3 text-red-500" /> CANCELLED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> COMPLETED
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-bold text-sm text-slate-900">{p.entityName}</div>
                    <div className="font-black text-sm text-slate-900 font-mono">{formatCurrency(p.amount)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Ref Doc</span>
                      <span className="font-mono font-bold text-indigo-600">{p.reference}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Method</span>
                      <span className="font-medium text-slate-700">{formatMethodLabel(p.method)}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-between border-t border-slate-200/60 pt-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Date</span>
                      <span className="font-mono text-[11px] text-slate-600">{formatAuditTimestamp(p.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500" title={p.id}>
                      <span>{truncatePaymentId(p.id)}</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyId(p.id, e)}
                        className="p-1 hover:bg-slate-200 text-slate-400 hover:text-indigo-600 rounded"
                        aria-label="Copy payment ID"
                      >
                        {copiedId === p.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`View payment audit details for ${truncatePaymentId(p.id)}`}
                      onClick={() => onDrillDown(`Payment Record - ${p.id}`, p.id, p)}
                      className="h-8 text-xs font-bold gap-1 border-slate-300 text-slate-700 hover:text-indigo-600 min-h-[36px]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Details</span>
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
