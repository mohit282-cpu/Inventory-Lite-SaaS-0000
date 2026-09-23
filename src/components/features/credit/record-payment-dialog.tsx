"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
import { DollarSign, Loader2, CheckCircle2, AlertCircle, User, Receipt } from 'lucide-react'
import { formatMoney } from '@/lib/money'

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

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(preselectedCustomerId || 'all')
  const [selectedSaleId, setSelectedSaleId] = useState<string>(preselectedSaleId || '')
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [referenceNumber, setReferenceNumber] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync state whenever the dialog opens or preselected props change
  useEffect(() => {
    if (!isOpen) return

    setSelectedCustomerId(preselectedCustomerId || 'all')
    setSelectedSaleId(preselectedSaleId || '')
    setPaymentAmountInput('')
    setPaymentMethod('cash')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setReferenceNumber('')
    setNotes('')
    setLoadError(null)
  }, [isOpen, preselectedCustomerId, preselectedSaleId])

  // Load active customers and open sales when dialog opens
  const loadData = useCallback(async () => {
    if (!isOpen || !activeBusiness?.$id) return

    try {
      setIsLoadingCatalog(true)
      setLoadError(null)
      const [custDocs, saleDocs] = await Promise.all([
        customerService.listCustomers(activeBusiness.$id),
        saleService.listSales(activeBusiness.$id, { limit: 500 }),
      ])

      setCustomers(custDocs)

      // Keep only sales with positive remaining due and not cancelled
      const openSales = saleDocs.filter((s) => s.dueAmount > 0 && s.status !== 'cancelled')
      setSales(openSales)

      // Handle initial customer & sale selection
      const targetCustId = preselectedCustomerId || 'all'
      setSelectedCustomerId(targetCustId)

      if (targetCustId !== 'all') {
        const custOpenSales = openSales.filter((s) => s.customerId === targetCustId)
        if (preselectedSaleId && custOpenSales.some((s) => s.$id === preselectedSaleId)) {
          const match = custOpenSales.find((s) => s.$id === preselectedSaleId)!
          setSelectedSaleId(preselectedSaleId)
          setPaymentAmountInput(match.dueAmount.toString())
        } else if (custOpenSales.length === 1) {
          // AUTO-SELECT single sale
          setSelectedSaleId(custOpenSales[0].$id)
          setPaymentAmountInput(custOpenSales[0].dueAmount.toString())
        } else {
          setSelectedSaleId('')
          setPaymentAmountInput('')
        }
      } else if (preselectedSaleId) {
        const match = openSales.find((s) => s.$id === preselectedSaleId)
        if (match) {
          setSelectedSaleId(preselectedSaleId)
          setPaymentAmountInput(match.dueAmount.toString())
        }
      }
    } catch (err: any) {
      setLoadError('Unable to load outstanding credit transactions. Please try again.')
      toast({
        title: 'Error loading payment data',
        description: err.message || 'Failed to fetch outstanding credit sales.',
        variant: 'destructive',
      })
    } finally {
      setIsLoadingCatalog(false)
    }
  }, [isOpen, activeBusiness?.$id, preselectedCustomerId, preselectedSaleId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter sales available for selected customer
  const availableSales = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === 'all') return sales
    return sales.filter((s) => s.customerId === selectedCustomerId)
  }, [selectedCustomerId, sales])

  // Currently selected sale object
  const currentSale = useMemo(() => {
    return sales.find((s) => s.$id === selectedSaleId) || null
  }, [selectedSaleId, sales])

  // Selected customer object & total outstanding calculation
  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === 'all') return null
    return customers.find((c) => c.$id === selectedCustomerId) || null
  }, [selectedCustomerId, customers])

  const customerTotalDue = useMemo(() => {
    if (selectedCustomerObj && typeof selectedCustomerObj.totalDue === 'number' && selectedCustomerObj.totalDue > 0) {
      return selectedCustomerObj.totalDue
    }
    return availableSales.reduce((acc, s) => acc + s.dueAmount, 0)
  }, [selectedCustomerObj, availableSales])

  // Handle Customer Selection Dropdown change
  const handleCustomerChange = (val: string) => {
    setSelectedCustomerId(val)
    if (val === 'all') {
      setSelectedSaleId('')
      setPaymentAmountInput('')
    } else {
      const custSales = sales.filter((s) => s.customerId === val)
      if (custSales.length === 1) {
        // AUTO-SELECT single transaction for customer
        setSelectedSaleId(custSales[0].$id)
        setPaymentAmountInput(custSales[0].dueAmount.toString())
      } else {
        setSelectedSaleId('')
        setPaymentAmountInput('')
      }
    }
  }

  // Handle Sale Selection Dropdown change
  const handleSaleChange = (val: string) => {
    setSelectedSaleId(val)
    const match = sales.find((s) => s.$id === val)
    if (match) {
      setPaymentAmountInput(match.dueAmount.toString())
    } else {
      setPaymentAmountInput('')
    }
  }

  // Live financial calculations
  const enteredAmount = parseFloat(paymentAmountInput) || 0
  const remainingDue = currentSale ? Math.max(0, currentSale.dueAmount - enteredAmount) : 0
  const isSettled = currentSale && enteredAmount >= currentSale.dueAmount - 0.01

  // Validation flags
  const isAmountTooLow = enteredAmount <= 0 && paymentAmountInput.trim() !== ''
  const isAmountTooHigh = currentSale ? enteredAmount > currentSale.dueAmount + 0.01 : false
  const isInvalidAmount =
    !currentSale ||
    isAmountTooLow ||
    isAmountTooHigh ||
    paymentAmountInput.trim() === '' ||
    isNaN(enteredAmount) ||
    enteredAmount <= 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBusiness?.$id || !user?.$id) return

    if (!selectedSaleId || !currentSale) {
      toast({
        title: 'Validation Error',
        description: 'Please select an outstanding credit transaction.',
        variant: 'destructive',
      })
      return
    }

    if (enteredAmount <= 0) {
      toast({
        title: 'Invalid Payment Amount',
        description: 'Payment amount must be greater than Rs. 0.00.',
        variant: 'destructive',
      })
      return
    }

    if (enteredAmount > currentSale.dueAmount + 0.01) {
      toast({
        title: 'Overpayment Not Allowed',
        description: `Payment amount (Rs. ${formatMoney(enteredAmount)}) cannot exceed outstanding balance of Rs. ${formatMoney(currentSale.dueAmount)}.`,
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      await paymentService.createPayment(
        {
          saleId: selectedSaleId,
          customerId: selectedCustomerId !== 'all' ? selectedCustomerId : currentSale.customerId,
          invoiceId: currentSale.invoiceId,
          amount: enteredAmount,
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
        description: `Recorded payment of Rs. ${formatMoney(enteredAmount)} for ${
          currentSale.saleNumber || 'Sale'
        }.`,
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Unable to Record Payment',
        description: err.message || 'No financial records were changed. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent
        aria-modal="true"
        className="max-w-lg w-[95vw] sm:w-full border-slate-200 bg-white text-slate-900 shadow-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl z-[60]"
      >
        {/* Sticky Header */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">Record Customer Payment</DialogTitle>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Settle or collect partial payments for outstanding credit transactions.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        {isLoadingCatalog ? (
          <div className="flex flex-col items-center justify-center p-10 text-slate-500 gap-3 text-xs flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span>Loading outstanding transactions...</span>
          </div>
        ) : loadError ? (
          <div className="p-6 text-center space-y-3 flex-1 flex flex-col justify-center items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-xs font-semibold text-slate-800">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs font-bold border-slate-300"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <form id="payment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-300">
            {/* Customer Select / Display */}
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-indigo-600" /> Customer {preselectedCustomerId ? '' : '*'}
              </Label>
              {preselectedCustomerId && selectedCustomerObj ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{selectedCustomerObj.name}</span>
                    {selectedCustomerObj.phone && (
                      <span className="text-slate-500 font-mono ml-2">({selectedCustomerObj.phone})</span>
                    )}
                  </div>
                  {customerTotalDue > 0 && (
                    <span className="font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                      Total Due: Rs. {formatMoney(customerTotalDue)}
                    </span>
                  )}
                </div>
              ) : (
                <Select value={selectedCustomerId} onValueChange={handleCustomerChange} disabled={isSubmitting}>
                  <SelectTrigger aria-label="Select Customer" className="h-11 text-xs font-medium bg-white border-slate-300 text-slate-900 rounded-lg">
                    <SelectValue placeholder="-- Select Customer --" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">-- Select Customer --</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.$id} value={c.$id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} {c.totalDue > 0 ? `· Total Due: Rs. ${formatMoney(c.totalDue)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Sale / Invoice Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                <Receipt className="h-3.5 w-3.5 text-indigo-600" /> Select Sale / Invoice Transaction *
              </Label>
              <Select value={selectedSaleId} onValueChange={handleSaleChange} disabled={isSubmitting || availableSales.length === 0}>
                <SelectTrigger aria-label="Select Sale or Invoice Transaction" className="h-11 text-xs font-medium bg-white border-slate-300 text-slate-900 rounded-lg">
                  <SelectValue
                    placeholder={
                      availableSales.length === 0
                        ? selectedCustomerId && selectedCustomerId !== 'all'
                          ? 'No outstanding credit transactions for this customer'
                          : 'No outstanding credit transactions found'
                        : 'Select Sale / Invoice Transaction...'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {availableSales.map((s) => (
                    <SelectItem key={s.$id} value={s.$id}>
                      {s.saleNumber || `SALE-${s.$id.slice(-6)}`} {s.invoiceNumber ? `(${s.invoiceNumber})` : ''} · Total Rs. {formatMoney(s.total)} · Due Rs. {formatMoney(s.dueAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableSales.length === 0 && selectedCustomerId && selectedCustomerId !== 'all' && (
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  This customer has no active outstanding credit transactions.
                </p>
              )}
            </div>

            {/* Financial Breakdown Summary & Live Math Card */}
            {currentSale ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                {selectedCustomerObj && availableSales.length > 1 && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-600 font-medium">Customer Total Outstanding:</span>
                    <span className="font-mono font-bold text-slate-900">
                      Rs. {formatMoney(customerTotalDue)}{' '}
                      <span className="text-[10px] text-slate-500 font-normal font-sans">
                        ({availableSales.length} open sales)
                      </span>
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Total Sale / Invoice:</span>
                  <span className="font-mono font-bold text-slate-900">Rs. {formatMoney(currentSale.total)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Already Paid:</span>
                  <span className="font-mono font-bold text-emerald-700">Rs. {formatMoney(currentSale.paidAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-900 pt-1.5 border-t border-slate-200">
                  <span>Selected Invoice Due:</span>
                  <span className="font-mono font-extrabold text-sm text-amber-800">Rs. {formatMoney(currentSale.dueAmount)}</span>
                </div>

                {/* Live Remaining Balance Calculation */}
                <div className="flex justify-between font-bold pt-1.5 border-t border-slate-200">
                  <span className="text-slate-700">Remaining Due After Payment:</span>
                  <span className={`font-mono font-extrabold text-sm ${isSettled ? 'text-emerald-700' : 'text-amber-800'}`}>
                    Rs. {formatMoney(remainingDue)}
                    {isSettled && (
                      <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                        Settled
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Please select an outstanding credit transaction above to enter a payment.
              </div>
            )}

            {/* Payment Amount & Payment Date Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="paymentAmountInput" className="text-xs font-extrabold text-slate-700">
                  Payment Amount (Rs.) *
                </Label>
                <Input
                  id="paymentAmountInput"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={currentSale ? currentSale.dueAmount : undefined}
                  placeholder={currentSale ? '0.00' : 'Select transaction first'}
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  disabled={isSubmitting || !currentSale}
                  className={`h-11 font-mono font-bold text-sm rounded-lg ${
                    !currentSale
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                      : isAmountTooHigh || isAmountTooLow
                      ? 'bg-white border-red-500 text-red-600 focus:ring-red-500'
                      : 'bg-white border-slate-300 text-emerald-700'
                  }`}
                  required
                />
                {isAmountTooLow && (
                  <p className="text-[11px] text-red-600 font-medium">
                    Payment amount must be greater than Rs. 0.00.
                  </p>
                )}
                {isAmountTooHigh && currentSale && (
                  <p className="text-[11px] text-red-600 font-medium">
                    Payment amount cannot exceed remaining due of Rs. {formatMoney(currentSale.dueAmount)}.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentDate" className="text-xs font-extrabold text-slate-700">
                  Payment Date *
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={isSubmitting}
                  className="h-11 text-xs font-medium bg-white border-slate-300 text-slate-900 rounded-lg"
                  required
                />
              </div>
            </div>

            {/* Payment Method & Reference Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold text-slate-700">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as PaymentMethod)} disabled={isSubmitting}>
                  <SelectTrigger aria-label="Select Payment Method" className="h-11 text-xs font-medium bg-white border-slate-300 text-slate-900 rounded-lg">
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
                <Label htmlFor="referenceNumber" className="text-xs font-extrabold text-slate-700">
                  Reference / Txn #
                </Label>
                <Input
                  id="referenceNumber"
                  type="text"
                  placeholder="e.g. TXN-99812"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  disabled={isSubmitting}
                  className="h-11 text-xs font-mono bg-white border-slate-300 text-slate-900 rounded-lg"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentNotes" className="text-xs font-extrabold text-slate-700">
                Payment Notes (Optional)
              </Label>
              <textarea
                id="paymentNotes"
                placeholder="Add receipt details or notes..."
                value={notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-16 p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-none text-slate-900"
              />
            </div>
          </form>
        )}

        {/* Sticky Footer */}
        <DialogFooter className="p-4 border-t border-slate-100 shrink-0 bg-slate-50/90 backdrop-blur-xs flex flex-col-reverse sm:flex-row gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 border-slate-300 bg-white text-slate-700 font-semibold rounded-lg text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="payment-form"
            disabled={isSubmitting || !selectedSaleId || isInvalidAmount}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 shadow-xs disabled:opacity-50 min-w-[160px] rounded-lg text-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording Payment...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Record Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

