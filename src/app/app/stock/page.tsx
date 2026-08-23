"use client"

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  FileText,
  Loader2,
  Calendar,
  FilterX,
} from 'lucide-react'
import { StockMovement, Product } from '@/types'
import { generateStockLedgerPdf, sanitizeFilename } from '@/lib/pdf/stock-ledger-pdf'
import { formatBSDateTime } from '@/lib/date/bs-date'

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

type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'

function getDateRangeFromPreset(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  if (preset === 'TODAY') {
    return { dateFrom: todayStr, dateTo: todayStr }
  }

  if (preset === 'YESTERDAY') {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    const yStr = y.toISOString().split('T')[0]
    return { dateFrom: yStr, dateTo: yStr }
  }

  if (preset === 'THIS_WEEK') {
    const startOfWeek = new Date(now)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    return { dateFrom: startOfWeek.toISOString().split('T')[0], dateTo: todayStr }
  }

  if (preset === 'THIS_MONTH') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return { dateFrom: startOfMonth.toISOString().split('T')[0], dateTo: todayStr }
  }

  if (preset === 'LAST_MONTH') {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    return {
      dateFrom: startOfLastMonth.toISOString().split('T')[0],
      dateTo: endOfLastMonth.toISOString().split('T')[0],
    }
  }

  return { dateFrom: '', dateTo: '' }
}

export default function StockMovementsPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL')
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

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

  // Preset Date Selection Change
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    if (preset !== 'CUSTOM') {
      const range = getDateRangeFromPreset(preset)
      setDateFrom(range.dateFrom)
      setDateTo(range.dateTo)
    }
  }

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedProductFilter('ALL')
    setSelectedTypeFilter('ALL')
    setDatePreset('ALL')
    setDateFrom('')
    setDateTo('')
  }

  // Memoized Filter & Search Logic for Active UI Table View
  const filteredMovements = useMemo(() => {
    let result = [...movements]

    if (selectedProductFilter !== 'ALL') {
      result = result.filter((m) => m.productId === selectedProductFilter)
    }

    if (selectedTypeFilter !== 'ALL') {
      result = result.filter((m) => m.type === selectedTypeFilter)
    }

    if (dateFrom) {
      const fromTime = new Date(dateFrom).getTime()
      result = result.filter((m) => new Date(m.createdAt).getTime() >= fromTime)
    }

    if (dateTo) {
      const toDate = new Date(dateTo)
      if (dateTo.length <= 10) {
        toDate.setHours(23, 59, 59, 999)
      }
      const toTime = toDate.getTime()
      result = result.filter((m) => new Date(m.createdAt).getTime() <= toTime)
    }

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

    return result
  }, [debouncedSearchQuery, selectedTypeFilter, selectedProductFilter, dateFrom, dateTo, movements, products])

  // PDF Export Handler (READ-ONLY)
  const handleExportPdf = async () => {
    if (!activeBusiness?.$id) return
    setIsExporting(true)

    try {
      // 1. Fetch complete matching dataset using chunked query with tenant isolation
      const exportMovements = await stockMovementService.fetchAllMovements(
        activeBusiness.$id,
        {
          productId: selectedProductFilter,
          type: selectedTypeFilter as any,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
        user?.$id
      )

      // Apply search query filter if active
      let finalMovements = exportMovements
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase()
        finalMovements = finalMovements.filter((m) => {
          const prod = products.find((p) => p.$id === m.productId)
          return (
            (prod && (prod.name.toLowerCase().includes(q) || prod.sku.toLowerCase().includes(q))) ||
            (m.reason && m.reason.toLowerCase().includes(q)) ||
            (m.referenceId && m.referenceId.toLowerCase().includes(q))
          )
        })
      }

      // 2. Generate PDF document using read-only pdf engine
      const doc = generateStockLedgerPdf({
        business: activeBusiness,
        movements: finalMovements,
        products,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        selectedProductId: selectedProductFilter,
        selectedTypeFilter,
        searchQuery: debouncedSearchQuery,
        generatedBy: user?.name || user?.email || 'Authorized User',
      })

      // 3. Generate sanitized filename
      const targetProduct =
        selectedProductFilter !== 'ALL'
          ? products.find((p) => p.$id === selectedProductFilter)
          : null

      const scopeName = targetProduct
        ? sanitizeFilename(targetProduct.name)
        : sanitizeFilename(activeBusiness.name || 'Inventory')

      const dateTag = `${dateFrom || 'all'}-to-${dateTo || 'present'}`
      const fileName = `Inventory-Ledger-${scopeName}-${dateTag}.pdf`

      // 4. Download PDF file
      doc.save(fileName)

      toast({
        title: 'PDF Export Complete',
        description: `Successfully exported ${finalMovements.length} stock movement records to ${fileName}.`,
      })
    } catch (err: any) {
      toast({
        title: 'PDF Export Failed',
        description: err.message || 'Failed to generate stock ledger PDF.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

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
        <span className="text-xs text-slate-800 font-mono font-bold">
          {formatBSDateTime(item.createdAt)}
        </span>
      ),
    },
  ]

  const isFiltered =
    selectedProductFilter !== 'ALL' ||
    selectedTypeFilter !== 'ALL' ||
    datePreset !== 'ALL' ||
    searchQuery.trim() !== '' ||
    Boolean(dateFrom) ||
    Boolean(dateTo)

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Stock Movements & Ledger"
        description="Audit stock intakes, sales deductions, damages, and manual count adjustments."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleExportPdf}
              disabled={isExporting}
              variant="outline"
              className="border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 font-bold h-10 px-3.5 shadow-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-indigo-700" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="mr-1.5 h-4 w-4 text-indigo-700" />
                  Export PDF
                </>
              )}
            </Button>
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

      {/* Low Stock Banner */}
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

      {/* Filter Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="space-y-1 md:col-span-1">
            <Label className="text-xs font-bold text-slate-700">Search</Label>
            <SearchInput
              placeholder="Search product, SKU, ref #..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full h-9 text-xs"
            />
          </div>

          {/* Product Filter */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Product</Label>
            <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter}>
              <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.$id} value={p.$id}>
                    {p.name} ({p.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Movement Type Filter */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Movement Type</Label>
            <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
              <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                <SelectValue placeholder="All Movements" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Movements</SelectItem>
                <SelectItem value="stock_in">Stock In (Purchase)</SelectItem>
                <SelectItem value="stock_out">Stock Out (Deduction)</SelectItem>
                <SelectItem value="adjustment">Stock Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Presets */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Date Range Preset</Label>
            <Select value={datePreset} onValueChange={(val) => handleDatePresetChange(val as DatePreset)}>
              <SelectTrigger className="h-9 text-xs bg-white border-slate-300">
                <SelectValue placeholder="All History" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All History</SelectItem>
                <SelectItem value="TODAY">Today</SelectItem>
                <SelectItem value="YESTERDAY">Yesterday</SelectItem>
                <SelectItem value="THIS_WEEK">This Week</SelectItem>
                <SelectItem value="THIS_MONTH">This Month</SelectItem>
                <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                <SelectItem value="CUSTOM">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Date Inputs & Clear Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            {(datePreset === 'CUSTOM' || dateFrom || dateTo) && (
              <>
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-bold text-slate-700">From:</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value)
                      setDatePreset('CUSTOM')
                    }}
                    className="h-8 text-xs w-36"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-slate-700">To:</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value)
                      setDatePreset('CUSTOM')
                    }}
                    className="h-8 text-xs w-36"
                  />
                </div>
              </>
            )}

            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{filteredMovements.length}</span> of {movements.length} records
            </div>
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs text-slate-600 hover:text-slate-900 font-semibold"
            >
              <FilterX className="h-3.5 w-3.5 mr-1" /> Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Stock Ledger Table */}
      <DataTable
        data={filteredMovements}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No stock movements found"
        emptyDescription="No inventory records match your selected search query or date range filters."
        emptyAction={
          isFiltered ? (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="border-slate-300 text-slate-800 font-bold"
            >
              Clear Search & Filters
            </Button>
          ) : (
            <Button
              onClick={() => {
                setPreselectedProductId(undefined)
                setIsStockInOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <ArrowDownRight className="mr-1.5 h-4 w-4" /> Record First Stock In
            </Button>
          )
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
