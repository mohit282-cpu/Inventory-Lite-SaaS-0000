"use client"

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockAdjustmentSchema } from '@/lib/validations'
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
import { Loader2, RefreshCw } from 'lucide-react'
import { Product } from '@/types'

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>

interface StockAdjustmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: StockAdjustmentFormValues) => Promise<void>
  products: Product[]
  preselectedProductId?: string
  isLoading?: boolean
}

export function StockAdjustmentDialog({
  isOpen,
  onClose,
  onSubmit,
  products,
  preselectedProductId,
  isLoading = false,
}: StockAdjustmentDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      productId: preselectedProductId || '',
      newQuantity: 0,
      reason: 'Physical Count Audit',
    },
  })

  const selectedProductId = watch('productId')
  const newQuantity = watch('newQuantity') ?? 0
  const activeProduct = products.find((p) => p.$id === selectedProductId)

  const currentStock = activeProduct?.stockQuantity ?? 0
  const delta = newQuantity - currentStock

  useEffect(() => {
    const prod = products.find((p) => p.$id === (preselectedProductId || products[0]?.$id))
    reset({
      productId: preselectedProductId || (products.length > 0 ? products[0].$id : ''),
      newQuantity: prod ? prod.stockQuantity : 0,
      reason: 'Physical Count Audit',
    })
    setServerError(null)
  }, [preselectedProductId, isOpen, products, reset])

  const handleFormSubmit = async (data: StockAdjustmentFormValues) => {
    try {
      setServerError(null)
      await onSubmit(data)
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to record stock adjustment')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Stock Adjustment</DialogTitle>
              <DialogDescription className="text-slate-400 mt-0.5">
                Reconcile physical store inventory count with system stock.
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
              onValueChange={(val) => {
                setValue('productId', val)
                const p = products.find((x) => x.$id === val)
                if (p) setValue('newQuantity', p.stockQuantity)
              }}
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

          {/* Current Stock vs New Target Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div className="text-slate-400">Current Stock</div>
              <div className="font-mono font-bold text-white text-base mt-0.5">
                {currentStock} {activeProduct?.unit}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div className="text-slate-400">Computed Delta</div>
              <div
                className={`font-mono font-bold text-base mt-0.5 ${
                  delta > 0
                    ? 'text-emerald-400'
                    : delta < 0
                    ? 'text-red-400'
                    : 'text-slate-400'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta} {activeProduct?.unit}
              </div>
            </div>
          </div>

          {/* Target New Quantity */}
          <div className="space-y-2">
            <Label htmlFor="newQuantity">New Target Stock Quantity *</Label>
            <Input
              id="newQuantity"
              type="number"
              min="0"
              step="1"
              {...register('newQuantity')}
              className="bg-slate-950/60 border-slate-800 text-white font-mono"
            />
            {errors.newQuantity && (
              <p className="text-xs text-red-400">{errors.newQuantity.message}</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Adjustment Reason *</Label>
            <Input
              id="reason"
              placeholder="e.g. Physical stock count discrepancy, Spoilage"
              {...register('reason')}
              className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500"
            />
            {errors.reason && <p className="text-xs text-red-400">{errors.reason.message}</p>}
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
              className="bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-lg shadow-amber-600/20"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
