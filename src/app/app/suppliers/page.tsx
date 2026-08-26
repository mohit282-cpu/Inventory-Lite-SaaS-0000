"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supplierService } from '@/services/supplier.service'
import { Supplier } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SupplierDialog } from '@/components/features/suppliers/supplier-dialog'
import { SupplierPaymentDialog } from '@/components/features/suppliers/supplier-payment-dialog'
import { SupplierLedgerDialog } from '@/components/features/suppliers/supplier-ledger-dialog'
import {
  Truck,
  Plus,
  Search,
  DollarSign,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Loader2,
  Phone,
  MapPin,
} from 'lucide-react'
import { formatMoney } from '@/lib/money'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SupplierInput, SupplierPaymentInput } from '@/lib/validations'
import { supplierPaymentService } from '@/services/supplier-payment.service'

export default function SuppliersPage() {
  const { activeBusiness, user } = useAuth()
  const businessId = activeBusiness?.$id || ''
  const userId = user?.$id || ''

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

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
      const list = await supplierService.listSuppliers(businessId, {
        searchTerm: searchQuery,
      })
      setSuppliers(list)
    } catch (err) {
      console.error('Failed to load suppliers:', err)
    } finally {
      setLoading(false)
    }
  }, [businessId, searchQuery])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const handleCreateOrUpdateSupplier = async (data: SupplierInput) => {
    if (!businessId || !userId) return
    setActionLoading(true)
    try {
      if (selectedSupplier) {
        await supplierService.updateSupplier(selectedSupplier.$id, data, businessId, userId)
      } else {
        await supplierService.createSupplier(data, businessId, userId)
      }
      await loadSuppliers()
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecordPayment = async (data: SupplierPaymentInput) => {
    if (!businessId || !userId) return
    setActionLoading(true)
    try {
      await supplierPaymentService.createSupplierPayment(data, businessId, userId)
      await loadSuppliers()
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteSupplier = async () => {
    if (!businessId || !userId || !deleteSupplier) return
    setDeleteLoading(true)
    try {
      await supplierService.deleteSupplier(deleteSupplier.$id, businessId, userId)
      await loadSuppliers()
    } catch (err: any) {
      alert(err?.message || 'Failed to delete supplier')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Summary Metrics
  const totalPurchases = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0)
  const totalPaid = suppliers.reduce((sum, s) => sum + (s.totalPaid || 0), 0)
  const totalPayable = suppliers.reduce((sum, s) => sum + (s.outstandingPayable || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Truck className="h-7 w-7 text-indigo-600" />
            Supplier Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage vendors, track purchases, payable balances, and supplier payment ledger history.
          </p>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search suppliers by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Supplier List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-500 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <span>Loading supplier records...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400">
            <Truck className="h-10 w-10 mb-2 stroke-[1.5]" />
            <span className="font-semibold text-slate-600">No suppliers found</span>
            <span className="mt-0.5">Click &quot;Add New Supplier&quot; to register your first vendor.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {suppliers.map((s) => (
                  <tr key={s.$id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                      {s.address && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" /> {s.address}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {s.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-400" /> {s.phone}
                        </div>
                      ) : (
                        '—'
                      )}
                      {s.email && <div className="text-[11px] text-slate-400">{s.email}</div>}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {s.panVatNumber ? s.panVatNumber : '—'}
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
                          disabled={s.outstandingPayable <= 0}
                          className="h-7 text-[11px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 px-2"
                          title="Record supplier payment"
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
                          className="h-7 text-[11px] font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50 px-2"
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
                          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
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
                          disabled={(s.totalPurchases || 0) > 0 || (s.totalPaid || 0) > 0 || (s.outstandingPayable || 0) > 0}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Delete supplier"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteLoading}
      />
    </div>
  )
}
