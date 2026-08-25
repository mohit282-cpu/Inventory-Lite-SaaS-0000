"use client"

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { Supplier, Product, PaymentMethod } from '@/types'
import { formatMoney, toMinorUnits, fromMinorUnits } from '@/lib/money'

interface PurchaseLineItem {
  productId: string
  quantity: number
  purchasePrice: number
  discount: number
  tax: number
}

interface PurchaseDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    supplierId: string
    supplierInvoiceNumber?: string
    purchaseDate?: string
    items: Array<{
      productId: string
      quantity: number
      purchasePrice: number
      discount?: number
      tax?: number
    }>
    discount?: number
    tax?: number
    paidAmount: number
    paymentMethod: PaymentMethod
    notes?: string
  }) => Promise<void>
  suppliers: Supplier[]
  products: Product[]
  isLoading?: boolean
}

export function PurchaseDialog({
  isOpen,
  onClose,
  onSubmit,
  suppliers,
  products,
  isLoading = false,
}: PurchaseDialogProps) {
  const [supplierId, setSupplierId] = useState<string>('')
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('')
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState<PurchaseLineItem[]>([])
  const [overallDiscount, setOverallDiscount] = useState<number>(0)
  const [overallTax, setOverallTax] = useState<number>(0)
  const [paidAmount, setPaidAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState<string>('')
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSupplierId(suppliers.length > 0 ? suppliers[0].$id : '')
      setSupplierInvoiceNumber('')
      setPurchaseDate(new Date().toISOString().slice(0, 10))
      setOverallDiscount(0)
      setOverallTax(0)
      setPaidAmount(0)
      setPaymentMethod('cash')
      setNotes('')
      setServerError(null)

      if (products.length > 0) {
        setItems([
          {
            productId: products[0].$id,
            quantity: 1,
            purchasePrice: products[0].purchasePrice || 0,
            discount: 0,
            tax: 0,
          },
        ])
      } else {
        setItems([])
      }
    }
  }, [isOpen, suppliers, products])

  const handleAddItem = () => {
    if (products.length === 0) return
    const firstProd = products[0]
    setItems((prev) => [
      ...prev,
      {
        productId: firstProd.$id,
        quantity: 1,
        purchasePrice: firstProd.purchasePrice || 0,
        discount: 0,
        tax: 0,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof PurchaseLineItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev]
      const current = { ...updated[index], [field]: value }

      if (field === 'productId') {
        const prod = products.find((p) => p.$id === value)
        if (prod) {
          current.purchasePrice = prod.purchasePrice || 0
        }
      }

      updated[index] = current
      return updated
    })
  }

  // Client-side calculations
  let subtotalP = 0
  items.forEach((item) => {
    const qtyP = toMinorUnits(item.quantity || 0)
    const priceP = toMinorUnits(item.purchasePrice || 0)
    const discP = toMinorUnits(item.discount || 0)
    const taxP = toMinorUnits(item.tax || 0)
    const lineTotalP = Math.max(0, Math.round((qtyP * priceP) / 100) - discP + taxP)
    subtotalP += lineTotalP
  })

  const discountP = toMinorUnits(overallDiscount || 0)
  const taxP = toMinorUnits(overallTax || 0)
  const grandTotalP = Math.max(0, subtotalP - discountP + taxP)
  const paidP = toMinorUnits(paidAmount || 0)
  const dueP = Math.max(0, grandTotalP - paidP)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!supplierId || supplierId.trim() === '') {
      setServerError('Please select a supplier')
      return
    }

    if (items.length === 0) {
      setServerError('Please add at least one product item')
      return
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].productId) {
        setServerError(`Line ${i + 1}: Select a valid product`)
        return
      }
      if (items[i].quantity <= 0) {
        setServerError(`Line ${i + 1}: Quantity must be greater than zero`)
        return
      }
      if (items[i].purchasePrice < 0) {
        setServerError(`Line ${i + 1}: Cost price cannot be negative`)
        return
      }
    }

    try {
      setServerError(null)
      await onSubmit({
        supplierId,
        supplierInvoiceNumber: supplierInvoiceNumber.trim(),
        purchaseDate,
        items,
        discount: overallDiscount,
        tax: overallTax,
        paidAmount,
        paymentMethod,
        notes: notes.trim(),
      })
      onClose()
    } catch (err: any) {
      setServerError(err?.message || 'Failed to create purchase intake')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl border-slate-200 bg-white text-slate-900 shadow-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shrink-0">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">New Stock Purchase Intake</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Record purchase from vendor and increase product inventory stock.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold my-2 shrink-0">
            {serverError}
          </div>
        )}

        <form id="purchase-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-3 px-1 scrollbar-thin">
          {/* Header Info: Supplier & Invoice details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-bold text-slate-700">Select Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Choose supplier" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {suppliers.map((s) => (
                    <SelectItem key={s.$id} value={s.$id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Supplier Bill / Invoice #</Label>
              <Input
                placeholder="e.g. INV-998811"
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                className="bg-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Purchase Date *</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="bg-white font-mono"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800">Purchase Line Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-8 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Product Line
              </Button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-2 w-24">Qty</th>
                    <th className="py-2.5 px-2 w-28">Cost Price</th>
                    <th className="py-2.5 px-2 w-24">Discount</th>
                    <th className="py-2.5 px-3 text-right w-28">Subtotal</th>
                    <th className="py-2.5 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const lineSubtotal = Math.max(
                      0,
                      (item.quantity || 0) * (item.purchasePrice || 0) - (item.discount || 0) + (item.tax || 0)
                    )

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3">
                          <Select
                            value={item.productId}
                            onValueChange={(val) => handleItemChange(idx, 'productId', val)}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {products.map((p) => (
                                <SelectItem key={p.$id} value={p.$id}>
                                  {p.name} (Stock: {p.stockQuantity} {p.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="h-8 font-mono text-xs bg-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.purchasePrice}
                            onChange={(e) => handleItemChange(idx, 'purchasePrice', parseFloat(e.target.value) || 0)}
                            className="h-8 font-mono text-xs bg-white"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.discount}
                            onChange={(e) => handleItemChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                            className="h-8 font-mono text-xs bg-white"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          Rs. {formatMoney(lineSubtotal)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations & Payment Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer / Fonepay</SelectItem>
                    <SelectItem value="card">Card Payment</SelectItem>
                    <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                    <SelectItem value="credit">Credit / Supplier Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Paid Amount (NPR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="font-mono font-bold bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Purchase Notes / Remarks</Label>
                <Textarea
                  placeholder="Notes, PO reference..."
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  className="h-16 text-xs bg-white"
                />
              </div>
            </div>

            {/* Calculations Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 h-fit">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">Rs. {formatMoney(fromMinorUnits(subtotalP))}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Overall Discount:</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(parseFloat(e.target.value) || 0)}
                  className="w-28 h-7 text-right font-mono text-xs bg-white"
                />
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Tax / VAT Amount:</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={overallTax}
                  onChange={(e) => setOverallTax(parseFloat(e.target.value) || 0)}
                  className="w-28 h-7 text-right font-mono text-xs bg-white"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-indigo-700">Rs. {formatMoney(fromMinorUnits(grandTotalP))}</span>
              </div>

              <div className="flex justify-between text-xs font-semibold text-emerald-700">
                <span>Paid Amount:</span>
                <span className="font-mono">Rs. {formatMoney(paidAmount)}</span>
              </div>

              <div className="flex justify-between text-xs font-bold text-red-600">
                <span>Supplier Due Balance:</span>
                <span className="font-mono">Rs. {formatMoney(fromMinorUnits(dueP))}</span>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="pt-3 border-t border-slate-100 shrink-0 flex flex-col-reverse sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="purchase-form"
            disabled={isLoading || suppliers.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Complete Purchase & Receive Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
