"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supplierSchema, SupplierInput } from '@/lib/validations'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Truck } from 'lucide-react'
import { Supplier } from '@/types'

interface SupplierDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: SupplierInput) => Promise<void>
  supplier?: Supplier | null
  isLoading?: boolean
}

export function SupplierDialog({
  isOpen,
  onClose,
  onSubmit,
  supplier = null,
  isLoading = false,
}: SupplierDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      panVatNumber: '',
      notes: '',
      status: 'active',
    },
  })

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        panVatNumber: supplier.panVatNumber || '',
        notes: supplier.notes || '',
        status: supplier.status || 'active',
      })
    } else {
      reset({
        name: '',
        phone: '',
        email: '',
        address: '',
        panVatNumber: '',
        notes: '',
        status: 'active',
      })
    }
    setServerError(null)
  }, [supplier, isOpen, reset])

  const handleFormSubmit = async (data: SupplierInput) => {
    try {
      setServerError(null)
      await onSubmit(data)
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save supplier details')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isLoading) onClose() }}>
      <DialogContent className="max-w-lg w-[95vw] sm:max-w-md border-slate-200 bg-white text-slate-900 shadow-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900">
                {supplier ? 'Edit Supplier' : 'Add New Supplier'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {supplier ? 'Update supplier information and contact details.' : 'Register a new vendor/supplier for stock purchasing.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4">
          {serverError && (
            <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold" role="alert">
              {serverError}
            </div>
          )}

          {/* Supplier Name */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-name" className="text-xs font-bold text-slate-700">Supplier / Firm Name *</Label>
            <Input
              id="supplier-name"
              placeholder="e.g. Kathmandu Traders Pvt. Ltd."
              disabled={isLoading}
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-600 font-medium" role="alert">{errors.name.message}</p>}
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="supplier-phone" className="text-xs font-bold text-slate-700">Phone Number</Label>
              <Input
                id="supplier-phone"
                type="tel"
                inputMode="tel"
                placeholder="e.g. 9841234567"
                disabled={isLoading}
                {...register('phone')}
              />
              {errors.phone && <p className="text-xs text-red-600 font-medium" role="alert">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supplier-email" className="text-xs font-bold text-slate-700">Email Address</Label>
              <Input
                id="supplier-email"
                type="email"
                placeholder="vendor@company.com"
                disabled={isLoading}
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-600 font-medium" role="alert">{errors.email.message}</p>}
            </div>
          </div>

          {/* PAN / VAT Number */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-pan" className="text-xs font-bold text-slate-700">PAN / VAT Number (Optional)</Label>
            <Input
              id="supplier-pan"
              placeholder="e.g. 601234567"
              className="font-mono"
              disabled={isLoading}
              {...register('panVatNumber')}
            />
            {errors.panVatNumber && <p className="text-xs text-red-600 font-medium" role="alert">{errors.panVatNumber.message}</p>}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-address" className="text-xs font-bold text-slate-700">Address / Location</Label>
            <Input
              id="supplier-address"
              placeholder="e.g. New Road, Kathmandu"
              disabled={isLoading}
              {...register('address')}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-notes" className="text-xs font-bold text-slate-700">Notes / Remarks</Label>
            <Textarea
              id="supplier-notes"
              placeholder="Additional details, credit terms, bank details..."
              className="h-20 text-xs resize-none"
              disabled={isLoading}
              {...register('notes')}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="font-semibold text-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {supplier ? 'Saving Changes...' : 'Creating Supplier...'}
                </>
              ) : (
                supplier ? 'Save Changes' : 'Create Supplier'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

