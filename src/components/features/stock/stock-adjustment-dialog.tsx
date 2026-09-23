"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockAdjustmentSchema } from '@/lib/validations'
import { mapStockError } from '@/lib/utils'
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

const REASON_SUGGESTIONS = [
  'Physical Count Audit',
  'Damaged Goods Discrepancy',
  'Expired Stock Audit',
  'Data Entry Correction',
  'Store Transfer',
]

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
  const rawNewQty = watch('newQuantity')
  const activeProduct = products.find((p) => p.$id === selectedProductId)

  const currentStock = activeProduct?.stockQuantity ?? 0
  const parsedNewQty = typeof rawNewQty === 'number' ? rawNewQty : parseFloat(String(rawNewQty))
  const isValidNewQty = !isNaN(parsedNewQty) && isFinite(parsedNewQty) && parsedNewQty >= 0
  const delta = activeProduct && isValidNewQty ? parsedNewQty - currentStock : null
  const isZeroDelta = delta === 0

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
    if (isZeroDelta) {
      setServerError(`No adjustment required. The target stock is already ${currentStock} ${activeProduct?.unit || 'units'}.`)
      return
    }
    try {
      setServerError(null)
      await onSubmit(data)
      onClose()
    } catch (err: any) {
      setServerError(mapStockError(err))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-slate-200 bg-white text-slate-900 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold shrink-0">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Stock Adjustment</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Reconcile physical store inventory count with system stock.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
            {serverError}
          </div>
        )}

        {isZeroDelta && activeProduct && !serverError && (
          <div className="p-3 text-xs rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-medium">
            No adjustment required. The target stock is already <span className="font-bold text-slate-900">{currentStock} {activeProduct.unit}</span>.
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Select Product */}
          <div className="space-y-1.5">
            <Label htmlFor="adjustment-productId" className="text-xs font-bold text-slate-700">Select Product *</Label>
            <Select
              value={selectedProductId}
              onValueChange={(val) => {
                setValue('productId', val)
                const p = products.find((x) => x.$id === val)
                if (p) setValue('newQuantity', p.stockQuantity)
              }}
            >
              <SelectTrigger id="adjustment-productId" aria-label="Select product for stock adjustment">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {products.map((p) => (
                  <SelectItem key={p.$id} value={p.$id}>
                    {p.name} (SKU: {p.sku}) — Stock: {p.stockQuantity} {p.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.productId && <p className="text-xs text-red-600 font-medium">{errors.productId.message}</p>}
          </div>

          {/* Current Stock vs New Target Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="text-slate-500 font-medium">Current Stock</div>
              <div className="font-mono font-bold text-slate-900 text-base mt-0.5">
                {currentStock} {activeProduct?.unit}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div className="text-slate-500 font-medium">Computed Delta</div>
              <div
                className={`font-mono font-bold text-base mt-0.5 ${
                  delta !== null && delta > 0
                    ? 'text-emerald-700'
                    : delta !== null && delta < 0
                    ? 'text-red-700'
                    : 'text-slate-500'
                }`}
              >
                {delta === null
                  ? '—'
                  : delta > 0
                  ? `+${delta}`
                  : delta < 0
                  ? `−${Math.abs(delta)}`
                  : '0'}{' '}
                {activeProduct?.unit}
              </div>
            </div>
          </div>

          {/* Target New Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="adjustment-newQuantity" className="text-xs font-bold text-slate-700">New Target Stock Quantity *</Label>
            <Input
              id="adjustment-newQuantity"
              type="number"
              min="0"
              step="any"
              {...register('newQuantity')}
              aria-invalid={Boolean(errors.newQuantity || isZeroDelta)}
              className="font-mono"
            />
            {errors.newQuantity && (
              <p className="text-xs text-red-600 font-medium">{errors.newQuantity.message}</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="adjustment-reason" className="text-xs font-bold text-slate-700">Adjustment Reason *</Label>
            <Input
              id="adjustment-reason"
              placeholder="e.g. Physical stock count discrepancy, Spoilage"
              {...register('reason')}
              aria-invalid={Boolean(errors.reason)}
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {REASON_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setValue('reason', tag)}
                  className="px-2 py-0.5 text-[10px] rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
            {errors.reason && <p className="text-xs text-red-600 font-medium">{errors.reason.message}</p>}
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
              disabled={isLoading || !isValidNewQty || isZeroDelta}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Saving Adjustment...' : 'Confirm Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
