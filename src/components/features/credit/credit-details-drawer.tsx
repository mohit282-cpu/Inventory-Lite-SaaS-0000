"use client"

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CreditLedgerItem, paymentService } from '@/services/payment.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react'
import { RecordPaymentDialog } from './record-payment-dialog'

interface CreditDetailsDrawerProps {
  item: CreditLedgerItem | null
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
}

export function CreditDetailsDrawer({
  item,
  isOpen,
  onClose,
  onRefresh,
}: CreditDetailsDrawerProps) {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit payment form states
  const [editAmountInput, setEditAmountInput] = useState('')
  const [editMethod, setEditMethod] = useState('cash')
  const [editDate, setEditDate] = useState('')
  const [editRef, setEditRef] = useState('')
  const [editNotes, setEditNotes] = useState('')

  if (!item) return null

  const handleOpenEdit = (p: any) => {
    setEditingPayment(p)
    setEditAmountInput(String(p.amount))
    setEditMethod(p.paymentMethod || 'cash')
    setEditDate(
      p.paymentDate
        ? new Date(p.paymentDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    )
    setEditRef(p.referenceNumber || '')
    setEditNotes(p.notes || '')
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBusiness?.$id || !user?.$id || !editingPayment) return

    const amount = parseFloat(editAmountInput)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive payment amount.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      await paymentService.updatePayment(
        editingPayment.$id,
        {
          amount,
          paymentMethod: editMethod as any,
          paymentDate: new Date(editDate).toISOString(),
          referenceNumber: editRef,
          notes: editNotes,
        },
        activeBusiness.$id,
        user.$id
      )

      toast({
        title: 'Payment Updated',
        description: `Updated payment details to Rs. ${amount.toFixed(2)}.`,
      })

      setIsEditModalOpen(false)
      setEditingPayment(null)
      onRefresh()
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Failed to update payment record.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePayment = async () => {
    if (!activeBusiness?.$id || !user?.$id || !deletingPaymentId) return

    setIsSubmitting(true)
    try {
      await paymentService.deletePayment(deletingPaymentId, activeBusiness.$id, user.$id)
      toast({
        title: 'Payment Deleted',
        description: 'Payment record was removed and due balance recalculated.',
      })

      setIsDeleteModalOpen(false)
      setDeletingPaymentId(null)
      onRefresh()
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete payment record.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl border-slate-200 bg-white text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-lg shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900">{item.customerName}</DialogTitle>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {item.saleNumber} {item.invoiceNumber ? `(${item.invoiceNumber})` : ''}
                  </div>
                </div>
              </div>

              <span
                className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border ${
                  item.status === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : item.status === 'PARTIAL'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : item.status === 'OVERDUE'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {item.status}
              </span>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Customer Contact Details Banner */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="font-mono">{item.customerPhone || 'No phone number'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>{item.customerEmail || 'No email address'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>{item.customerAddress || 'No address recorded'}</span>
              </div>
            </div>

            {/* Financial Breakdown KPI Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500">Total Invoice</div>
                <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                  Rs. {item.totalAmount.toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500">Total Paid</div>
                <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                  Rs. {item.paidAmount.toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500">Credit / Due</div>
                <div
                  className={`text-sm font-extrabold font-mono mt-0.5 ${
                    item.dueAmount > 0 ? 'text-amber-800' : 'text-slate-500'
                  }`}
                >
                  Rs. {item.dueAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            {item.dueAmount > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <div className="text-xs font-bold text-indigo-900">
                  Outstanding Balance: <span className="font-mono text-indigo-700">Rs. {item.dueAmount.toFixed(2)}</span>
                </div>
                <Button
                  onClick={() => setIsRecordPaymentOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 shadow-xs text-xs"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Record Payment
                </Button>
              </div>
            )}

            {/* Payment History List */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Payment History ({item.payments.length})
              </h4>

              {item.payments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 border border-slate-200 rounded-xl bg-slate-50">
                  No payment entries recorded for this invoice transaction yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-50 uppercase text-[10px] font-extrabold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Amount</th>
                        <th className="px-3 py-2.5">Method</th>
                        <th className="px-3 py-2.5">Ref #</th>
                        <th className="px-3 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {item.payments.map((p) => (
                        <tr key={p.$id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-slate-600 font-medium">
                            {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-emerald-700">
                            Rs. {p.amount.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-slate-700 font-medium capitalize">
                            {p.paymentMethod}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500">
                            {p.referenceNumber || '-'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex items-center gap-1 justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                title="Edit Payment Record"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingPaymentId(p.$id)
                                  setIsDeleteModalOpen(true)
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                                title="Delete Payment Record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Trigger Dialog */}
      <RecordPaymentDialog
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSuccess={() => {
          onRefresh()
          onClose()
        }}
        preselectedCustomerId={item.customerId}
        preselectedSaleId={item.saleId}
      />

      {/* Edit Payment Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-slate-200 text-slate-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Edit Payment Record</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Payment Amount (Rs.)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={editAmountInput}
                onChange={(e) => setEditAmountInput(e.target.value)}
                className="h-9 font-mono font-bold text-sm bg-white border-slate-300"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Method</Label>
                <Input
                  type="text"
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                  className="h-9 text-xs bg-white border-slate-300"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-9 text-xs bg-white border-slate-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Reference Number</Label>
              <Input
                type="text"
                value={editRef}
                onChange={(e) => setEditRef(e.target.value)}
                className="h-9 text-xs font-mono bg-white border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="h-8 text-xs border-slate-300 bg-white text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeletePayment}
        title="Delete Payment Entry"
        description="Are you sure you want to delete this payment entry? The sale due balance and customer total due will be automatically restored."
        confirmText="Delete Payment"
        isLoading={isSubmitting}
      />
    </>
  )
}
