"use client"

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, RotateCcw } from 'lucide-react'
import { Sale } from '@/types'
import { saleItemService } from '@/services/sale-item.service'
import { salesReturnService } from '@/services/sales-return.service'
import { formatMoney } from '@/lib/money'

interface SalesReturnDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    saleId: string
    items: Array<{
      saleItemId: string
      productId: string
      quantity: number
      unitPrice?: number
    }>
    reason: string
    refundMethod: 'cash' | 'credit_adjustment' | 'bank_transfer' | 'digital_wallet' | 'other'
  }) => Promise<void>
  sale: Sale | null
  isLoading?: boolean
}

interface ReturnSelection {
  saleItemId: string
  productId: string
  productName: string
  originalQty: number
  allowableQty: number
  unitPrice: number
  returnQty: number
  selected: boolean
}

export function SalesReturnDialog({
  isOpen,
  onClose,
  onSubmit,
  sale,
  isLoading = false,
}: SalesReturnDialogProps) {
  const [returnItems, setReturnItems] = useState<ReturnSelection[]>([])
  const [reason, setReason] = useState<string>('')
  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit_adjustment' | 'bank_transfer' | 'digital_wallet' | 'other'>('cash')
  const [loadingSaleItems, setLoadingSaleItems] = useState<boolean>(false)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (!sale || !isOpen) return

    async function loadItems() {
      try {
        setLoadingSaleItems(true)
        setServerError(null)
        const [saleItems, previousReturns] = await Promise.all([
          saleItemService.listSaleItems(sale!.$id, sale!.businessId),
          salesReturnService.getReturnsForSale(sale!.$id, sale!.businessId).catch(() => []),
        ])

        // Calculate previously returned quantities per item
        const prevReturnedMap = new Map<string, number>()
        for (const ret of previousReturns) {
          try {
            const { salesReturnItemService } = await import('@/services/sales-return.service')
            const retItems = await salesReturnItemService.listReturnItems(ret.$id, sale!.businessId)
            for (const ri of retItems) {
              const curr = prevReturnedMap.get(ri.saleItemId) || 0
              prevReturnedMap.set(ri.saleItemId, curr + ri.quantity)
            }
          } catch {}
        }

        const selections: ReturnSelection[] = saleItems.map((item) => {
          const prevReturned = prevReturnedMap.get(item.$id) || 0
          const allowable = Math.max(0, item.quantity - prevReturned)
          return {
            saleItemId: item.$id,
            productId: item.productId,
            productName: item.productNameSnapshot,
            originalQty: item.quantity,
            allowableQty: allowable,
            unitPrice: item.unitPrice,
            returnQty: allowable > 0 ? 1 : 0,
            selected: allowable > 0,
          }
        })

        setReturnItems(selections)
        setReason('')
        setRefundMethod(sale!.dueAmount > 0 ? 'credit_adjustment' : 'cash')
      } catch (err: any) {
        setServerError(err?.message || 'Failed to load sale item details for return')
      } finally {
        setLoadingSaleItems(false)
      }
    }

    loadItems()
  }, [sale, isOpen])

  if (!sale) return null

  const handleToggleSelect = (saleItemId: string) => {
    setReturnItems((prev) =>
      prev.map((item) => (item.saleItemId === saleItemId ? { ...item, selected: !item.selected } : item))
    )
  }

  const handleQtyChange = (saleItemId: string, val: number) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.saleItemId === saleItemId) {
          const clamped = Math.max(1, Math.min(item.allowableQty, val))
          return { ...item, returnQty: clamped, selected: true }
        }
        return item
      })
    )
  }

  const selectedReturnItems = returnItems.filter((i) => i.selected && i.returnQty > 0)
  const totalReturnAmount = selectedReturnItems.reduce((sum, i) => sum + i.returnQty * i.unitPrice, 0)

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedReturnItems.length === 0) {
      setServerError('Please select at least one item to return')
      return
    }

    if (!reason || reason.trim() === '') {
      setServerError('Please enter a valid return reason')
      return
    }

    try {
      setServerError(null)
      await onSubmit({
        saleId: sale.$id,
        items: selectedReturnItems.map((i) => ({
          saleItemId: i.saleItemId,
          productId: i.productId,
          quantity: i.returnQty,
          unitPrice: i.unitPrice,
        })),
        reason: reason.trim(),
        refundMethod,
      })
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to process sales return')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl border-slate-200 bg-white text-slate-900 shadow-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Process Sales Return — Sale #{sale.saleNumber || sale.$id}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Select returned items to restore inventory stock and process customer financial adjustment.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold my-2 shrink-0">
            {serverError}
          </div>
        )}

        {loadingSaleItems ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
            <span>Loading sale items for return...</span>
          </div>
        ) : (
          <form id="sales-return-form" onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto space-y-4 py-3 scrollbar-thin">
            {/* Sale Items Table */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">Select Returned Items</Label>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">Select</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-2 text-center w-24">Returnable</th>
                      <th className="py-2.5 px-2 w-24">Return Qty</th>
                      <th className="py-2.5 px-3 text-right">Refund Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {returnItems.map((item) => (
                      <tr key={item.saleItemId} className={item.selected ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            disabled={item.allowableQty <= 0}
                            checked={item.selected}
                            onChange={() => handleToggleSelect(item.saleItemId)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                          />
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {item.productName}
                          {item.allowableQty <= 0 && <span className="text-[10px] text-red-500 block font-normal">(Fully returned)</span>}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-600">
                          {item.allowableQty} / {item.originalQty}
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="1"
                            max={item.allowableQty}
                            disabled={!item.selected || item.allowableQty <= 0}
                            value={item.returnQty}
                            onChange={(e) => handleQtyChange(item.saleItemId, parseInt(e.target.value, 10) || 1)}
                            className="h-8 text-xs font-mono bg-white"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {item.selected ? `Rs. ${formatMoney(item.returnQty * item.unitPrice)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Return Reason & Refund Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Return Reason *</Label>
                <Input
                  placeholder="e.g. Defective item, Customer changed mind"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Refund / Adjustment Mode *</Label>
                <Select value={refundMethod} onValueChange={(v: any) => setRefundMethod(v)}>
                  <SelectTrigger className="bg-white text-xs">
                    <SelectValue placeholder="Select refund mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Refund</SelectItem>
                    <SelectItem value="credit_adjustment">Customer Credit/Due Adjustment</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                    <SelectItem value="other">Other Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
              <span className="font-bold text-slate-700">Total Return Refund Value:</span>
              <span className="font-mono font-extrabold text-base text-amber-700">
                Rs. {formatMoney(totalReturnAmount)}
              </span>
            </div>
          </form>
        )}

        <DialogFooter className="pt-3 border-t border-slate-100 shrink-0 flex flex-col-reverse sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="sales-return-form"
            disabled={isLoading || selectedReturnItems.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm Return & Restore Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
