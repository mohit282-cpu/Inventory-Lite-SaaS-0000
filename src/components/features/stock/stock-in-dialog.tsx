"use client"

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockInSchema } from '@/lib/validations'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, ArrowDownRight } from 'lucide-react'
import { Product } from '@/types'

type StockInFormValues = z.infer<typeof stockInSchema>

interface StockInDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: StockInFormValues) => Promise<void>
  products: Product[]
  preselectedProductId?: string
  isLoading?: boolean
}

export function StockInDialog({
  isOpen,
  onClose,
  onSubmit,
  products,
  preselectedProductId,
  isLoading = false,
}: StockInDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<StockInFormValues>({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      productId: preselectedProductId || '',
      quantity: 1,
      reason: 'Purchase Intake',
      referenceId: '',
    },
  })

  const selectedProductId = watch('productId')
  const activeProduct = products.find((p) => p.$id === selectedProductId)

  useEffect(() => {
    reset({
      productId: preselectedProductId || (products.length > 0 ? products[0].$id : ''),
      quantity: 1,
      reason: 'Purchase Intake',
      referenceId: '',
    })
    setServerError(null)
  }, [preselectedProductId, isOpen, products, reset])

  const handleFormSubmit = async (data: StockInFormValues) => {
    try {
      setServerError(null)
      await onSubmit(data)
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to process stock intake')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Record Stock In</DialogTitle>
              <DialogDescription className="text-slate-400 mt-0.5">
                Add stock intake from purchases, supplier deliveries, or returns.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-950/50 border border-red-800/80 text-red-200">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Select Product */}
          <div className="space-y-2">
            <Label htmlFor="productId">Select Product *</Label>
            <Select
              value={selectedProductId}
              onValueChange={(val) => setValue('productId', val)}
            >
              <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-56">
                {products.map((p) => (
                  <SelectItem key={p.$id} value={p.$id}>
                    {p.name} (SKU: {p.sku}) — Stock: {p.stockQuantity} {p.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.productId && <p className="text-xs text-red-400">{errors.productId.message}</p>}
          </div>

          {activeProduct && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex justify-between">
              <span className="text-slate-400">Current Stock:</span>
              <span className="font-mono font-bold text-white">
                {activeProduct.stockQuantity} {activeProduct.unit}
              </span>
            </div>
          )}

          {/* Intake Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Intake Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              {...register('quantity')}
              className="bg-slate-950/60 border-slate-800 text-white font-mono"
            />
            {errors.quantity && <p className="text-xs text-red-400">{errors.quantity.message}</p>}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason / Note</Label>
            <Input
              id="reason"
              placeholder="e.g. Purchase order PO-882, Stock return"
              {...register('reason')}
              className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500"
            />
          </div>

          {/* Reference # */}
          <div className="space-y-2">
            <Label htmlFor="referenceId">Reference # (Optional)</Label>
            <Input
              id="referenceId"
              placeholder="e.g. Supplier Invoice # / PO #"
              {...register('referenceId')}
              className="bg-slate-950/60 border-slate-800 text-white font-mono placeholder:text-slate-500"
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Stock In
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
