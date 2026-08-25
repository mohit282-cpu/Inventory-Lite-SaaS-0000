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
  ShoppingBag,
  Plus,
  Search,
  Eye,
  XCircle,
  Loader2,
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

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | 'all'>('all')

  // Modals
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!businessId) return
    try {
      setLoading(true)
      const [fetchedPurchases, fetchedSuppliers, fetchedProducts] = await Promise.all([
        purchaseService.listPurchases(businessId),
        supplierService.listAllSuppliers(businessId),
        productService.listAllProducts(businessId),
      ])
      setPurchases(fetchedPurchases)
      setSuppliers(fetchedSuppliers)
      setProducts(fetchedProducts)
    } catch (err) {
      console.error('Failed to load purchases:', err)
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

  const handleCancelPurchase = async (purchase: Purchase) => {
    if (!businessId || !userId) return
    const reason = prompt(`Enter reason for cancelling purchase #${purchase.purchaseNumber || purchase.$id}:`)
    if (!reason || reason.trim() === '') return

    try {
      await purchaseService.cancelPurchase(purchase.$id, businessId, userId, reason)
      await loadData()
    } catch (err: any) {
      alert(err?.message || 'Failed to cancel purchase transaction')
    }
  }

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

  const supplierMap = new Map(suppliers.map((s) => [s.$id, s]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="h-7 w-7 text-indigo-600" />
            Stock Purchases & Intake
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Record purchase orders from vendors, update inventory stock, and track supplier payables.
          </p>
        </div>

        <Button
          onClick={() => setIsNewPurchaseOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Record New Purchase
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-slate-500">Total Purchase Orders</div>
          <div className="text-2xl font-bold font-mono text-slate-900">{filteredPurchases.length}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-slate-500">Total Purchase Value</div>
          <div className="text-2xl font-bold font-mono text-slate-900">Rs. {formatMoney(totalPurchaseVal)}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-slate-500">Paid Amount</div>
          <div className="text-2xl font-bold font-mono text-emerald-700">Rs. {formatMoney(totalPaidVal)}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-slate-500">Supplier Due Balance</div>
          <div className="text-2xl font-bold font-mono text-red-600">Rs. {formatMoney(totalDueVal)}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by purchase # or bill #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700"
          >
            <option value="all">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.$id} value={s.$id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 font-medium text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending Due</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Purchase List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-500 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <span>Loading purchase history records...</span>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400">
            <ShoppingBag className="h-10 w-10 mb-2 stroke-[1.5]" />
            <span className="font-semibold text-slate-600">No purchases found</span>
            <span className="mt-0.5">Record a purchase intake to add stock to your inventory.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
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

                  return (
                    <tr key={p.$id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {p.purchaseNumber || `PUR-${p.$id.slice(-6)}`}
                        {p.supplierInvoiceNumber && (
                          <div className="text-[10px] text-slate-400 font-normal">
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
                      <td className="py-3 px-3 text-right font-mono font-bold text-red-600">
                        Rs. {formatMoney(p.dueAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPurchase(p)
                              setIsDetailOpen(true)
                            }}
                            className="h-7 text-[11px] font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 px-2"
                            title="View purchase details"
                          >
                            <Eye className="mr-1 h-3 w-3" /> View
                          </Button>
                          {p.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelPurchase(p)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                              title="Cancel purchase order"
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
        )}
      </div>

      {/* Modals */}
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
