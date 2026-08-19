"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { customerService } from '@/services/customer.service'
import { saleService } from '@/services/sale.service'
import { paymentService } from '@/services/payment.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { Customer, Sale, PaymentMethod } from '@/types'
import { DollarSign, Loader2, CheckCircle2 } from 'lucide-react'

interface RecordPaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedCustomerId?: string
  preselectedSaleId?: string
}

export function RecordPaymentDialog({
  isOpen,
  onClose,
  onSuccess,
  preselectedCustomerId,
  preselectedSaleId,
}: RecordPaymentDialogProps) {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId || '')
  const [selectedSaleId, setSelectedSaleId] = useState<string>(preselectedSaleId || '')
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [referenceNumber, setReferenceNumber] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Fetch customers and sales when dialog opens
  useEffect(() => {
    if (!isOpen || !activeBusiness?.$id) return

    async function loadData() {
      try {
        setIsLoadingCatalog(true)
        const [custDocs, saleDocs] = await Promise.all([
          customerService.listCustomers(activeBusiness!.$id),
          saleService.listSales(activeBusiness!.$id),
        ])
        setCustomers(custDocs)

        // Only keep sales that have remaining due balance
        const openSales = saleDocs.filter((s) => s.dueAmount > 0)
        setSales(openSales)

        if (preselectedCustomerId) {
          setSelectedCustomerId(preselectedCustomerId)
        }
        if (preselectedSaleId) {
          setSelectedSaleId(preselectedSaleId)
        }
      } catch (err: any) {
        toast({
          title: 'Error loading payment form',
          description: err.message || 'Failed to fetch customer sales.',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingCatalog(false)
      }
    }

    loadData()
  }, [isOpen, activeBusiness, preselectedCustomerId, preselectedSaleId, toast])

  // Filter sales available for selected customer
  const availableSales = React.useMemo(() => {
    if (!selectedCustomerId) return sales
    return sales.filter((s) => s.customerId === selectedCustomerId)
  }, [selectedCustomerId, sales])

  // Get currently selected sale object
  const currentSale = React.useMemo(() => {
    return sales.find((s) => s.$id === selectedSaleId) || null
  }, [selectedSaleId, sales])

  // Auto fill payment amount with full remaining due when a sale is picked
  useEffect(() => {
    if (currentSale) {
      setPaymentAmountInput(currentSale.dueAmount.toString())
    }
  }, [currentSale])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBusiness?.$id || !user?.$id) return

    if (!selectedSaleId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a sale transaction with an outstanding balance.',
        variant: 'destructive',
      })
      return
    }

    const amount = parseFloat(paymentAmountInput) || 0
    if (amount <= 0) {
      toast({
        title: 'Invalid Payment Amount',
        description: 'Payment amount must be greater than zero.',
        variant: 'destructive',
      })
      return
    }

    if (currentSale && amount > currentSale.dueAmount + 0.01) {
      toast({
        title: 'Overpayment Not Allowed',
        description: `Payment amount (Rs. ${amount.toFixed(2)}) cannot exceed remaining due (Rs. ${currentSale.dueAmount.toFixed(2)}).`,
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      await paymentService.createPayment(
        {
          saleId: selectedSaleId,
          customerId: selectedCustomerId || currentSale?.customerId,
          invoiceId: currentSale?.invoiceId,
          amount,
          paymentMethod,
          paymentDate: new Date(paymentDate).toISOString(),
          referenceNumber,
          notes,
        },
        activeBusiness.$id,
        user.$id
      )

      toast({
        title: 'Payment Recorded Successfully!',
        description: `Recorded payment of Rs. ${amount.toFixed(2)} for ${
          currentSale?.saleNumber || 'Sale'
        }.`,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Payment Failed',
        description: err.message || 'Failed to record payment transaction.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-slate-200 bg-white text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">Record Customer Payment</DialogTitle>
              <p className="text-xs text-slate-500 font-normal">
                Settle or collect partial payments for outstanding credit transactions.
              </p>
            </div>
          </div>
        </DialogHeader>

        {isLoadingCatalog ? (
          <div className="flex items-center justify-center p-8 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mr-2" /> Loading active credit accounts...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Customer Filter / Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-slate-700">Customer</Label>
              <Select
                value={selectedCustomerId}
                onValueChange={(val) => {
                  setSelectedCustomerId(val)
                  setSelectedSaleId('')
                }}
              >
                <SelectTrigger className="h-10 text-xs font-medium bg-white border-slate-300">
                  <SelectValue placeholder="All Customers with Credit" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="all">-- All Customers --</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.$id} value={c.$id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} {c.totalDue > 0 ? `· Due: Rs. ${c.totalDue.toFixed(2)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sale / Invoice Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-slate-700">Select Sale / Invoice Transaction *</Label>
              <Select value={selectedSaleId} onValueChange={setSelectedSaleId}>
                <SelectTrigger className="h-10 text-xs font-medium bg-white border-slate-300">
                  <SelectValue placeholder={availableSales.length === 0 ? 'No outstanding credit sales found' : 'Select Invoice / Sale...'} />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {availableSales.map((s) => (
                    <SelectItem key={s.$id} value={s.$id}>
                      {s.saleNumber || `SALE-${s.$id.slice(-6)}`} · Total: Rs. {s.total.toFixed(2)} · Due: Rs. {s.dueAmount.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Sale Outstanding Due Summary Banner */}
            {currentSale && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Total Sale Invoice:</span>
                  <span className="font-mono font-bold text-slate-900">Rs. {currentSale.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Already Paid:</span>
                  <span className="font-mono font-bold text-emerald-700">Rs. {currentSale.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-800 pt-1 border-t border-slate-200">
                  <span>Remaining Credit Due:</span>
                  <span className="font-mono font-extrabold text-sm">Rs. {currentSale.dueAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Payment Amount & Payment Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-700">Payment Amount (Rs.) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={currentSale ? currentSale.dueAmount : undefined}
                  placeholder="0.00"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="h-10 font-mono font-bold text-sm bg-white border-slate-300 text-emerald-700"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-700">Payment Date *</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-10 text-xs font-medium bg-white border-slate-300"
                  required
                />
              </div>
            </div>

            {/* Payment Method & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-700">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}>
                  <SelectTrigger className="h-10 text-xs font-medium bg-white border-slate-300">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="eSewa">eSewa</SelectItem>
                    <SelectItem value="Khalti">Khalti</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-700">Reference / Txn #</Label>
                <Input
                  type="text"
                  placeholder="e.g. TXN-99812"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="h-10 text-xs font-mono bg-white border-slate-300"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-slate-700">Payment Notes (Optional)</Label>
              <textarea
                placeholder="Add receipt details or notes..."
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                className="w-full h-16 p-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="border-slate-300 bg-white text-slate-700 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedSaleId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-5 shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Record Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
