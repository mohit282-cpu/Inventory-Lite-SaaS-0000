"use client"

import React from 'react'
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
      <DialogContent className="sm:max-w-lg border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xl shrink-0">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">{product.name}</DialogTitle>
              <div className="text-xs text-slate-400 font-mono mt-0.5">SKU: {product.sku}</div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Key Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Selling Price</div>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                Rs. {product.sellingPrice.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Cost Price</div>
              <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">
                Rs. {product.purchasePrice.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Stock Quantity</div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">
                {product.stockQuantity} <span className="text-xs font-sans text-slate-400">{product.unit}</span>
              </div>
            </div>
          </div>

          {/* Details List */}
          <div className="space-y-2 text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-indigo-400" /> Category:</span>
              <span className="font-semibold text-slate-200">{categoryName || 'Uncategorized'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5"><Barcode className="h-3.5 w-3.5 text-blue-400" /> Barcode:</span>
              <span className="font-mono text-slate-200">{product.barcode || 'N/A'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Profit Margin:</span>
              <span className="font-mono text-emerald-400 font-bold">Rs. {margin.toFixed(2)} ({marginPercent}%)</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-amber-400" /> Low Stock Alert:</span>
              <span className="font-mono text-slate-200">{product.lowStockThreshold ?? 5} {product.unit}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-400 flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-indigo-400" /> Stock Status:</span>
              <StatusBadge status={stockStatus} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
