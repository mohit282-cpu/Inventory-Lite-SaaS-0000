"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Invoice } from '@/types'
import { creditNoteService } from '@/services/credit-note.service'
import { formatCurrency } from '@/lib/utils'
import { Loader2, FileText, AlertCircle } from 'lucide-react'

export interface CreditNoteDialogProps {
  isOpen: boolean
  onClose: () => void
  invoice: Invoice
  businessId: string
  userId: string
  onSuccess?: () => void
}

export function CreditNoteDialog({
  isOpen,
  onClose,
  invoice,
  businessId,
  userId,
  onSuccess,
}: CreditNoteDialogProps) {
  const [reason, setReason] = useState('')
  const [taxableAmount, setTaxableAmount] = useState<string>('')
  const [adjustCustomerDue, setAdjustCustomerDue] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedTaxable = parseFloat(taxableAmount) || 0
  const calculatedVat = parsedTaxable * 0.13
  const calculatedTotal = parsedTaxable + calculatedVat

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!reason.trim()) {
      setError('Please enter a reason for issuing this Credit Note.')
      return
    }

    if (parsedTaxable <= 0) {
      setError('Please enter a valid taxable amount greater than zero.')
      return
    }

    if (parsedTaxable > (invoice.total || 0)) {
      setError(`Taxable amount cannot exceed the original invoice total of ${formatCurrency(invoice.total || 0)}.`)
      return
    }

    try {
      setIsSubmitting(true)
      await creditNoteService.createCreditNote(
        {
          invoiceId: invoice.$id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          reason: reason.trim(),
          taxableAmount: parsedTaxable,
          vatAmount: calculatedVat,
          adjustCustomerDue,
        },
        businessId,
        userId
      )

      setIsSubmitting(false)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err: any) {
      console.error('[CreditNoteDialog] Error issuing Credit Note:', err)
      setError(err?.message || 'Failed to issue Credit Note.')
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-900">
            <FileText className="h-5 w-5 text-indigo-600" /> Issue Credit Note
          </DialogTitle>
          <p className="text-xs text-slate-500 font-mono">
            Invoice #{invoice.invoiceNumber} | Customer: {invoice.customerName || 'Walk-in'}
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
            <Label htmlFor="cn-reason" className="text-xs font-semibold">
              Reason / Adjustment Description <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="cn-reason"
              placeholder="e.g. Price adjustment, discount post-invoice, or goods damaged in transit"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cn-taxable" className="text-xs font-semibold">
              Taxable Adjustment Amount (Rs.) <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="cn-taxable"
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
              <div className="flex justify-between text-indigo-700">
                <span>Output VAT Adjustment (13%):</span>
                <span>{formatCurrency(calculatedVat)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Credit Note Amount:</span>
                <span>{formatCurrency(calculatedTotal)}</span>
              </div>
            </div>
          )}

          {invoice.customerId && (
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="adjust-due"
                checked={adjustCustomerDue}
                onChange={(e) => setAdjustCustomerDue(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="adjust-due" className="text-xs text-slate-700 font-medium cursor-pointer">
                Automatically reduce Customer Outstanding Due balance
              </label>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs bg-indigo-600 hover:bg-indigo-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Issuing...
                </>
              ) : (
                'Issue Credit Note'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
