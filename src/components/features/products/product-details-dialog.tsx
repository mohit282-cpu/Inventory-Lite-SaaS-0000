"use client"

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Product } from '@/types'
import { calculateGrossProfitMetrics, formatCurrency } from '@/lib/utils'
import { productService } from '@/services/product.service'
import {
  Package,
  Tag,
  Barcode,
  TrendingUp,
  Layers,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProductDetailsDialogProps {
  product: Product | null
  categoryName?: string
  currencyCode?: string
  businessId?: string
  isOpen: boolean
  onClose: () => void
}

export function ProductDetailsDialog({
  product,
  categoryName,
  currencyCode = 'Rs.',
  businessId,
  isOpen,
  onClose,
}: ProductDetailsDialogProps) {
  const [activeProduct, setActiveProduct] = useState<Product | null>(product)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Sync state & fetch fresh product document when modal is opened
  useEffect(() => {
    if (!isOpen || !product) {
      setActiveProduct(product)
      setFetchError(null)
      setIsLoading(false)
      return
    }

    // Set fallback initial product immediately
    setActiveProduct(product)
    setFetchError(null)

    // Fetch authoritative fresh product if businessId & product.$id are present
    if (businessId && product.$id) {
      let isMounted = true
      setIsLoading(true)

      productService
        .getProduct(product.$id, businessId)
        .then((fresh) => {
          if (isMounted) {
            if (fresh) {
              setActiveProduct(fresh)
            } else {
              setFetchError('Product no longer exists in active business catalog.')
            }
          }
        })
        .catch((err: any) => {
          if (isMounted) {
            const msg = err.message || 'Unable to load product details.'
            if (msg.includes('404') || msg.includes('not found')) {
              setFetchError('Product no longer exists. Refresh the product list to continue.')
            } else if (msg.includes('access denied') || msg.includes('403')) {
              setFetchError('Access denied. Product belongs to another business context.')
            } else {
              setFetchError('Unable to load latest product details. Showing cached data.')
            }
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false)
        })

      return () => {
        isMounted = false
      }
    }
  }, [isOpen, product, businessId])

  if (!isOpen) return null

  const displayItem = activeProduct || product
  if (!displayItem && !isLoading && fetchError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="sm:max-w-md border-slate-200 bg-white text-slate-900 shadow-xl"
          aria-labelledby="product-error-title"
          aria-describedby="product-error-desc"
        >
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle id="product-error-title" className="text-base font-bold text-slate-900">
              Unable to load product details
            </DialogTitle>
            <DialogDescription id="product-error-desc" className="text-xs text-slate-500 mt-1">
              {fetchError}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={onClose} variant="outline" size="sm" className="text-xs font-bold">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!displayItem) return null

  const threshold = displayItem.lowStockThreshold ?? 5
  const stockQty = displayItem.stockQuantity ?? 0
  const isOut = stockQty === 0
  const isLow = !isOut && stockQty <= threshold

  const metrics = calculateGrossProfitMetrics(
    displayItem.sellingPrice,
    displayItem.purchasePrice,
    currencyCode
  )

  const unitStr = displayItem.unit || 'pcs'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-lg border-slate-200 bg-white text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto"
        aria-labelledby="product-details-title"
        aria-describedby="product-details-description"
      >
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xl shrink-0 mt-0.5">
              <Package className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle id="product-details-title" className="text-xl font-bold text-slate-900 leading-snug break-words">
                {displayItem.name}
              </DialogTitle>
              <DialogDescription id="product-details-description" className="text-xs text-slate-500 font-mono mt-0.5">
                SKU: {displayItem.sku && displayItem.sku.trim() !== '' ? (
                  <span className="font-bold text-slate-700">{displayItem.sku}</span>
                ) : (
                  <span className="text-slate-400 font-normal">N/A</span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 space-y-4 animate-pulse">
            <div className="grid grid-cols-3 gap-3">
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-32 bg-slate-100 rounded-xl" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Top Key Operational Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Selling Price</div>
                <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                  {formatCurrency(displayItem.sellingPrice, currencyCode)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Cost Price</div>
                <div className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                  {formatCurrency(displayItem.purchasePrice, currencyCode)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Stock Quantity</div>
                <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                  {displayItem.stockQuantity} <span className="text-xs font-sans text-slate-500">{unitStr}</span>
                </div>
              </div>
            </div>

            {/* Information Sections */}
            <div className="space-y-3 text-xs">
              {/* SECTION 1: PRODUCT INFORMATION */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                  <Package className="h-3.5 w-3.5 text-indigo-600" /> Product Information
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                    <Tag className="h-3.5 w-3.5 text-indigo-600" /> Category:
                  </span>
                  <span className="font-bold text-slate-900">{categoryName || 'Uncategorized'}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                    <Barcode className="h-3.5 w-3.5 text-blue-600" /> Barcode:
                  </span>
                  {displayItem.barcode && displayItem.barcode.trim() !== '' ? (
                    <span className="font-mono font-bold text-slate-900">{displayItem.barcode}</span>
                  ) : (
                    <span className="font-mono text-slate-400 font-normal">N/A</span>
                  )}
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                    <Layers className="h-3.5 w-3.5 text-slate-600" /> SKU:
                  </span>
                  {displayItem.sku && displayItem.sku.trim() !== '' ? (
                    <span className="font-mono font-bold text-slate-900">{displayItem.sku}</span>
                  ) : (
                    <span className="font-mono text-slate-400 font-normal">N/A</span>
                  )}
                </div>
              </div>

              {/* SECTION 2: INVENTORY & STOCK */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                  <Layers className="h-3.5 w-3.5 text-amber-600" /> Inventory & Stock
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Stock Quantity:</span>
                  <span className="font-mono font-bold text-slate-900">{displayItem.stockQuantity} {unitStr}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Low Stock Threshold:</span>
                  <span className="font-mono font-bold text-slate-900">{threshold} {unitStr}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Stock Status:</span>
                  {isOut ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shrink-0" /> OUT OF STOCK
                    </span>
                  ) : isLow ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" /> LOW STOCK
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" /> IN STOCK
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION 3: PRICING & PROFITABILITY */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/60">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Pricing & Profitability
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Selling Price:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatCurrency(displayItem.sellingPrice, currencyCode)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Cost Price:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrency(displayItem.purchasePrice, currencyCode)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Gross Profit:</span>
                  <span
                    className={`font-mono font-extrabold ${
                      metrics.isLoss ? 'text-rose-700' : metrics.grossProfit > 0 ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    {metrics.formattedGrossProfit}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 font-medium">Gross Margin:</span>
                  <span
                    className={`font-mono font-extrabold ${
                      metrics.formattedGrossMargin === 'N/A'
                        ? 'text-slate-400 font-normal'
                        : metrics.isLoss
                        ? 'text-rose-700'
                        : (metrics.grossMarginPercent ?? 0) > 0
                        ? 'text-emerald-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {metrics.formattedGrossMargin}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
