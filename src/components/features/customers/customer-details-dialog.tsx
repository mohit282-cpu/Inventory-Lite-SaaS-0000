"use client"

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { customerService } from '@/services/customer.service'
import { useAuth } from '@/hooks/use-auth'
import { StatusBadge } from '@/components/ui/status-badge'
import { Customer } from '@/types'
import { User, Phone, Mail, MapPin, ShoppingBag, CreditCard, AlertCircle, Loader2 } from 'lucide-react'

interface CustomerDetailsDialogProps {
  customer: Customer | null
  isOpen: boolean
  onClose: () => void
}

export function CustomerDetailsDialog({
  customer,
  isOpen,
  onClose,
}: CustomerDetailsDialogProps) {
  const { activeBusiness } = useAuth()
  const [summary, setSummary] = useState<{
    totalPurchases: number
    totalPaid: number
    totalDue: number
    sales: any[]
  }>({
    totalPurchases: 0,
    totalPaid: 0,
    totalDue: 0,
    sales: [],
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!customer?.$id || !activeBusiness?.$id || !isOpen) return
    let isMounted = true

    async function loadSummary() {
      try {
        setIsLoading(true)
        const data = await customerService.getCustomerSummary(customer!.$id, activeBusiness!.$id)
        if (isMounted) {
          setSummary({
            totalPurchases: data.totalPurchases,
            totalPaid: data.totalPaid,
            totalDue: data.totalDue,
            sales: data.sales,
          })
        }
      } catch {
        if (isMounted) {
          setSummary({
            totalPurchases: 0,
            totalPaid: 0,
            totalDue: customer?.totalDue || 0,
            sales: [],
          })
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadSummary()
    return () => {
      isMounted = false
    }
  }, [customer, activeBusiness?.$id, isOpen])

  if (!customer) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl border-slate-800 bg-slate-900 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xl shrink-0">
              <User className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">{customer.name}</DialogTitle>
              {customer.panNumber && (
                <div className="text-xs text-slate-400 font-mono mt-0.5">PAN: {customer.panNumber}</div>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mr-2" /> Loading customer history...
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3 text-indigo-400" /> Total Purchases
                </div>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  Rs. {summary.totalPurchases.toFixed(2)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <CreditCard className="h-3 w-3 text-emerald-400" /> Total Paid
                </div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  Rs. {summary.totalPaid.toFixed(2)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-400" /> Outstanding Due
                </div>
                <div className={`text-lg font-bold font-mono mt-1 ${summary.totalDue > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                  Rs. {summary.totalDue.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Contact Details Card */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span className="font-mono">{customer.phone || 'No phone recorded'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>{customer.email || 'No email recorded'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>{customer.address || 'No address recorded'}</span>
              </div>
            </div>

            {/* Recent Sales History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recent Sales History</h4>
              {summary.sales.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6 border border-slate-800 rounded-xl bg-slate-950/40">
                  No previous transactions recorded for this customer.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="bg-slate-950 uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2.5">Order #</th>
                        <th className="px-3 py-2.5">Total</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {summary.sales.map((s) => (
                        <tr key={s.$id}>
                          <td className="px-3 py-2 font-mono font-semibold text-white">{s.saleNumber}</td>
                          <td className="px-3 py-2 font-mono text-emerald-400 font-bold">Rs. {s.totalAmount?.toFixed(2)}</td>
                          <td className="px-3 py-2"><StatusBadge status={s.status} /></td>
                          <td className="px-3 py-2 text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
