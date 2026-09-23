"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { customerSchema } from '@/lib/validations'
import { z } from 'zod'
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
import { Loader2 } from 'lucide-react'
import { Customer } from '@/types'

type CustomerFormValues = z.infer<typeof customerSchema>

interface CustomerFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CustomerFormValues) => Promise<void>
  initialData?: Customer | null
  isLoading?: boolean
}

export function CustomerFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: CustomerFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmittingInternal, setIsSubmittingInternal] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      panNumber: '',
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        phone: initialData.phone || '',
        email: initialData.email || '',
        address: initialData.address || '',
        panNumber: initialData.panNumber || '',
      })
    } else {
      reset({
        name: '',
        phone: '',
        email: '',
        address: '',
        panNumber: '',
      })
    }
    setServerError(null)
    setIsSubmittingInternal(false)
  }, [initialData, isOpen, reset])

  const handleFormSubmit = async (data: CustomerFormValues) => {
    try {
      setServerError(null)
      setIsSubmittingInternal(true)
      await onSubmit(data)
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save customer record. Please try again.')
    } finally {
      setIsSubmittingInternal(false)
    }
  }

  const isPending = isLoading || isSubmittingInternal

  return (
    <Dialog open={isOpen} onOpenChange={isPending ? () => {} : onClose}>
      <DialogContent
        className="sm:max-w-lg border-slate-200 bg-white text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="customer-form-title"
        aria-describedby="customer-form-desc"
      >
        <DialogHeader>
          <DialogTitle id="customer-form-title" className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Customer Details' : 'Add New Customer'}
          </DialogTitle>
          <DialogDescription id="customer-form-desc" className="text-xs text-slate-500">
            {initialData
              ? 'Update customer contact information, billing address, and tax registration.'
              : 'Add a new customer contact to your business directory.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold leading-relaxed">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Customer Name (Full Width) */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-slate-700">
              Customer / Firm Name <span className="text-rose-600">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Ram Thapa, ABC Traders"
              {...register('name')}
              disabled={isPending}
              className="w-full text-xs font-semibold"
            />
            {errors.name && <p className="text-xs text-rose-600 font-medium">{errors.name.message}</p>}
          </div>

          {/* Phone & Email (Balanced 2-column grid on desktop, 1-column on mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="phone" className="text-xs font-bold text-slate-700">
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="e.g. 9841000000"
                {...register('phone')}
                disabled={isPending}
                className="font-mono text-xs font-semibold w-full"
              />
              {errors.phone && <p className="text-xs text-rose-600 font-medium">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. customer@gmail.com"
                {...register('email')}
                disabled={isPending}
                className="text-xs font-semibold w-full"
              />
              {errors.email && <p className="text-xs text-rose-600 font-medium">{errors.email.message}</p>}
            </div>
          </div>

          {/* PAN / VAT Number (Optional, Full Width) */}
          <div className="space-y-1.5">
            <Label htmlFor="panNumber" className="text-xs font-bold text-slate-700">
              PAN / VAT Number (Optional)
            </Label>
            <Input
              id="panNumber"
              placeholder="e.g. 600112233"
              {...register('panNumber')}
              disabled={isPending}
              className="font-mono text-xs font-semibold w-full"
            />
            {errors.panNumber && <p className="text-xs text-rose-600 font-medium">{errors.panNumber.message}</p>}
          </div>

          {/* Address (Full Width) */}
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-bold text-slate-700">
              Address
            </Label>
            <Input
              id="address"
              placeholder="Street address, City, District"
              {...register('address')}
              disabled={isPending}
              className="text-xs font-semibold w-full"
            />
            {errors.address && <p className="text-xs text-rose-600 font-medium">{errors.address.message}</p>}
          </div>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="w-full sm:w-auto text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isPending
                ? initialData
                  ? 'Updating...'
                  : 'Saving...'
                : initialData
                ? 'Update Customer'
                : 'Save Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
