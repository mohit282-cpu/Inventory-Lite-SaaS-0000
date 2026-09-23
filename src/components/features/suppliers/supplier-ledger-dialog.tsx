"use client"

import { useEffect, useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Truck, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertCircle } from 'lucide-react'
import { Supplier } from '@/types'
import { supplierService, SupplierLedgerEntry } from '@/services/supplier.service'
import { formatMoney } from '@/lib/money'

interface SupplierLedgerDialogProps {
  isOpen: boolean
  onClose: () => void
  supplier: Supplier | null
}

export function SupplierLedgerDialog({ isOpen, onClose, supplier }: SupplierLedgerDialogProps) {
  const [ledger, setLedger] = useState<SupplierLedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLedger = useCallback(async () => {
    if (!supplier || !isOpen) return
    try {
      setLoading(true)
      setError(null)
      const entries = await supplierService.getSupplierLedger(supplier.$id, supplier.businessId)
      setLedger(entries)
    } catch (err: any) {
      setError(err?.message || 'Unable to load supplier ledger history. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [supplier, isOpen])

  useEffect(() => {
    loadLedger()
  }, [loadLedger])

  if (!supplier) return null

  const outstanding = supplier.outstandingPayable || 0
  const hasOutstanding = outstanding > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl w-[95vw] sm:w-full border-slate-200 bg-white text-slate-900 shadow-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900">
                Supplier Ledger — {supplier.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Complete transaction statement & balance history for this vendor.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
          {/* Header Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="text-slate-500 font-medium">Total Purchases</div>
              <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                Rs. {formatMoney(supplier.totalPurchases || 0)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
              <div className="text-emerald-700 font-medium">Total Paid</div>
              <div className="text-sm font-bold font-mono text-emerald-800 mt-0.5">
                Rs. {formatMoney(supplier.totalPaid || 0)}
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs transition-colors ${
              hasOutstanding
                ? 'bg-red-50/70 border-red-200 text-red-900'
                : 'bg-emerald-50/40 border-emerald-200 text-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`font-medium ${hasOutstanding ? 'text-red-700' : 'text-slate-600'}`}>
                  Outstanding Payable
                </span>
                {!hasOutstanding && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                    Settled
                  </span>
                )}
              </div>
              <div className={`text-sm font-bold font-mono mt-0.5 ${hasOutstanding ? 'text-red-800' : 'text-emerald-700'}`}>
                Rs. {formatMoney(outstanding)}
              </div>
            </div>
          </div>

          {/* Main Ledger Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-xl bg-white">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="space-y-1 w-1/3">
                      <div className="h-3 bg-slate-200 rounded w-24"></div>
                      <div className="h-2.5 bg-slate-100 rounded w-16"></div>
                    </div>
                    <div className="h-3 bg-slate-200 rounded w-16"></div>
                    <div className="h-3 bg-slate-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                <p className="text-xs text-red-700 font-semibold">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadLedger}
                  className="text-xs font-bold gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Again
                </Button>
              </div>
            ) : ledger.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-xs text-slate-400 p-6 text-center">
                <Truck className="h-8 w-8 mb-2 text-slate-300 stroke-[1.5]" />
                <span className="font-bold text-slate-600 mb-0.5">No ledger transactions</span>
                <span className="text-slate-400">No purchases or payments have been recorded for this supplier yet.</span>
              </div>
            ) : (
              <>
                {/* Desktop / Tablet Table View (>= 640px) */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 font-bold text-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type / Ref #</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Debit (+Bill)</th>
                        <th className="py-2.5 px-3 text-right">Credit (-Paid)</th>
                        <th className="py-2.5 px-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {ledger.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 font-mono">
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className={`inline-flex items-center gap-1 font-bold ${entry.type === 'PURCHASE' ? 'text-indigo-700' : 'text-emerald-700'}`}>
                              {entry.type === 'PURCHASE' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                              {entry.reference}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 truncate max-w-[200px]" title={entry.description}>
                            {entry.description}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900 font-bold">
                            {entry.debit > 0 ? `Rs. ${formatMoney(entry.debit)}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                            {entry.credit > 0 ? `Rs. ${formatMoney(entry.credit)}` : '—'}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-extrabold ${entry.runningBalance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            Rs. {formatMoney(entry.runningBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View (< 640px) */}
                <div className="block sm:hidden divide-y divide-slate-100">
                  {ledger.map((entry) => (
                    <div key={entry.id} className="p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 font-bold ${entry.type === 'PURCHASE' ? 'text-indigo-700' : 'text-emerald-700'}`}>
                          {entry.type === 'PURCHASE' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                          {entry.reference}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      
                      <div className="text-slate-600 text-[11px] truncate" title={entry.description}>
                        {entry.description}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-50 font-mono">
                        <div className="text-slate-700">
                          {entry.debit > 0 && <span className="font-bold text-slate-900">+Rs. {formatMoney(entry.debit)}</span>}
                          {entry.credit > 0 && <span className="font-bold text-emerald-700">-Rs. {formatMoney(entry.credit)}</span>}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wide mr-1">Bal:</span>
                          <span className={`font-extrabold ${entry.runningBalance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            Rs. {formatMoney(entry.runningBalance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
          <Button variant="outline" onClick={onClose} className="font-bold text-slate-700">
            Close Ledger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

