"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/status-badge'
import { Product } from '@/types'
import { Package, Tag, Barcode, TrendingUp, Layers, DollarSign } from 'lucide-react'

interface ProductDetailsDialogProps {
  product: Product | null
  categoryName?: string
  isOpen: boolean
  onClose: () => void
}

export function ProductDetailsDialog({
  product,
  categoryName,
  isOpen,
  onClose,
}: ProductDetailsDialogProps) {
  if (!product) return null

  const margin = product.sellingPrice - product.purchasePrice
  const marginPercent = product.purchasePrice > 0 
    ? ((margin / product.purchasePrice) * 100).toFixed(1)
    : '100'

  const stockStatus = 
    product.stockQuantity === 0 
      ? 'Out of Stock' 
      : product.stockQuantity <= (product.lowStockThreshold || 5) 
      ? 'Low Stock' 
      : 'In Stock'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg border-slate-200 bg-white text-slate-900 shadow-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-xl shrink-0">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">{product.name}</DialogTitle>
              <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {product.sku}</div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Key Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Selling Price</div>
              <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                Rs. {product.sellingPrice.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Cost Price</div>
              <div className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                Rs. {product.purchasePrice.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Stock Quantity</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {product.stockQuantity} <span className="text-xs font-sans text-slate-500">{product.unit}</span>
              </div>
            </div>
          </div>

          {/* Details List */}
          <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium"><Tag className="h-3.5 w-3.5 text-indigo-600" /> Category:</span>
              <span className="font-bold text-slate-900">{categoryName || 'Uncategorized'}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium"><Barcode className="h-3.5 w-3.5 text-blue-600" /> Barcode:</span>
              <span className="font-mono font-bold text-slate-900">{product.barcode || 'N/A'}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Profit Margin:</span>
              <span className="font-mono text-emerald-700 font-extrabold">Rs. {margin.toFixed(2)} ({marginPercent}%)</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium"><Layers className="h-3.5 w-3.5 text-amber-600" /> Low Stock Alert:</span>
              <span className="font-mono font-bold text-slate-900">{product.lowStockThreshold ?? 5} {product.unit}</span>
            </div>

            <div className="flex justify-between py-1.5 items-center">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium"><DollarSign className="h-3.5 w-3.5 text-indigo-600" /> Stock Status:</span>
              <StatusBadge status={stockStatus} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
