"use client"

import React, { useEffect, useState } from 'react'
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
  }, [initialData, isOpen, reset])

  const handleFormSubmit = async (data: CustomerFormValues) => {
    try {
      setServerError(null)
      await onSubmit(data)
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save customer record')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-slate-200 bg-white text-slate-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {initialData ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {initialData
              ? 'Update customer contact information and billing address.'
              : 'Add a new customer to your business directory.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Customer Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold text-slate-700">Customer / Firm Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Ram Thapa, ABC Traders"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-600 font-medium">{errors.name.message}</p>}
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-bold text-slate-700">Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g. 9841000000"
                {...register('phone')}
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-700">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. customer@gmail.com"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-600 font-medium">{errors.email.message}</p>}
            </div>
          </div>

          {/* PAN / Tax ID */}
          <div className="space-y-1.5">
            <Label htmlFor="panNumber" className="text-xs font-bold text-slate-700">PAN / VAT Number (Optional)</Label>
            <Input
              id="panNumber"
              placeholder="e.g. 600112233"
              {...register('panNumber')}
              className="font-mono"
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-bold text-slate-700">Address</Label>
            <Input
              id="address"
              placeholder="Street address, City, District"
              {...register('address')}
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
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {initialData ? 'Update Customer' : 'Save Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
