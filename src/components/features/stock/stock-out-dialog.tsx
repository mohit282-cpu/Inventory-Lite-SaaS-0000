"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockOutSchema } from '@/lib/validations'
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
import { Loader2, ArrowUpRight, AlertTriangle } from 'lucide-react'
import { Product } from '@/types'

type StockOutFormValues = z.infer<typeof stockOutSchema>

interface StockOutDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: StockOutFormValues) => Promise<void>
  products: Product[]
  preselectedProductId?: string
  isLoading?: boolean
}

export function StockOutDialog({
  isOpen,
  onClose,
  onSubmit,
  products,
  preselectedProductId,
  isLoading = false,
}: StockOutDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<StockOutFormValues>({
    resolver: zodResolver(stockOutSchema),
    defaultValues: {
      productId: preselectedProductId || '',
      quantity: 1,
      reason: 'Dispatch / Damage',
      referenceId: '',
    },
  })

  const selectedProductId = watch('productId')
  const enteredQuantity = watch('quantity') || 0
  const activeProduct = products.find((p) => p.$id === selectedProductId)

  const isExceedingStock = activeProduct ? enteredQuantity > activeProduct.stockQuantity : false

  useEffect(() => {
    reset({
      productId: preselectedProductId || (products.length > 0 ? products[0].$id : ''),
      quantity: 1,
      reason: 'Dispatch / Damage',
      referenceId: '',
    })
    setServerError(null)
  }, [preselectedProductId, isOpen, products, reset])

  const handleFormSubmit = async (data: StockOutFormValues) => {
    if (activeProduct && data.quantity > activeProduct.stockQuantity) {
      setServerError(`Insufficient stock! Available: ${activeProduct.stockQuantity} ${activeProduct.unit}`)
      return
    }
    try {
      setServerError(null)
      await onSubmit(data)
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to process stock output')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-slate-200 bg-white text-slate-900 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center justify-center font-bold shrink-0">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Record Stock Out</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Deduct inventory for sales, dispatches, damages, or samples.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {(serverError || isExceedingStock) && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <span>
              {serverError ||
                `Requested ${enteredQuantity} ${activeProduct?.unit} exceeds available stock (${activeProduct?.stockQuantity} ${activeProduct?.unit})`}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Select Product */}
          <div className="space-y-1.5">
            <Label htmlFor="productId" className="text-xs font-bold text-slate-700">Select Product *</Label>
            <Select
              value={selectedProductId}
              onValueChange={(val) => setValue('productId', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {products.map((p) => (
                  <SelectItem key={p.$id} value={p.$id}>
                    {p.name} (SKU: {p.sku}) — Available: {p.stockQuantity} {p.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.productId && <p className="text-xs text-red-600 font-medium">{errors.productId.message}</p>}
          </div>

          {activeProduct && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between">
              <span className="text-slate-500 font-medium">Available Stock:</span>
              <span className="font-mono font-bold text-slate-900">
                {activeProduct.stockQuantity} {activeProduct.unit}
              </span>
            </div>
          )}

          {/* Deduction Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="quantity" className="text-xs font-bold text-slate-700">Deduction Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={activeProduct?.stockQuantity || 999999}
              step="1"
              {...register('quantity')}
              className="font-mono"
            />
            {errors.quantity && <p className="text-xs text-red-600 font-medium">{errors.quantity.message}</p>}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs font-bold text-slate-700">Reason / Deduction Note</Label>
            <Input
              id="reason"
              placeholder="e.g. Damaged goods, Sample dispatch, Expired item"
              {...register('reason')}
            />
          </div>

          {/* Reference # */}
          <div className="space-y-1.5">
            <Label htmlFor="referenceId" className="text-xs font-bold text-slate-700">Reference # (Optional)</Label>
            <Input
              id="referenceId"
              placeholder="e.g. Sales Receipt # / Dispatch Note #"
              {...register('referenceId')}
              className="font-mono"
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
              disabled={isLoading || isExceedingStock}
              variant="destructive"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Stock Out
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
