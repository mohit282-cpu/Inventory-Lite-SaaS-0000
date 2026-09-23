"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { purchaseService } from '@/services/purchase.service'
import { supplierService } from '@/services/supplier.service'
import { productService } from '@/services/product.service'
import { Purchase, Supplier, Product, PurchaseStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PurchaseDialog } from '@/components/features/purchases/purchase-dialog'
import { PurchaseDetailDialog } from '@/components/features/purchases/purchase-detail-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ShoppingBag,
  Plus,
  Search,
  Eye,
  XCircle,
  Loader2,
  FilterX,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { formatMoney } from '@/lib/money'

export default function PurchasesPage() {
  const { activeBusiness, user } = useAuth()
  const businessId = activeBusiness?.$id || ''
  const userId = user?.$id || ''

  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | 'all'>('all')

  // Modals
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Cancellation Modal State
  const [cancelTarget, setCancelTarget] = useState<Purchase | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!businessId) return
    try {
      setLoading(true)
      setError(null)
      const results = await Promise.allSettled([
        purchaseService.listPurchases(businessId),
        supplierService.listAllSuppliers(businessId),
        productService.listAllProducts(businessId),
      ])
      const fetchedPurchases = results[0].status === 'fulfilled' ? results[0].value : []
      const fetchedSuppliers = results[1].status === 'fulfilled' ? results[1].value : []
      const fetchedProducts = results[2].status === 'fulfilled' ? results[2].value : []

      if (results[0].status === 'rejected') {
        setError('Unable to load purchase records. Please try again.')
      }

      setPurchases(Array.isArray(fetchedPurchases) ? fetchedPurchases : [])
      setSuppliers(Array.isArray(fetchedSuppliers) ? fetchedSuppliers : [])
      setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load purchase intake data.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreatePurchase = async (data: any) => {
    if (!businessId || !userId) return
    setActionLoading(true)
    try {
      await purchaseService.createPurchase(data, businessId, userId)
      await loadData()
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmCancelPurchase = async () => {
    if (!cancelTarget || !businessId || !userId) return
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancellation.')
      return
    }

    try {
      setCancelling(true)
      setCancelError(null)
      await purchaseService.cancelPurchase(cancelTarget.$id, businessId, userId, cancelReason.trim())
      setCancelTarget(null)
      setCancelReason('')
      await loadData()
    } catch (err: any) {
      setCancelError(err?.message || 'Failed to cancel purchase transaction.')
    } finally {
      setCancelling(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedSupplierId('all')
    setStatusFilter('all')
  }

  const isFilterActive = searchQuery.trim() !== '' || selectedSupplierId !== 'all' || statusFilter !== 'all'

  // Filtered list
  const filteredPurchases = purchases.filter((p) => {
    if (selectedSupplierId !== 'all' && p.supplierId !== selectedSupplierId) return false
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchNum = p.purchaseNumber?.toLowerCase().includes(q)
      const matchInv = p.supplierInvoiceNumber?.toLowerCase().includes(q)
      if (!matchNum && !matchInv) return false
    }
    return true
  })

  // Summary Metrics
  const totalPurchaseVal = filteredPurchases.reduce((sum, p) => (p.status !== 'cancelled' ? sum + p.total : sum), 0)
  const totalPaidVal = filteredPurchases.reduce((sum, p) => (p.status !== 'cancelled' ? sum + p.paidAmount : sum), 0)
  const totalDueVal = filteredPurchases.reduce((sum, p) => (p.status !== 'cancelled' ? sum + p.dueAmount : sum), 0)
  const hasTotalDue = totalDueVal > 0

  const supplierMap = new Map(suppliers.map((s) => [s.$id, s]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="h-7 w-7 text-indigo-600 shrink-0" />
            Stock Purchases & Intake
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Record purchase orders from vendors, update inventory stock, and track supplier payables.
          </p>
        </div>

        <Button
          onClick={() => setIsNewPurchaseOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Record New Purchase
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-slate-500">Total Purchase Orders</div>
          <div className="text-2xl font-bold font-mono text-slate-900">{filteredPurchases.length}</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-slate-500">Total Purchase Value</div>
          <div className="text-2xl font-bold font-mono text-slate-900">Rs. {formatMoney(totalPurchaseVal)}</div>
        </div>

        <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-emerald-700">Paid Amount</div>
          <div className="text-2xl font-bold font-mono text-emerald-800">Rs. {formatMoney(totalPaidVal)}</div>
        </div>

        <div className={`p-4 rounded-xl border shadow-2xs space-y-1 transition-colors ${
          hasTotalDue ? 'bg-red-50/70 border-red-200 text-red-900' : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${hasTotalDue ? 'text-red-700' : 'text-slate-500'}`}>
              Supplier Due Balance
            </span>
            {!hasTotalDue && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                Settled
              </span>
            )}
          </div>
          <div className={`text-2xl font-bold font-mono ${hasTotalDue ? 'text-red-800' : 'text-slate-800'}`}>
            Rs. {formatMoney(totalDueVal)}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Search purchases"
            placeholder="Search by purchase # or bill #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter purchases by supplier"
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.$id} value={s.$id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter purchases by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending Due</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {isFilterActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-xs font-semibold gap-1 border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <FilterX className="h-3.5 w-3.5" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Purchase List Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="space-y-1.5 w-1/4">
                  <div className="h-3 bg-slate-200 rounded w-24"></div>
                  <div className="h-2.5 bg-slate-100 rounded w-16"></div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-24"></div>
                <div className="h-3 bg-slate-200 rounded w-16"></div>
                <div className="h-3 bg-slate-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-xs text-red-700 font-semibold">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs font-bold gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </Button>
          </div>
        ) : purchases.length === 0 ? (
          /* Global Empty State */
          <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 p-6 text-center">
            <ShoppingBag className="h-10 w-10 mb-2 stroke-[1.5] text-slate-300" />
            <span className="font-bold text-slate-700 text-sm mb-1">No purchases yet</span>
            <span className="text-slate-500 mb-4 max-w-sm">
              Record your first stock purchase to start tracking supplier inventory and payable balances.
            </span>
            <Button
              onClick={() => setIsNewPurchaseOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Record New Purchase
            </Button>
          </div>
        ) : filteredPurchases.length === 0 ? (
          /* Filtered Empty State */
          <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 p-6 text-center">
            <FilterX className="h-8 w-8 mb-2 text-slate-300" />
            <span className="font-bold text-slate-700 text-sm mb-1">No purchases match your filters</span>
            <span className="text-slate-500 mb-3">Try adjusting your search term, supplier, or status filters.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs font-bold border-slate-200 text-slate-700"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="py-3 px-4">Purchase #</th>
                    <th className="py-3 px-3">Supplier</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Total Amount</th>
                    <th className="py-3 px-3 text-right">Paid</th>
                    <th className="py-3 px-3 text-right">Due Balance</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredPurchases.map((p) => {
                    const supplier = supplierMap.get(p.supplierId)
                    const isCancelled = p.status === 'cancelled'
                    const hasDue = (p.dueAmount || 0) > 0

                    return (
                      <tr key={p.$id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                          {p.purchaseNumber || `PUR-${p.$id.slice(-6)}`}
                          {p.supplierInvoiceNumber && (
                            <div className="text-[10px] text-slate-500 font-normal">
                              Bill #: {p.supplierInvoiceNumber}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 font-bold text-slate-900">
                          {supplier ? supplier.name : 'Unknown Vendor'}
                        </td>

                        <td className="py-3 px-3 font-mono text-slate-600">
                          {new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          Rs. {formatMoney(p.total)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          Rs. {formatMoney(p.paidAmount)}
                        </td>

                        <td className={`py-3 px-3 text-right font-mono font-bold ${hasDue ? 'text-red-600' : 'text-slate-700'}`}>
                          Rs. {formatMoney(p.dueAmount)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPurchase(p)
                                setIsDetailOpen(true)
                              }}
                              className="h-8 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 font-semibold gap-1"
                              aria-label={`View purchase ${p.purchaseNumber || p.$id}`}
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </Button>

                            {!isCancelled && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCancelTarget(p)
                                  setCancelReason('')
                                  setCancelError(null)
                                }}
                                className="h-8 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Cancel purchase order"
                                aria-label={`Cancel purchase ${p.purchaseNumber || p.$id}`}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredPurchases.map((p) => {
                const supplier = supplierMap.get(p.supplierId)
                const isCancelled = p.status === 'cancelled'
                const hasDue = (p.dueAmount || 0) > 0

                return (
                  <div key={p.$id} className="p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-700">
                        {p.purchaseNumber || `PUR-${p.$id.slice(-6)}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span>{supplier ? supplier.name : 'Unknown Vendor'}</span>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">
                        {new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    {p.supplierInvoiceNumber && (
                      <div className="text-[11px] text-slate-500 font-mono">
                        Bill #: {p.supplierInvoiceNumber}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-50 grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-sans uppercase">Total</div>
                        <div className="font-bold text-slate-900">Rs. {formatMoney(p.total)}</div>
                      </div>
                      <div className="bg-emerald-50/40 p-1.5 rounded border border-emerald-100">
                        <div className="text-[10px] text-emerald-700 font-sans uppercase">Paid</div>
                        <div className="font-bold text-emerald-800">Rs. {formatMoney(p.paidAmount)}</div>
                      </div>
                      <div className={`p-1.5 rounded border ${hasDue ? 'bg-red-50/60 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`text-[10px] font-sans uppercase ${hasDue ? 'text-red-700' : 'text-slate-400'}`}>Due</div>
                        <div className={`font-bold ${hasDue ? 'text-red-700' : 'text-slate-700'}`}>Rs. {formatMoney(p.dueAmount)}</div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPurchase(p)
                          setIsDetailOpen(true)
                        }}
                        className="h-8 text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Details
                      </Button>

                      {!isCancelled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCancelTarget(p)
                            setCancelReason('')
                            setCancelError(null)
                          }}
                          className="h-8 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 gap-1"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Cancellation Confirmation Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open && !cancelling) setCancelTarget(null) }}>
        <DialogContent className="sm:max-w-md border-slate-200 bg-white text-slate-900 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Cancel Purchase Order?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to cancel purchase #{cancelTarget?.purchaseNumber || cancelTarget?.$id}?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                Accounting & Inventory Impact:
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-800">
                <li>Received product stock levels will be reduced</li>
                <li>Supplier payable balances will be updated</li>
                <li>Transaction status will be permanently marked as CANCELLED</li>
              </ul>
            </div>

            {cancelError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold" role="alert">
                {cancelError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cancel-reason" className="text-xs font-bold text-slate-700">
                Cancellation Reason *
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="e.g. Returned goods to vendor, billing error..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={cancelling}
                className="h-20 text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
              className="font-semibold text-slate-700"
            >
              Keep Purchase
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCancelPurchase}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling Order...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New & Detail Modals */}
      <PurchaseDialog
        isOpen={isNewPurchaseOpen}
        onClose={() => setIsNewPurchaseOpen(false)}
        onSubmit={handleCreatePurchase}
        suppliers={suppliers}
        products={products}
        isLoading={actionLoading}
      />

      <PurchaseDetailDialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        purchase={selectedPurchase}
      />
    </div>
  )
}

