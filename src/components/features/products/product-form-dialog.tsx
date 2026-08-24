"use client"

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productFormSchema } from '@/lib/validations'
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
import { Loader2, Wand2 } from 'lucide-react'
import { Product, Category } from '@/types'

type ProductFormValues = z.infer<typeof productFormSchema>

interface ProductFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProductFormValues) => Promise<void>
  initialData?: Product | null
  categories: Category[]
  isLoading?: boolean
}

export function ProductFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  isLoading = false,
}: ProductFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      categoryId: '',
      unit: 'pcs',
      purchasePrice: 0,
      sellingPrice: 0,
      openingStock: 0,
      minStockAlert: 5,
      imageUrl: '',
      isActive: true,
    },
  })

  const selectedCategory = watch('categoryId')
  const selectedUnit = watch('unit')

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        sku: initialData.sku,
        barcode: initialData.barcode || '',
        categoryId: initialData.categoryId || '',
        unit: initialData.unit || 'pcs',
        purchasePrice: initialData.purchasePrice,
        sellingPrice: initialData.sellingPrice,
        openingStock: initialData.stockQuantity,
        minStockAlert: initialData.lowStockThreshold ?? 5,
        imageUrl: initialData.imageUrl || '',
        isActive: initialData.isActive ?? true,
      })
    } else {
      reset({
        name: '',
        sku: '',
        barcode: '',
        categoryId: '',
        unit: 'pcs',
        purchasePrice: 0,
        sellingPrice: 0,
        openingStock: 0,
        minStockAlert: 5,
        imageUrl: '',
        isActive: true,
      })
    }
    setServerError(null)
  }, [initialData, isOpen, reset])

  const handleGenerateSku = () => {
    const generated = `SKU-${Date.now().toString(36).toUpperCase()}`
    setValue('sku', generated)
  }

  const handleFormSubmit = async (data: ProductFormValues) => {
    try {
      setServerError(null)
      await onSubmit(data)
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to save product')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update details, pricing, or stock thresholds for this inventory item.'
              : 'Add a new item to your store inventory.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Row 1: Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-slate-700">Product Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Real Juice 1L, Wai Wai Noodles"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-red-600 font-medium">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-bold text-slate-700">Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => setValue('categoryId', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Uncategorized</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.$id} value={cat.$id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: SKU & Barcode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sku" className="text-xs font-bold text-slate-700">SKU (Stock Keeping Unit)</Label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 focus:outline-none"
                >
                  <Wand2 className="h-3 w-3" /> Auto Generate
                </button>
              </div>
              <Input
                id="sku"
                placeholder="Leave blank to auto-generate"
                {...register('sku')}
                className="font-mono"
              />
              {errors.sku && <p className="text-xs text-red-600 font-medium">{errors.sku.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="barcode" className="text-xs font-bold text-slate-700">Barcode (EAN / UPC)</Label>
              <Input
                id="barcode"
                placeholder="e.g. 8901234567890"
                {...register('barcode')}
                className="font-mono"
              />
            </div>
          </div>

          {/* Row 3: Unit & Stock Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unit" className="text-xs font-bold text-slate-700">Unit of Measure *</Label>
              <Select value={selectedUnit} onValueChange={(val) => setValue('unit', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">pcs (Pieces)</SelectItem>
                  <SelectItem value="kg">kg (Kilograms)</SelectItem>
                  <SelectItem value="ltr">ltr (Liters)</SelectItem>
                  <SelectItem value="box">box (Box)</SelectItem>
                  <SelectItem value="pkt">pkt (Packets)</SelectItem>
                  <SelectItem value="m">m (Meters)</SelectItem>
                </SelectContent>
              </Select>
              {errors.unit && <p className="text-xs text-red-600 font-medium">{errors.unit.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="openingStock" className="text-xs font-bold text-slate-700">{initialData ? 'Current Stock' : 'Opening Stock'} *</Label>
              <Input
                id="openingStock"
                type="number"
                min="0"
                step="1"
                {...register('openingStock')}
                className="font-mono"
              />
              {errors.openingStock && (
                <p className="text-xs text-red-600 font-medium">{errors.openingStock.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="minStockAlert" className="text-xs font-bold text-slate-700">Low Stock Alert *</Label>
              <Input
                id="minStockAlert"
                type="number"
                min="0"
                step="1"
                {...register('minStockAlert')}
                className="font-mono"
              />
              {errors.minStockAlert && (
                <p className="text-xs text-red-600 font-medium">{errors.minStockAlert.message}</p>
              )}
            </div>
          </div>

          {/* Row 4: Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="purchasePrice" className="text-xs font-bold text-slate-700">Cost / Purchase Price (Rs.) *</Label>
              <Input
                id="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                {...register('purchasePrice')}
                className="font-mono"
              />
              {errors.purchasePrice && (
                <p className="text-xs text-red-600 font-medium">{errors.purchasePrice.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sellingPrice" className="text-xs font-bold text-slate-700">Selling Price (Rs.) *</Label>
              <Input
                id="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                {...register('sellingPrice')}
                className="font-mono"
              />
              {errors.sellingPrice && (
                <p className="text-xs text-red-600 font-medium">{errors.sellingPrice.message}</p>
              )}
            </div>
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
              {initialData ? 'Update Product' : 'Save Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
