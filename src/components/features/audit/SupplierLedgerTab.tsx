"use client"

import React from 'react'
import { SupplierLedgerEntry } from '@/services/audit-center.service'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, ExternalLink } from 'lucide-react'

interface SupplierLedgerTabProps {
  ledgers: SupplierLedgerEntry[]
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

export function SupplierLedgerTab({ ledgers, loading, onDrillDown }: SupplierLedgerTabProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  const totalPayable = ledgers.reduce((sum, l) => sum + l.closingPayable, 0)
  const totalOverpayments = ledgers.reduce((sum, l) => sum + l.overpaymentCredit, 0)
  const totalPurchases = ledgers.reduce((sum, l) => sum + l.purchasesTotal, 0)
  const totalPayments = ledgers.reduce((sum, l) => sum + l.paymentsTotal, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Billed by Suppliers</div>
          <div className="text-lg font-black text-slate-900 mt-1">{formatCurrency(totalPurchases)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Paid to Suppliers</div>
          <div className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(totalPayments)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Outstanding Payables</div>
          <div className="text-lg font-black text-red-600 mt-1">{formatCurrency(totalPayable)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Supplier Credit / Overpayments</div>
          <div className="text-lg font-black text-indigo-600 mt-1">{formatCurrency(totalOverpayments)}</div>
        </div>
      </div>

      {/* Supplier Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-red-600" />
            Supplier Accounts Payable Ledger, Overpayments & Aging Analysis
          </h3>
          <span className="text-xs text-slate-500 font-medium">{ledgers.length} supplier accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">PAN</th>
                <th className="py-3 px-4 text-right">Purchases</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Closing Payable</th>
                <th className="py-3 px-4 text-right">Supplier Credit</th>
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
                    No supplier payables recorded.
                  </td>
                </tr>
              ) : (
                ledgers.map((l) => (
                  <tr key={l.supplierId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{l.supplierName}</span>
                        {l.reconciliationStatus === 'OVERPAID' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-100 text-indigo-800 uppercase border border-indigo-200">
                            OVERPAID
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{l.panNumber || 'N/A'}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(l.purchasesTotal)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">{formatCurrency(l.paymentsTotal)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-red-600">{formatCurrency(l.closingPayable)}</td>
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
                        onClick={() => onDrillDown(`Supplier Ledger - ${l.supplierName}`, l.supplierId, l)}
                        className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
