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
      <DialogContent className="sm:max-w-md border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {initialData ? 'Edit Customer' : 'Add New Customer'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {initialData
              ? 'Update customer contact information and billing address.'
              : 'Add a new customer to your business directory.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-950/50 border border-red-800/80 text-red-200">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Customer / Firm Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Ram Thapa, ABC Traders"
              {...register('name')}
              className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500"
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g. 9841000000"
                {...register('phone')}
                className="bg-slate-950/60 border-slate-800 text-white font-mono placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. customer@gmail.com"
                {...register('email')}
                className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500"
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>
          </div>

          {/* PAN / Tax ID */}
          <div className="space-y-2">
            <Label htmlFor="panNumber">PAN / VAT Number (Optional)</Label>
            <Input
              id="panNumber"
              placeholder="e.g. 600112233"
              {...register('panNumber')}
              className="bg-slate-950/60 border-slate-800 text-white font-mono placeholder:text-slate-500"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Street address, City, District"
              {...register('address')}
              className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500"
            />
          </div>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20"
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
