"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockOutSchema } from '@/lib/validations'
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

const REASON_SUGGESTIONS = ['Dispatch / Sale', 'Damaged Goods', 'Sample Dispatch', 'Expired Item', 'Supplier Return']

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
  const rawQty = watch('quantity')
  const activeProduct = products.find((p) => p.$id === selectedProductId)

  const parsedQty = typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty))
  const isValidQty = !isNaN(parsedQty) && isFinite(parsedQty) && parsedQty > 0
  const isExceedingStock = activeProduct && isValidQty ? parsedQty > activeProduct.stockQuantity : false
  const shortfall = activeProduct && isExceedingStock ? parsedQty - activeProduct.stockQuantity : 0
  const newStockPreview = activeProduct && isValidQty && !isExceedingStock ? activeProduct.stockQuantity - parsedQty : null

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
      setServerError(mapStockError(err))
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
          <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{serverError || 'Insufficient stock.'}</span>
            </div>
            {isExceedingStock && activeProduct && (
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1.5 border-t border-red-200/60">
                <div>Available: <span className="font-bold">{activeProduct.stockQuantity} {activeProduct.unit}</span></div>
                <div>Requested: <span className="font-bold">{isValidQty ? parsedQty : 0} {activeProduct.unit}</span></div>
                <div>Shortfall: <span className="font-bold text-red-800">{shortfall} {activeProduct.unit}</span></div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Select Product */}
          <div className="space-y-1.5">
            <Label htmlFor="stockOut-productId" className="text-xs font-bold text-slate-700">Select Product *</Label>
            <Select
              value={selectedProductId}
              onValueChange={(val) => setValue('productId', val)}
            >
              <SelectTrigger id="stockOut-productId" aria-label="Select product for stock out">
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
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <div className="text-slate-500 font-medium">Available Stock</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {activeProduct.stockQuantity} {activeProduct.unit}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-medium">Stock Out</div>
                <div className="font-mono font-bold text-red-700 mt-0.5">
                  −{isValidQty ? parsedQty : '—'} {activeProduct.unit}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-medium">New Stock</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {newStockPreview !== null ? `${newStockPreview} ${activeProduct.unit}` : '—'}
                </div>
              </div>
            </div>
          )}

          {/* Deduction Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="stockOut-quantity" className="text-xs font-bold text-slate-700">Deduction Quantity *</Label>
            <Input
              id="stockOut-quantity"
              type="number"
              min="0.01"
              step="any"
              {...register('quantity')}
              aria-invalid={Boolean(errors.quantity || isExceedingStock)}
              className="font-mono"
            />
            {errors.quantity && <p className="text-xs text-red-600 font-medium">{errors.quantity.message}</p>}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="stockOut-reason" className="text-xs font-bold text-slate-700">Reason / Deduction Note</Label>
            <Input
              id="stockOut-reason"
              placeholder="e.g. Damaged goods, Sample dispatch, Expired item"
              {...register('reason')}
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
          </div>

          {/* Reference # */}
          <div className="space-y-1.5">
            <Label htmlFor="stockOut-referenceId" className="text-xs font-bold text-slate-700">Reference # (Optional)</Label>
            <Input
              id="stockOut-referenceId"
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
              disabled={isLoading || !isValidQty || isExceedingStock}
              variant="destructive"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Removing Stock...' : 'Confirm Stock Out'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
