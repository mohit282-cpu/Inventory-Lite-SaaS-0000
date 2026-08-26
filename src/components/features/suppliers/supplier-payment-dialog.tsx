"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supplierPaymentSchema, SupplierPaymentInput } from '@/lib/validations'
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
import { Loader2, DollarSign } from 'lucide-react'
import { Supplier } from '@/types'
import { formatMoney } from '@/lib/money'

interface SupplierPaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: SupplierPaymentInput) => Promise<void>
  supplier: Supplier | null
  isLoading?: boolean
}

export function SupplierPaymentDialog({
  isOpen,
  onClose,
  onSubmit,
  supplier,
  isLoading = false,
}: SupplierPaymentDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<SupplierPaymentInput>({
    resolver: zodResolver(supplierPaymentSchema) as any,
    defaultValues: {
      supplierId: supplier?.$id || '',
      amount: supplier?.outstandingPayable || 0,
      paymentMethod: 'cash',
      referenceNumber: '',
      notes: '',
    },
  })

  const selectedPaymentMethod = watch('paymentMethod')

  useEffect(() => {
    if (supplier) {
      reset({
        supplierId: supplier.$id,
        amount: supplier.outstandingPayable > 0 ? supplier.outstandingPayable : 0,
        paymentMethod: 'cash',
        referenceNumber: '',
        notes: '',
      })
    }
    setServerError(null)
  }, [supplier, isOpen, reset])

  const handleFormSubmit = async (data: SupplierPaymentInput) => {
    try {
      setServerError(null)
      await onSubmit(data)
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to record supplier payment')
    }
  }

  if (!supplier) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-slate-200 bg-white text-slate-900 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Record Supplier Payment</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Pay vendor balance for {supplier.name}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
            {serverError}
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Supplier:</span>
            <span className="font-bold text-slate-900">{supplier.name}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Outstanding Payable Balance:</span>
            <span className="font-mono font-bold text-red-600">
              Rs. {formatMoney(supplier.outstandingPayable || 0)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Payment Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-bold text-slate-700">Payment Amount (NPR) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="font-mono text-base font-bold"
              {...register('amount')}
            />
            {errors.amount && <p className="text-xs text-red-600 font-medium">{errors.amount.message}</p>}
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod" className="text-xs font-bold text-slate-700">Payment Method *</Label>
            <Select
              value={selectedPaymentMethod}
              onValueChange={(val) => setValue('paymentMethod', val as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer / Cheque</SelectItem>
                <SelectItem value="eSewa">eSewa</SelectItem>
                <SelectItem value="Khalti">Khalti</SelectItem>
                <SelectItem value="card">Card Payment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reference # */}
          <div className="space-y-1.5">
            <Label htmlFor="referenceNumber" className="text-xs font-bold text-slate-700">Reference / Cheque # (Optional)</Label>
            <Input
              id="referenceNumber"
              placeholder="e.g. Bank Ref # / Cheque # 998822"
              className="font-mono"
              {...register('referenceNumber')}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-bold text-slate-700">Payment Notes (Optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. Partial payment for PO-881"
              {...register('notes')}
            />
          </div>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
