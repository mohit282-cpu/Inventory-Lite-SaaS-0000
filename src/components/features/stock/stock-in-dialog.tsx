"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { stockInSchema } from '@/lib/validations'
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

const REASON_SUGGESTIONS = ['Purchase Intake', 'Supplier Delivery', 'Customer Return', 'Opening Stock', 'Stock Correction']

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
  const rawQty = watch('quantity')
  const activeProduct = products.find((p) => p.$id === selectedProductId)

  const parsedQty = typeof rawQty === 'number' ? rawQty : parseFloat(String(rawQty))
  const isValidQty = !isNaN(parsedQty) && isFinite(parsedQty) && parsedQty > 0
  const newStockPreview = activeProduct && isValidQty ? activeProduct.stockQuantity + parsedQty : null

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
      setServerError(mapStockError(err))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-slate-200 bg-white text-slate-900 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shrink-0">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">Record Stock In</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Add stock intake from purchases, supplier deliveries, or returns.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Select Product */}
          <div className="space-y-1.5">
            <Label htmlFor="stockIn-productId" className="text-xs font-bold text-slate-700">Select Product *</Label>
            <Select
              value={selectedProductId}
              onValueChange={(val) => setValue('productId', val)}
            >
              <SelectTrigger id="stockIn-productId" aria-label="Select product for stock in">
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

          {activeProduct && (
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <div className="text-slate-500 font-medium">Current Stock</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">
                  {activeProduct.stockQuantity} {activeProduct.unit}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-medium">Stock In</div>
                <div className="font-mono font-bold text-emerald-700 mt-0.5">
                  {isValidQty ? `+${parsedQty}` : '—'} {activeProduct.unit}
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

          {/* Intake Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="stockIn-quantity" className="text-xs font-bold text-slate-700">Intake Quantity *</Label>
            <Input
              id="stockIn-quantity"
              type="number"
              min="0.01"
              step="any"
              {...register('quantity')}
              aria-invalid={Boolean(errors.quantity)}
              className="font-mono"
            />
            {errors.quantity && <p className="text-xs text-red-600 font-medium">{errors.quantity.message}</p>}
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="stockIn-reason" className="text-xs font-bold text-slate-700">Reason / Note</Label>
            </div>
            <Input
              id="stockIn-reason"
              placeholder="e.g. Purchase order PO-882, Stock return"
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
            <Label htmlFor="stockIn-referenceId" className="text-xs font-bold text-slate-700">Reference # (Optional)</Label>
            <Input
              id="stockIn-referenceId"
              placeholder="e.g. Supplier Invoice # / PO #"
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
              disabled={isLoading || !isValidQty}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Adding Stock...' : 'Confirm Stock In'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
