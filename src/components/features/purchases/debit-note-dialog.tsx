"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Purchase } from '@/types'
import { debitNoteService } from '@/services/debit-note.service'
import { formatCurrency } from '@/lib/utils'
import { Loader2, FileMinus, AlertCircle } from 'lucide-react'

export interface DebitNoteDialogProps {
  isOpen: boolean
  onClose: () => void
  purchase: Purchase
  supplierName?: string
  businessId: string
  userId: string
  onSuccess?: () => void
}

export function DebitNoteDialog({
  isOpen,
  onClose,
  purchase,
  supplierName,
  businessId,
  userId,
  onSuccess,
}: DebitNoteDialogProps) {
  const [reason, setReason] = useState('')
  const [taxableAmount, setTaxableAmount] = useState<string>('')
  const [adjustSupplierBalance, setAdjustSupplierBalance] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedTaxable = parseFloat(taxableAmount) || 0
  const calculatedVat = parsedTaxable * 0.13
  const calculatedTotal = parsedTaxable + calculatedVat

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!reason.trim()) {
      setError('Please enter a reason for issuing this Debit Note.')
      return
    }

    if (parsedTaxable <= 0) {
      setError('Please enter a valid taxable amount greater than zero.')
      return
    }

    if (parsedTaxable > (purchase.totalAmount || 0)) {
      setError(`Taxable amount cannot exceed the original purchase total of ${formatCurrency(purchase.totalAmount || 0)}.`)
      return
    }

    try {
      setIsSubmitting(true)
      await debitNoteService.createDebitNote(
        {
          purchaseId: purchase.$id,
          supplierId: purchase.supplierId,
          supplierName: supplierName || '',
          reason: reason.trim(),
          taxableAmount: parsedTaxable,
          vatAmount: calculatedVat,
          adjustSupplierBalance,
        },
        businessId,
        userId
      )

      setIsSubmitting(false)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err: any) {
      console.error('[DebitNoteDialog] Error issuing Debit Note:', err)
      setError(err?.message || 'Failed to issue Debit Note.')
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-900">
            <FileMinus className="h-5 w-5 text-amber-600" /> Issue Debit Note
          </DialogTitle>
          <p className="text-xs text-slate-500 font-mono">
            Purchase Bill #{purchase.supplierBillNumber || purchase.purchaseNumber || purchase.$id.slice(-6)} | Supplier: {supplierName || 'Direct'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="dn-reason" className="text-xs font-semibold">
              Reason / Purchase Return Description <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="dn-reason"
              placeholder="e.g. Return of damaged stock to supplier or purchase price discount adjustment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="dn-taxable" className="text-xs font-semibold">
              Taxable Adjustment Amount (Rs.) <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="dn-taxable"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={taxableAmount}
              onChange={(e) => setTaxableAmount(e.target.value)}
              className="font-mono text-xs"
              required
            />
          </div>

          {parsedTaxable > 0 && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount:</span>
                <span>{formatCurrency(parsedTaxable)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Input VAT Adjustment (13%):</span>
                <span>{formatCurrency(calculatedVat)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Debit Note Amount:</span>
                <span>{formatCurrency(calculatedTotal)}</span>
              </div>
            </div>
          )}

          {purchase.supplierId && (
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="adjust-supplier-balance"
                checked={adjustSupplierBalance}
                onChange={(e) => setAdjustSupplierBalance(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="adjust-supplier-balance" className="text-xs text-slate-700 font-medium cursor-pointer">
                Automatically reduce Supplier Outstanding Payable balance
              </label>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Issuing...
                </>
              ) : (
                'Issue Debit Note'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
