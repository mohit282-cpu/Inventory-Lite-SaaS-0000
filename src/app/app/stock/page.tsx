"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { StockInDialog } from '@/components/features/stock/stock-in-dialog'
import { StockOutDialog } from '@/components/features/stock/stock-out-dialog'
import { StockAdjustmentDialog } from '@/components/features/stock/stock-adjustment-dialog'
import { stockMovementService } from '@/services/stock-movement.service'
import { productService } from '@/services/product.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { StockMovement, Product } from '@/types'

export default function StockMovementsPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([])
  const [searchQuery, setSearchQuery] = useState('')
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
        stockMovementService.listMovements(activeBusiness.$id),
        productService.listProducts(activeBusiness.$id),
        productService.getLowStockProducts(activeBusiness.$id),
      ])
      setMovements(movs)
      setProducts(prods)
      setLowStockProducts(lowStock)
      setFilteredMovements(movs)
    } catch (err: any) {
      toast({
        title: 'Error loading stock ledger',
        description: err.message || 'Failed to fetch stock records.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter & Search Logic
  useEffect(() => {
    let result = [...movements]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
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

    setFilteredMovements(result)
  }, [searchQuery, selectedTypeFilter, movements, products])

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
          <div className="font-semibold text-white">{getProductName(item.productId)}</div>
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
          return <span className="font-mono font-bold text-emerald-400">+{item.quantity} {unit}</span>
        }
        if (item.type === 'stock_out') {
          return <span className="font-mono font-bold text-red-400">-{item.quantity} {unit}</span>
        }
        return <span className="font-mono font-bold text-amber-400">Adj ({item.quantity} {unit})</span>
      },
    },
    {
      key: 'stockTransition',
      header: 'Stock Transition',
      render: (item) => (
        <span className="font-mono text-xs text-slate-300">
          {item.previousQuantity} → <span className="font-bold text-white">{item.newQuantity}</span>
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason / Reference',
      render: (item) => (
        <div>
          <div className="text-slate-300 text-xs">{item.reason || 'Routine update'}</div>
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
        <span className="text-xs text-slate-400">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-600/20"
            >
              <ArrowDownRight className="mr-1.5 h-4 w-4" /> Stock In
            </Button>
            <Button
              onClick={() => {
                setPreselectedProductId(undefined)
                setIsStockOutOpen(true)
              }}
              className="bg-red-600 hover:bg-red-500 text-white font-medium shadow-md shadow-red-600/20"
            >
              <ArrowUpRight className="mr-1.5 h-4 w-4" /> Stock Out
            </Button>
            <Button
              onClick={() => {
                setPreselectedProductId(undefined)
                setIsAdjustmentOpen(true)
              }}
              variant="outline"
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Adjust Stock
            </Button>
          </div>
        }
      />

      {/* Low Stock & Out of Stock Alert Summary Banner */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-white">
                Low Stock Alert ({lowStockProducts.length} items require restock)
              </h4>
              <p className="text-xs text-amber-300/80 mt-0.5">
                The following products are at or below their alert threshold:{' '}
                <span className="font-semibold text-white">
                  {lowStockProducts.map((p) => `${p.name} (${p.stockQuantity} ${p.unit})`).join(', ')}
                </span>
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setPreselectedProductId(lowStockProducts[0].$id)
              setIsStockInOpen(true)
            }}
            className="bg-amber-600 hover:bg-amber-500 text-white font-medium shrink-0"
          >
            <ArrowDownRight className="mr-1 h-4 w-4" /> Restock Item
          </Button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          placeholder="Search stock history by product, SKU, or reason..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:max-w-md"
        />

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {[
            { label: 'All Movements', value: 'ALL' },
            { label: 'Stock In', value: 'stock_in' },
            { label: 'Stock Out', value: 'stock_out' },
            { label: 'Adjustments', value: 'adjustment' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSelectedTypeFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedTypeFilter === tab.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock History DataTable */}
      <DataTable
        data={filteredMovements}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No stock movements recorded"
        emptyDescription="All inventory intakes, deductions, and count reconciliations are logged here."
        emptyAction={
          <Button
            onClick={() => setIsStockInOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <ArrowDownRight className="mr-2 h-4 w-4" /> Record First Stock In
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
