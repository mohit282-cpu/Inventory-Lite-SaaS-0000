"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supplierService } from '@/services/supplier.service'
import { Supplier } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { SupplierDialog } from '@/components/features/suppliers/supplier-dialog'
import { SupplierPaymentDialog } from '@/components/features/suppliers/supplier-payment-dialog'
import { SupplierLedgerDialog } from '@/components/features/suppliers/supplier-ledger-dialog'
import { useDebounce } from '@/hooks/use-debounce'
import { useToast } from '@/components/ui/use-toast'
import {
  Truck,
  Plus,
  Search,
  DollarSign,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  AlertCircle,
  RefreshCw,
  Mail,
} from 'lucide-react'
import { formatMoney } from '@/lib/money'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SupplierInput, SupplierPaymentInput } from '@/lib/validations'
import { supplierPaymentService } from '@/services/supplier-payment.service'

export default function SuppliersPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()
  const businessId = activeBusiness?.$id || ''
  const userId = user?.$id || ''

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null)

  const [isLedgerOpen, setIsLedgerOpen] = useState(false)
  const [ledgerSupplier, setLedgerSupplier] = useState<Supplier | null>(null)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)

  const loadSuppliers = useCallback(async () => {
    if (!businessId) return
    try {
      setLoading(true)
      setLoadError(null)
      const list = await supplierService.listSuppliers(businessId)
      setSuppliers(list || [])
    } catch (err: any) {
      console.error('Failed to load suppliers:', err)
      setLoadError(err?.message || 'Failed to load supplier records.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const handleCreateOrUpdateSupplier = async (data: SupplierInput) => {
    if (!businessId || !userId) return
    setActionLoading(true)
    try {
      if (selectedSupplier) {
        await supplierService.updateSupplier(selectedSupplier.$id, data, businessId, userId)
        toast({
          title: 'Supplier Updated',
          description: `Supplier "${data.name}" updated successfully.`,
        })
      } else {
        await supplierService.createSupplier(data, businessId, userId)
        toast({
          title: 'Supplier Created',
          description: `Supplier "${data.name}" registered successfully.`,
        })
      }
      await loadSuppliers()
    } catch (err: any) {
      toast({
        title: 'Supplier Error',
        description: err?.message || 'Failed to save supplier details.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecordPayment = async (data: SupplierPaymentInput) => {
    if (!businessId || !userId) return
    setActionLoading(true)
    try {
      await supplierPaymentService.createSupplierPayment(data, businessId, userId)
      toast({
        title: 'Payment Recorded',
        description: `Payment of Rs. ${formatMoney(data.amount)} recorded successfully.`,
      })
      await loadSuppliers()
    } catch (err: any) {
      toast({
        title: 'Payment Error',
        description: err?.message || 'Failed to record supplier payment.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteSupplier = async () => {
    if (!businessId || !userId || !deleteSupplier) return

    // Transaction history protection check
    const hasHistory =
      (deleteSupplier.totalPurchases || 0) > 0 ||
      (deleteSupplier.totalPaid || 0) > 0 ||
      (deleteSupplier.outstandingPayable || 0) > 0

    if (hasHistory) {
      toast({
        title: 'Deletion Blocked',
        description: 'This supplier cannot be deleted because transaction history exists.',
        variant: 'destructive',
      })
      setIsDeleteOpen(false)
      setDeleteSupplier(null)
      return
    }

    setDeleteLoading(true)
    try {
      await supplierService.deleteSupplier(deleteSupplier.$id, businessId, userId)
      toast({
        title: 'Supplier Deleted',
        description: `Supplier "${deleteSupplier.name}" removed successfully.`,
      })
      await loadSuppliers()
      setIsDeleteOpen(false)
      setDeleteSupplier(null)
    } catch (err: any) {
      toast({
        title: 'Delete Error',
        description: err?.message || 'Failed to delete supplier.',
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  // Multi-field Search Filter
  const filteredSuppliers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return suppliers
    const q = debouncedSearchQuery.trim().toLowerCase()
    return suppliers.filter((s) => {
      const nameMatch = (s.name || '').toLowerCase().includes(q)
      const phoneMatch = (s.phone || '').toLowerCase().includes(q)
      const emailMatch = (s.email || '').toLowerCase().includes(q)
      const panMatch = (s.panVatNumber || '').toLowerCase().includes(q)
      const addressMatch = (s.address || '').toLowerCase().includes(q)

      return nameMatch || phoneMatch || emailMatch || panMatch || addressMatch
    })
  }, [debouncedSearchQuery, suppliers])

  // Summary Metrics
  const totalPurchases = useMemo(
    () => suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0),
    [suppliers]
  )
  const totalPaid = useMemo(
    () => suppliers.reduce((sum, s) => sum + (s.totalPaid || 0), 0),
    [suppliers]
  )
  const totalPayable = useMemo(
    () => suppliers.reduce((sum, s) => sum + (s.outstandingPayable || 0), 0),
    [suppliers]
  )

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <PageHeader
        title="Supplier Management"
        description="Manage vendors, track purchases, payable balances, and supplier payment ledger history."
        actions={
          <Button
            onClick={() => {
              setSelectedSupplier(null)
              setIsAddEditOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add New Supplier
          </Button>
        }
      />

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-slate-500">Total Suppliers</div>
          <div className="text-2xl font-bold font-mono text-slate-900">{suppliers.length}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-slate-500">Total Purchases</div>
          <div className="text-2xl font-bold font-mono text-slate-900">Rs. {formatMoney(totalPurchases)}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-slate-500">Total Paid</div>
          <div className="text-2xl font-bold font-mono text-emerald-700">Rs. {formatMoney(totalPaid)}</div>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-xs font-semibold text-slate-500">Outstanding Payable</div>
          <div className="text-2xl font-bold font-mono text-red-600">Rs. {formatMoney(totalPayable)}</div>
        </div>
      </div>

      {/* Compact Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-2.5 border border-slate-200 rounded-xl shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search suppliers by name, phone, email, or PAN/VAT..."
            aria-label="Search suppliers by name, phone, email, or PAN/VAT"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </div>
      </div>

      {/* Supplier List Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="p-8 text-center text-slate-800 space-y-3">
            <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
            <h3 className="text-sm font-bold">Unable to load suppliers</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto">{loadError}</p>
            <Button onClick={loadSuppliers} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try Again
            </Button>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 space-y-3">
            <Truck className="h-10 w-10 text-slate-400 mx-auto stroke-[1.5]" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">No suppliers yet</p>
              <p className="text-slate-500">Add your first supplier to start tracking purchases and payables.</p>
            </div>
            <Button
              onClick={() => {
                setSelectedSupplier(null)
                setIsAddEditOpen(true)
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add New Supplier
            </Button>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 space-y-2">
            <Search className="h-8 w-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-800">No suppliers found</p>
            <p className="text-slate-500 max-w-md mx-auto">
              Try another supplier name, phone number, email, or PAN/VAT number.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">PAN/VAT #</th>
                    <th className="py-3 px-3 text-right">Total Purchases</th>
                    <th className="py-3 px-3 text-right">Total Paid</th>
                    <th className="py-3 px-3 text-right">Payable Balance</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredSuppliers.map((s) => {
                    const hasPayable = (s.outstandingPayable || 0) > 0
                    const hasHistory =
                      (s.totalPurchases || 0) > 0 ||
                      (s.totalPaid || 0) > 0 ||
                      (s.outstandingPayable || 0) > 0

                    return (
                      <tr key={s.$id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                          {s.address && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-normal">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> {s.address}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {s.phone ? (
                            <div className="flex items-center gap-1 font-mono font-medium text-slate-800">
                              <Phone className="h-3 w-3 text-slate-400 shrink-0" /> {s.phone}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">N/A</span>
                          )}
                          {s.email && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-slate-400 shrink-0" /> {s.email}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {s.panVatNumber ? s.panVatNumber : <span className="text-slate-400">N/A</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          Rs. {formatMoney(s.totalPurchases || 0)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          Rs. {formatMoney(s.totalPaid || 0)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-extrabold text-red-600">
                          Rs. {formatMoney(s.outstandingPayable || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPaymentSupplier(s)
                                setIsPaymentOpen(true)
                              }}
                              disabled={!hasPayable}
                              aria-label={`Pay supplier ${s.name}`}
                              className="h-7 text-[11px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 px-2 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-emerald-500"
                              title={hasPayable ? "Record supplier payment" : "No outstanding payable balance"}
                            >
                              <DollarSign className="mr-1 h-3 w-3" /> Pay
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLedgerSupplier(s)
                                setIsLedgerOpen(true)
                              }}
                              aria-label={`View ledger for ${s.name}`}
                              className="h-7 text-[11px] font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 px-2 focus-visible:ring-2 focus-visible:ring-indigo-500"
                              title="View supplier ledger"
                            >
                              <FileSpreadsheet className="mr-1 h-3 w-3" /> Ledger
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSupplier(s)
                                setIsAddEditOpen(true)
                              }}
                              aria-label={`Edit supplier ${s.name}`}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500"
                              title="Edit supplier"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteSupplier(s)
                                setIsDeleteOpen(true)
                              }}
                              disabled={hasHistory}
                              aria-label={`Delete supplier ${s.name}`}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-red-500"
                              title={hasHistory ? "Cannot delete supplier with active transaction history" : "Delete supplier"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 768px) */}
            <div className="md:hidden space-y-3 p-3">
              {filteredSuppliers.map((s) => {
                const hasPayable = (s.outstandingPayable || 0) > 0
                const hasHistory =
                  (s.totalPurchases || 0) > 0 ||
                  (s.totalPaid || 0) > 0 ||
                  (s.outstandingPayable || 0) > 0

                return (
                  <div key={s.$id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                        {s.address && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> {s.address}
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                        PAN/VAT: {s.panVatNumber || 'N/A'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Phone</span>
                        <span className="font-mono font-medium text-slate-800">{s.phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Email</span>
                        <span className="text-slate-800 truncate block">{s.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Purchases</span>
                        <span className="font-mono font-bold text-slate-900">Rs. {formatMoney(s.totalPurchases || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Payable Balance</span>
                        <span className="font-mono font-extrabold text-red-600">Rs. {formatMoney(s.outstandingPayable || 0)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPaymentSupplier(s)
                          setIsPaymentOpen(true)
                        }}
                        disabled={!hasPayable}
                        aria-label={`Pay supplier ${s.name}`}
                        className="h-8 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 px-2.5 disabled:opacity-40"
                      >
                        <DollarSign className="mr-1 h-3.5 w-3.5" /> Pay
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLedgerSupplier(s)
                          setIsLedgerOpen(true)
                        }}
                        aria-label={`View ledger for ${s.name}`}
                        className="h-8 text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 px-2.5"
                      >
                        <FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Ledger
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSupplier(s)
                          setIsAddEditOpen(true)
                        }}
                        aria-label={`Edit supplier ${s.name}`}
                        className="h-8 w-8 p-0 text-slate-600"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteSupplier(s)
                          setIsDeleteOpen(true)
                        }}
                        disabled={hasHistory}
                        aria-label={`Delete supplier ${s.name}`}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <SupplierDialog
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        onSubmit={handleCreateOrUpdateSupplier}
        supplier={selectedSupplier}
        isLoading={actionLoading}
      />

      <SupplierPaymentDialog
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSubmit={handleRecordPayment}
        supplier={paymentSupplier}
        isLoading={actionLoading}
      />

      <SupplierLedgerDialog
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        supplier={ledgerSupplier}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setDeleteSupplier(null)
        }}
        onConfirm={handleDeleteSupplier}
        title="Delete Supplier"
        description={`Are you sure you want to permanently delete "${deleteSupplier?.name}"? This action cannot be undone.`}
        confirmText="Delete Supplier"
        variant="destructive"
        isLoading={deleteLoading}
      />
    </div>
  )
}
