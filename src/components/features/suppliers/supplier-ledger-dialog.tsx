"use client"

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, FileSpreadsheet, Truck, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
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

  useEffect(() => {
    if (!supplier || !isOpen) return

    async function loadLedger() {
      try {
        setLoading(true)
        setError(null)
        const entries = await supplierService.getSupplierLedger(supplier!.$id, supplier!.businessId)
        setLedger(entries)
      } catch (err: any) {
        setError(err?.message || 'Failed to load supplier ledger history')
      } finally {
        setLoading(false)
      }
    }

    loadLedger()
  }, [supplier, isOpen])

  if (!supplier) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl border-slate-200 bg-white text-slate-900 shadow-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0 pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shrink-0">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Supplier Ledger — {supplier.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Complete transaction statement & balance history.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Header Summary Cards */}
        <div className="grid grid-cols-3 gap-3 my-3 shrink-0">
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
          <div className="p-3 rounded-xl bg-red-50/70 border border-red-200 text-xs">
            <div className="text-red-700 font-medium">Outstanding Payable</div>
            <div className="text-sm font-bold font-mono text-red-800 mt-0.5">
              Rs. {formatMoney(supplier.outstandingPayable || 0)}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-xl">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-xs text-slate-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              <span>Loading supplier ledger history...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-red-600 bg-red-50 font-medium text-center">
              {error}
            </div>
          ) : ledger.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-xs text-slate-400">
              <Truck className="h-8 w-8 mb-2 stroke-[1.5]" />
              <span>No purchases or payments recorded for this supplier yet.</span>
            </div>
          ) : (
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
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-red-600">
                      Rs. {formatMoney(entry.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pt-3 flex justify-end shrink-0">
          <Button variant="outline" onClick={onClose} className="font-bold">
            Close Ledger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
