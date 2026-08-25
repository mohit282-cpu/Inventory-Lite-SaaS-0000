"use client"

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, ShoppingBag, Truck, FileText } from 'lucide-react'
import { Purchase, PurchaseItem, Supplier } from '@/types'
import { purchaseItemService } from '@/services/purchase.service'
import { supplierService } from '@/services/supplier.service'
import { formatMoney } from '@/lib/money'

interface PurchaseDetailDialogProps {
  isOpen: boolean
  onClose: () => void
  purchase: Purchase | null
}

export function PurchaseDetailDialog({ isOpen, onClose, purchase }: PurchaseDetailDialogProps) {
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!purchase || !isOpen) return

    async function loadData() {
      try {
        setLoading(true)
        const [fetchedItems, fetchedSupplier] = await Promise.all([
          purchaseItemService.listPurchaseItems(purchase!.$id, purchase!.businessId).catch(() => []),
          supplierService.getSupplier(purchase!.supplierId, purchase!.businessId).catch(() => null),
        ])
        setItems(fetchedItems)
        setSupplier(fetchedSupplier)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [purchase, isOpen])

  if (!purchase) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl border-slate-200 bg-white text-slate-900 shadow-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0 pb-2 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shrink-0">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold text-slate-900">
                    Purchase Intake — #{purchase.purchaseNumber || purchase.$id}
                  </DialogTitle>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      purchase.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : purchase.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {purchase.status}
                  </span>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Created on {new Date(purchase.purchaseDate || purchase.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            <span>Loading purchase details...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 py-3 scrollbar-thin">
            {/* Supplier & Document Summary Card */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="space-y-1">
                <div className="text-slate-500 flex items-center gap-1 font-medium">
                  <Truck className="h-3.5 w-3.5 text-indigo-600" /> Supplier:
                </div>
                <div className="font-bold text-slate-900">{supplier ? supplier.name : 'Unknown Vendor'}</div>
                {supplier?.phone && <div className="text-slate-500">Phone: {supplier.phone}</div>}
              </div>

              <div className="space-y-1 text-right">
                <div className="text-slate-500 flex items-center gap-1 justify-end font-medium">
                  <FileText className="h-3.5 w-3.5 text-slate-400" /> Supplier Bill #:
                </div>
                <div className="font-mono font-bold text-slate-900">
                  {purchase.supplierInvoiceNumber || 'N/A'}
                </div>
                <div className="text-slate-500">Payment: {purchase.paymentMethod}</div>
              </div>
            </div>

            {/* Purchased Product Items */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-800">Received Line Items ({items.length})</div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items.map((item) => (
                      <tr key={item.$id}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.productNameSnapshot}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">Rs. {formatMoney(item.purchasePrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">Rs. {formatMoney(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Totals Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-bold">Rs. {formatMoney(purchase.subtotal)}</span>
              </div>

              {purchase.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discount:</span>
                  <span className="font-mono text-emerald-700">- Rs. {formatMoney(purchase.discount)}</span>
                </div>
              )}

              {purchase.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax / VAT:</span>
                  <span className="font-mono">+ Rs. {formatMoney(purchase.tax)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-indigo-700">Rs. {formatMoney(purchase.total)}</span>
              </div>

              <div className="flex justify-between text-xs font-bold text-emerald-700">
                <span>Paid Amount:</span>
                <span className="font-mono">Rs. {formatMoney(purchase.paidAmount)}</span>
              </div>

              <div className="flex justify-between text-xs font-bold text-red-600">
                <span>Supplier Due Balance:</span>
                <span className="font-mono">Rs. {formatMoney(purchase.dueAmount)}</span>
              </div>
            </div>

            {purchase.notes && (
              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold">Notes:</span> {purchase.notes}
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
          <Button variant="outline" onClick={onClose} className="font-bold">
            Close Details
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
