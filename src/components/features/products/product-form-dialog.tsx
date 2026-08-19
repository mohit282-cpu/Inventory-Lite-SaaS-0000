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
import { Loader2, Wand2, Image as ImageIcon } from 'lucide-react'
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
      <DialogContent className="sm:max-w-2xl border-slate-800 bg-slate-900 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {initialData ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {initialData
              ? 'Update details, pricing, or stock thresholds for this inventory item.'
              : 'Add a new item to your store inventory.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-950/50 border border-red-800/80 text-red-200">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Row 1: Product Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Real Juice 1L, Wai Wai Noodles"
                {...register('name')}
                className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500"
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => setValue('categoryId', val)}
              >
                <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 focus:outline-none"
                >
                  <Wand2 className="h-3 w-3" /> Auto Generate
                </button>
              </div>
              <Input
                id="sku"
                placeholder="Leave blank to auto-generate"
                {...register('sku')}
                className="bg-slate-950/60 border-slate-800 text-white font-mono placeholder:text-slate-500"
              />
              {errors.sku && <p className="text-xs text-red-400">{errors.sku.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode (EAN / UPC)</Label>
              <Input
                id="barcode"
                placeholder="e.g. 8901234567890"
                {...register('barcode')}
                className="bg-slate-950/60 border-slate-800 text-white font-mono placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Row 3: Unit & Stock Thresholds */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit of Measure *</Label>
              <Select value={selectedUnit} onValueChange={(val) => setValue('unit', val)}>
                <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="pcs">pcs (Pieces)</SelectItem>
                  <SelectItem value="kg">kg (Kilograms)</SelectItem>
                  <SelectItem value="ltr">ltr (Liters)</SelectItem>
                  <SelectItem value="box">box (Box)</SelectItem>
                  <SelectItem value="pkt">pkt (Packets)</SelectItem>
                  <SelectItem value="m">m (Meters)</SelectItem>
                </SelectContent>
              </Select>
              {errors.unit && <p className="text-xs text-red-400">{errors.unit.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingStock">{initialData ? 'Current Stock' : 'Opening Stock'} *</Label>
              <Input
                id="openingStock"
                type="number"
                min="0"
                step="1"
                {...register('openingStock')}
                className="bg-slate-950/60 border-slate-800 text-white font-mono"
              />
              {errors.openingStock && (
                <p className="text-xs text-red-400">{errors.openingStock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStockAlert">Low Stock Alert *</Label>
              <Input
                id="minStockAlert"
                type="number"
                min="0"
                step="1"
                {...register('minStockAlert')}
                className="bg-slate-950/60 border-slate-800 text-white font-mono"
              />
              {errors.minStockAlert && (
                <p className="text-xs text-red-400">{errors.minStockAlert.message}</p>
              )}
            </div>
          </div>

          {/* Row 4: Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Cost / Purchase Price (Rs.) *</Label>
              <Input
                id="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                {...register('purchasePrice')}
                className="bg-slate-950/60 border-slate-800 text-white font-mono"
              />
              {errors.purchasePrice && (
                <p className="text-xs text-red-400">{errors.purchasePrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price (Rs.) *</Label>
              <Input
                id="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                {...register('sellingPrice')}
                className="bg-slate-950/60 border-slate-800 text-white font-mono"
              />
              {errors.sellingPrice && (
                <p className="text-xs text-red-400">{errors.sellingPrice.message}</p>
              )}
            </div>
          </div>

          {/* Image URL */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Product Image URL (Optional)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/product-image.jpg"
                  {...register('imageUrl')}
                  className="pl-9 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
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
              {initialData ? 'Update Product' : 'Save Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
