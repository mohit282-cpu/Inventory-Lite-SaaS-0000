"use client"

import React from 'react'
import { CustomerLedgerEntry } from '@/services/audit-center.service'
import { formatCurrency } from '@/lib/utils'
import { Building2, ExternalLink } from 'lucide-react'

interface CustomerLedgerTabProps {
  ledgers: CustomerLedgerEntry[]
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

export function CustomerLedgerTab({ ledgers, loading, onDrillDown }: CustomerLedgerTabProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  const totalOutstanding = ledgers.reduce((sum, l) => sum + l.closingBalance, 0)
  const totalOverpayments = ledgers.reduce((sum, l) => sum + l.overpaymentCredit, 0)
  const totalInvoices = ledgers.reduce((sum, l) => sum + l.invoicesTotal, 0)
  const totalPayments = ledgers.reduce((sum, l) => sum + l.paymentsTotal, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Invoiced to Customers</div>
          <div className="text-lg font-black text-slate-900 mt-1">{formatCurrency(totalInvoices)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Customer Payments</div>
          <div className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(totalPayments)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Outstanding Receivables (Udhar)</div>
          <div className="text-lg font-black text-orange-600 mt-1">{formatCurrency(totalOutstanding)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Customer Credit / Overpayments</div>
          <div className="text-lg font-black text-indigo-600 mt-1">{formatCurrency(totalOverpayments)}</div>
        </div>
      </div>

      {/* Customer Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-orange-600" />
            Customer Receivables Ledger, Overpayments & Aging Analysis
          </h3>
          <span className="text-xs text-slate-500 font-medium">{ledgers.length} customer records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">PAN</th>
                <th className="py-3 px-4 text-right">Invoiced</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Closing Receivable</th>
                <th className="py-3 px-4 text-right">Customer Credit</th>
                <th className="py-3 px-4 text-right">0-30 Days</th>
                <th className="py-3 px-4 text-right">31-60 Days</th>
                <th className="py-3 px-4 text-right">61-90 Days</th>
                <th className="py-3 px-4 text-right text-rose-600">90+ Days</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {ledgers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    No customer receivables recorded.
                  </td>
                </tr>
              ) : (
                ledgers.map((l) => (
                  <tr key={l.customerId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{l.customerName}</span>
                        {l.reconciliationStatus === 'OVERPAID' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-100 text-indigo-800 uppercase border border-indigo-200">
                            OVERPAID
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{l.panNumber || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(l.invoicesTotal)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">{formatCurrency(l.paymentsTotal)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-orange-600">{formatCurrency(l.closingBalance)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-indigo-600">
                      {l.overpaymentCredit > 0 ? formatCurrency(l.overpaymentCredit) : 'Rs. 0.00'}
                    </td>
                    <td className="py-3 px-4 text-right">{formatCurrency(l.aging.days0To30)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(l.aging.days31To60)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(l.aging.days61To90)}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">{formatCurrency(l.aging.days90Plus)}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onDrillDown(`Customer Ledger - ${l.customerName}`, l.customerId, l)}
                        className="p-1 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
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
