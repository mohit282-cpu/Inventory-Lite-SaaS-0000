"use client"

import React, { useState } from 'react'
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
import { Loader2, ShieldAlert } from 'lucide-react'
import { Sale } from '@/types'
import { formatMoney } from '@/lib/money'

interface CancelSaleDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (saleId: string, reason: string) => Promise<void>
  sale: Sale | null
  isLoading?: boolean
}

export function CancelSaleDialog({
  isOpen,
  onClose,
  onSubmit,
  sale,
  isLoading = false,
}: CancelSaleDialogProps) {
  const [reason, setReason] = useState<string>('')
  const [serverError, setServerError] = useState<string | null>(null)

  if (!sale) return null

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason || reason.trim().length < 3) {
      setServerError('Please provide a mandatory cancellation reason (at least 3 characters)')
      return
    }

    try {
      setServerError(null)
      await onSubmit(sale.$id, reason.trim())
      setReason('')
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to cancel bill transaction')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-red-200 bg-white text-slate-900 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center justify-center font-bold shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Cancel / Void Bill — #{sale.saleNumber || sale.$id}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Restricted Owner/Admin Action: Void bill and reverse stock & due balances.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
            {serverError}
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-200 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-700">
            <span>Bill Amount:</span>
            <span className="font-mono font-bold text-slate-900">Rs. {formatMoney(sale.total)}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Paid Amount:</span>
            <span className="font-mono font-bold text-emerald-700">Rs. {formatMoney(sale.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Remaining Due:</span>
            <span className="font-mono font-bold text-red-600">Rs. {formatMoney(sale.dueAmount)}</span>
          </div>
          <div className="pt-1.5 border-t border-red-200 text-[11px] text-red-800 font-medium">
            ⚠️ This will reverse item stock quantities into inventory, adjust customer due balances, and log an audit trail event. Original bill document remains historically visible.
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cancellationReason" className="text-xs font-bold text-slate-800">
              Reason for Bill Cancellation *
            </Label>
            <Input
              id="cancellationReason"
              placeholder="e.g. Wrong items billed, Duplicate transaction, Payment failed"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-white text-xs"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || reason.trim().length < 3}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Bill Void / Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
