"use client"

import { useEffect, useState } from 'react'
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
import { Loader2, Wand2, Check, AlertTriangle, Plus } from 'lucide-react'
import { Product, Category } from '@/types'

type ProductFormValues = z.infer<typeof productFormSchema>

interface ProductFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProductFormValues) => Promise<void>
  initialData?: Product | null
  categories: Category[]
  currencyCode?: string
  isLoading?: boolean
  onCreateCategory?: () => void
}

export function ProductFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  currencyCode = 'NPR',
  isLoading = false,
  onCreateCategory,
}: ProductFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isAutoSku, setIsAutoSku] = useState(false)

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
  const purchasePriceVal = watch('purchasePrice')
  const sellingPriceVal = watch('sellingPrice')

  const isBelowCost =
    purchasePriceVal > 0 && sellingPriceVal > 0 && Number(sellingPriceVal) < Number(purchasePriceVal)

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
      setIsAutoSku(false)
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
      setIsAutoSku(false)
    }
    setServerError(null)
  }, [initialData, isOpen, reset])

  const handleGenerateSku = () => {
    const generated = `SKU-${Date.now().toString(36).toUpperCase()}`
    setValue('sku', generated, { shouldValidate: true })
    setIsAutoSku(true)
  }

  const handleFormSubmit = async (data: ProductFormValues) => {
    try {
      setServerError(null)

      // Normalize data
      const normalizedName = data.name.trim()
      const normalizedSku = data.sku && data.sku.trim() !== '' 
        ? data.sku.trim().toUpperCase() 
        : `SKU-${Date.now().toString(36).toUpperCase()}`
      const normalizedBarcode = data.barcode ? data.barcode.trim() : undefined

      const submissionData: ProductFormValues = {
        ...data,
        name: normalizedName,
        sku: normalizedSku,
        barcode: normalizedBarcode,
      }

      await onSubmit(submissionData)
      onClose()
    } catch (err: any) {
      console.error('[ProductFormDialog] Submission failed:', err)
      setServerError(err?.message || 'Failed to save product. Please check your inputs and try again.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {initialData ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {initialData
              ? 'Update product specifications, inventory count, or selling prices.'
              : 'Add a new item to your business catalog and initialize opening stock.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center justify-between">
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Section 1: Product Identity */}
          <div className="space-y-3 pb-2 border-b border-slate-100">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Product Identity</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-slate-700">
                  Product Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. Real Juice 1L, Wai Wai Noodles"
                  {...register('name')}
                  aria-invalid={!!errors.name}
                />
                {errors.name && <p className="text-xs text-red-600 font-medium">{errors.name.message}</p>}
              </div>

              {/* Category Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-bold text-slate-700">
                  Category
                </Label>
                {categories.length === 0 ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <span>No categories available.</span>
                    {onCreateCategory && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onCreateCategory}
                        className="h-6 px-2 text-[11px] font-bold text-indigo-700 hover:bg-amber-100"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Create Category
                      </Button>
                    )}
                  </div>
                ) : (
                  <Select
                    value={selectedCategory || 'none'}
                    onValueChange={(val) => setValue('categoryId', val === 'none' ? '' : val)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Uncategorized</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.$id} value={cat.$id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* SKU & Barcode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sku" className="text-xs font-bold text-slate-700">
                    SKU (Stock Keeping Unit)
                  </Label>
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 focus:outline-none"
                  >
                    <Wand2 className="h-3 w-3" /> Auto Generate
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="sku"
                    placeholder="Leave blank to auto-generate"
                    {...register('sku')}
                    className="font-mono"
                  />
                  {isAutoSku && (
                    <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded">
                      <Check className="h-3 w-3" /> Generated
                    </span>
                  )}
                </div>
                {errors.sku && <p className="text-xs text-red-600 font-medium">{errors.sku.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="barcode" className="text-xs font-bold text-slate-700">
                  Barcode (EAN / UPC)
                </Label>
                <Input
                  id="barcode"
                  placeholder="e.g. 8901234567890"
                  {...register('barcode')}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Inventory Settings */}
          <div className="space-y-3 pb-2 border-b border-slate-100">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Inventory Settings</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-xs font-bold text-slate-700">
                  Unit of Measure *
                </Label>
                <Select value={selectedUnit} onValueChange={(val) => setValue('unit', val)}>
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">pcs (Pieces)</SelectItem>
                    <SelectItem value="box">box (Box)</SelectItem>
                    <SelectItem value="kg">kg (Kilograms)</SelectItem>
                    <SelectItem value="g">g (Grams)</SelectItem>
                    <SelectItem value="ltr">ltr (Liters)</SelectItem>
                    <SelectItem value="ml">ml (Milliliters)</SelectItem>
                    <SelectItem value="pkt">pkt (Packets)</SelectItem>
                    <SelectItem value="m">m (Meters)</SelectItem>
                    <SelectItem value="dz">dz (Dozen)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.unit && <p className="text-xs text-red-600 font-medium">{errors.unit.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="openingStock" className="text-xs font-bold text-slate-700">
                  {initialData ? 'Current Stock' : 'Opening Stock'} *
                </Label>
                <Input
                  id="openingStock"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  {...register('openingStock')}
                  className="font-mono"
                />
                <p className="text-[10px] text-slate-500">Initial available quantity when created.</p>
                {errors.openingStock && (
                  <p className="text-xs text-red-600 font-medium">{errors.openingStock.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minStockAlert" className="text-xs font-bold text-slate-700">
                  Low Stock Alert *
                </Label>
                <Input
                  id="minStockAlert"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  {...register('minStockAlert')}
                  className="font-mono"
                />
                <p className="text-[10px] text-slate-500">Alert threshold for low stock status.</p>
                {errors.minStockAlert && (
                  <p className="text-xs text-red-600 font-medium">{errors.minStockAlert.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Pricing */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Pricing Configuration</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="purchasePrice" className="text-xs font-bold text-slate-700">
                  Cost / Purchase Price ({currencyCode}) *
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  inputMode="decimal"
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
                <Label htmlFor="sellingPrice" className="text-xs font-bold text-slate-700">
                  Selling Price ({currencyCode}) *
                </Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  inputMode="decimal"
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

            {/* Non-blocking selling price below purchase cost warning */}
            {isBelowCost && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Selling price is below purchase cost ({currencyCode} {Number(sellingPriceVal).toFixed(2)} &lt; {currencyCode} {Number(purchasePriceVal).toFixed(2)}). This may result in a negative gross margin.
                </span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : initialData ? (
                'Update Product'
              ) : (
                'Save Product'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

