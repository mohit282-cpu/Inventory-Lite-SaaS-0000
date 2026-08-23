"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { stockMovementService } from '@/services/stock-movement.service'
import { productService } from '@/services/product.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { StockMovement, Product } from '@/types'

// Dynamic Dialog Imports for Bundle Optimization
const StockInDialog = dynamic(
  () => import('@/components/features/stock/stock-in-dialog').then((mod) => mod.StockInDialog),
  { ssr: false }
)
const StockOutDialog = dynamic(
  () => import('@/components/features/stock/stock-out-dialog').then((mod) => mod.StockOutDialog),
  { ssr: false }
)
const StockAdjustmentDialog = dynamic(
  () => import('@/components/features/stock/stock-adjustment-dialog').then((mod) => mod.StockAdjustmentDialog),
  { ssr: false }
)

export default function StockMovementsPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)

  // Dialog States
  const [isStockInOpen, setIsStockInOpen] = useState(false)
  const [isStockOutOpen, setIsStockOutOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [preselectedProductId, setPreselectedProductId] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setIsLoading(true)
      const [movs, prods, lowStock] = await Promise.all([
        stockMovementService.listMovements(activeBusiness.$id).catch(() => []),
        productService.listProducts(activeBusiness.$id).catch(() => []),
        productService.getLowStockProducts(activeBusiness.$id).catch(() => []),
      ])
      setMovements(movs)
      setProducts(prods)
      setLowStockProducts(lowStock)
    } catch (err: any) {
      if (typeof window !== 'undefined' && navigator.onLine) {
        toast({
          title: 'Error loading stock ledger',
          description: err.message || 'Failed to fetch stock records.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Memoized Filter & Search Logic
  const filteredMovements = useMemo(() => {
    let result = [...movements]

    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase()
      result = result.filter((m) => {
        const prod = products.find((p) => p.$id === m.productId)
        return (
          (prod && (prod.name.toLowerCase().includes(q) || prod.sku.toLowerCase().includes(q))) ||
          (m.reason && m.reason.toLowerCase().includes(q)) ||
          (m.referenceId && m.referenceId.toLowerCase().includes(q))
        )
      })
    }

    if (selectedTypeFilter !== 'ALL') {
      result = result.filter((m) => m.type === selectedTypeFilter)
    }

    return result
  }, [debouncedSearchQuery, selectedTypeFilter, movements, products])

  // Stock In Handler
  const handleStockIn = async (data: {
    productId: string
    quantity: number
    reason?: string
    referenceId?: string
  }) => {
    if (!activeBusiness?.$id || !user?.$id) return
    setIsSubmitting(true)
    try {
      await stockMovementService.processStockIn(
        data.productId,
        data.quantity,
        activeBusiness.$id,
        user.$id,
        data.reason,
        data.referenceId
      )
      toast({
        title: 'Stock In Recorded',
        description: `Successfully added ${data.quantity} units to inventory.`,
      })
      await fetchData()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Stock Out Handler
  const handleStockOut = async (data: {
    productId: string
    quantity: number
    reason?: string
    referenceId?: string
  }) => {
    if (!activeBusiness?.$id || !user?.$id) return
    setIsSubmitting(true)
    try {
      await stockMovementService.processStockOut(
        data.productId,
        data.quantity,
        activeBusiness.$id,
        user.$id,
        data.reason,
        data.referenceId
      )
      toast({
        title: 'Stock Out Recorded',
        description: `Successfully deducted ${data.quantity} units from inventory.`,
      })
      await fetchData()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Stock Adjustment Handler
  const handleStockAdjustment = async (data: {
    productId: string
    newQuantity: number
    reason: string
  }) => {
    if (!activeBusiness?.$id || !user?.$id) return
    setIsSubmitting(true)
    try {
      await stockMovementService.processAdjustment(
        data.productId,
        data.newQuantity,
        activeBusiness.$id,
        user.$id,
        data.reason
      )
      toast({
        title: 'Stock Adjusted',
        description: `Inventory stock reconciled to ${data.newQuantity} units.`,
      })
      await fetchData()
    } finally {
      setIsSubmitting(false)
    }
  }

  const getProductName = (productId: string) => {
    const p = products.find((x) => x.$id === productId)
    return p ? p.name : productId
  }

  const getProductSku = (productId: string) => {
    const p = products.find((x) => x.$id === productId)
    return p ? p.sku : ''
  }

  const getProductUnit = (productId: string) => {
    const p = products.find((x) => x.$id === productId)
    return p ? p.unit : 'pcs'
  }

  const columns: Column<StockMovement>[] = [
    {
      key: 'productId',
      header: 'Product',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900">{getProductName(item.productId)}</div>
          <div className="text-xs text-slate-500 font-mono">SKU: {getProductSku(item.productId)}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Movement Type',
      render: (item) => <StatusBadge status={item.type} />,
    },
    {
      key: 'quantity',
      header: 'Quantity Change',
      sortable: true,
      render: (item) => {
        const unit = getProductUnit(item.productId)
        if (item.type === 'stock_in') {
          return <span className="font-mono font-bold text-emerald-700">+{item.quantity} {unit}</span>
        }
        if (item.type === 'stock_out') {
          return <span className="font-mono font-bold text-red-700">-{item.quantity} {unit}</span>
        }
        return <span className="font-mono font-bold text-amber-800">Adj ({item.quantity} {unit})</span>
      },
    },
    {
      key: 'stockTransition',
      header: 'Stock Transition',
      render: (item) => (
        <span className="font-mono text-xs text-slate-600">
          {item.previousQuantity} → <span className="font-bold text-slate-900">{item.newQuantity}</span>
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason / Reference',
      render: (item) => (
        <div>
          <div className="text-slate-700 text-xs font-medium">{item.reason || 'Routine update'}</div>
          {item.referenceId && (
            <div className="text-[10px] text-slate-500 font-mono">Ref: {item.referenceId}</div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date & Time',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-500 font-medium">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Stock Movements & Ledger"
        description="Audit stock intakes, sales deductions, damages, and manual count adjustments."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setPreselectedProductId(undefined)
                setIsStockInOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-3.5"
            >
              <ArrowDownRight className="mr-1.5 h-4 w-4" /> Stock In
            </Button>
            <Button
              onClick={() => {
                setPreselectedProductId(undefined)
                setIsStockOutOpen(true)
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-3.5"
            >
              <ArrowUpRight className="mr-1.5 h-4 w-4" /> Stock Out
            </Button>
            <Button
              onClick={() => {
                setPreselectedProductId(undefined)
                setIsAdjustmentOpen(true)
              }}
              variant="outline"
              className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-semibold h-10 px-3.5"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Adjust Stock
            </Button>
          </div>
        }
      />

      {/* Low Stock & Out of Stock Alert Summary Banner */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-950 text-sm">
                Attention Required: {lowStockProducts.length} Items Low or Out of Stock
              </div>
              <div className="mt-0.5 text-amber-800">
                Replenish inventory to avoid stockouts at the POS checkout counter.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {lowStockProducts.slice(0, 3).map((p) => (
              <Button
                key={p.$id}
                size="sm"
                variant="outline"
                onClick={() => {
                  setPreselectedProductId(p.$id)
                  setIsStockInOpen(true)
                }}
                className="h-7 text-xs border-amber-300 bg-white text-amber-900 hover:bg-amber-100 font-bold"
              >
                + Restock {p.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          placeholder="Search ledger by product, SKU, or reference #..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:max-w-md"
        />

        <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All Movement Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Movements</SelectItem>
            <SelectItem value="stock_in">Stock In (Purchase)</SelectItem>
            <SelectItem value="stock_out">Stock Out (Deduction)</SelectItem>
            <SelectItem value="adjustment">Stock Adjustment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stock Ledger Table */}
      <DataTable
        data={filteredMovements}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No stock movements recorded"
        emptyDescription="Record your first stock-in transaction or stock movement to populate the ledger."
        emptyAction={
          <Button
            onClick={() => {
              setPreselectedProductId(undefined)
              setIsStockInOpen(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <ArrowDownRight className="mr-1.5 h-4 w-4" /> Record First Stock In
          </Button>
        }
      />

      {/* Stock In Modal */}
      <StockInDialog
        isOpen={isStockInOpen}
        onClose={() => setIsStockInOpen(false)}
        onSubmit={handleStockIn}
        products={products}
        preselectedProductId={preselectedProductId}
        isLoading={isSubmitting}
      />

      {/* Stock Out Modal */}
      <StockOutDialog
        isOpen={isStockOutOpen}
        onClose={() => setIsStockOutOpen(false)}
        onSubmit={handleStockOut}
        products={products}
        preselectedProductId={preselectedProductId}
        isLoading={isSubmitting}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentDialog
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        onSubmit={handleStockAdjustment}
        products={products}
        preselectedProductId={preselectedProductId}
        isLoading={isSubmitting}
      />
    </div>
  )
}
