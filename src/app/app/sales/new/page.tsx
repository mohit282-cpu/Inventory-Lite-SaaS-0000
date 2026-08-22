"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { productService } from '@/services/product.service'
import { customerService } from '@/services/customer.service'
import { saleService } from '@/services/sale.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Barcode,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UserPlus,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Product, Customer, PaymentMethod } from '@/types'

interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  discount: number
}

export default function CreateSalePage() {
  const router = useRouter()
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Cart & Checkout State
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  
  // Quick Customer Dialog State
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustAddress, setNewCustAddress] = useState('')
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

  const handleCreateQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustName.trim() || !activeBusiness?.$id || !user?.$id) return

    setIsCreatingCustomer(true)
    try {
      const created = await customerService.createCustomer(
        {
          name: newCustName.trim(),
          phone: newCustPhone.trim() || undefined,
          address: newCustAddress.trim() || undefined,
        },
        activeBusiness.$id,
        user.$id
      )

      setCustomers((prev) => [created, ...prev])
      setSelectedCustomerId(created.$id)
      setNewCustName('')
      setNewCustPhone('')
      setNewCustAddress('')
      setIsCustomerDialogOpen(false)

      toast({
        title: 'Customer Added',
        description: `Customer "${created.name}" created and selected.`,
      })
    } catch (err: any) {
      toast({
        title: 'Error Creating Customer',
        description: err.message || 'Failed to create customer.',
        variant: 'destructive',
      })
    } finally {
      setIsCreatingCustomer(false)
    }
  }
  
  // Discount Toggle State: 'rs' | 'percent'
  const [discountType, setDiscountType] = useState<'rs' | 'percent'>('rs')
  const [discountInputValue, setDiscountInputValue] = useState<number>(0)

  // VAT Tax State & Toggle
  const [isVatEnabled, setIsVatEnabled] = useState<boolean>(true)
  const [taxRate, setTaxRate] = useState<number>(13) // Default 13% VAT Nepal

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paidAmountInput, setPaidAmountInput] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setIsLoading(true)
      const [prods, custs] = await Promise.all([
        productService.listProducts(activeBusiness.$id, { isActive: true }),
        customerService.listCustomers(activeBusiness.$id),
      ])
      setProducts(prods)
      setCustomers(custs)
    } catch (err: any) {
      toast({
        title: 'Error loading POS catalog',
        description: err.message || 'Failed to fetch catalog.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Memoized Search Filter
  const filteredProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    )
  }, [searchQuery, products])

  // Effective Discount in Rupees Calculation
  const effectiveOverallDiscount = React.useMemo(() => {
    const sub = cart.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice - item.discount,
      0
    )
    if (discountType === 'percent') {
      return (sub * (discountInputValue || 0)) / 100
    }
    return discountInputValue || 0
  }, [cart, discountType, discountInputValue])

  // Effective Tax Rate Calculation
  const effectiveTaxRate = isVatEnabled ? taxRate : 0

  // Memoized Billing Totals Calculations
  const { subtotal, grandTotal, dueAmount, changeAmount, effectivePaidAmount, taxAmount } =
    React.useMemo(() => {
      const rawSub = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
      const lineDisc = cart.reduce((sum, item) => sum + item.discount, 0)
      const subAfterLineDisc = Math.max(0, rawSub - lineDisc)
      const taxable = Math.max(0, subAfterLineDisc - effectiveOverallDiscount)
      const tax = (taxable * effectiveTaxRate) / 100
      const total = taxable + tax
      const paid = paidAmountInput !== '' ? parseFloat(paidAmountInput) || 0 : total
      const due = Math.max(0, total - paid)
      const change = Math.max(0, paid - total)

      return {
        subtotal: rawSub,
        taxableSubtotal: taxable,
        taxAmount: tax,
        grandTotal: total,
        dueAmount: due,
        changeAmount: change,
        effectivePaidAmount: paid,
      }
    }, [cart, effectiveOverallDiscount, effectiveTaxRate, paidAmountInput])

  // Handle Barcode Scan / Fast Input
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return
    const code = barcodeInput.trim().toLowerCase()
    const match = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === code) ||
        p.sku.toLowerCase() === code
    )

    if (match) {
      addToCart(match)
      setBarcodeInput('')
    } else {
      toast({
        title: 'Barcode Not Found',
        description: `No product matching barcode/SKU "${barcodeInput}"`,
        variant: 'destructive',
      })
    }
  }

  // Cart Operations
  const addToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      toast({
        title: 'Out of Stock',
        description: `"${product.name}" has no available stock!`,
        variant: 'destructive',
      })
      return
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.$id === product.$id)
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          toast({
            title: 'Stock Limit Reached',
            description: `Cannot add more than available stock (${product.stockQuantity} ${product.unit}).`,
            variant: 'destructive',
          })
          return prev
        }
        return prev.map((item) =>
          item.product.$id === product.$id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          discount: 0,
        },
      ]
    })
  }

  const updateQuantity = (productId: string, newQty: number) => {
    const item = cart.find((i) => i.product.$id === productId)
    if (!item) return
    if (newQty > item.product.stockQuantity) {
      toast({
        title: 'Stock Limit Reached',
        description: `Cannot exceed available stock (${item.product.stockQuantity} ${item.product.unit}).`,
        variant: 'destructive',
      })
      return
    }
    if (newQty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart((prev) =>
      prev.map((i) => (i.product.$id === productId ? { ...i, quantity: newQty } : i))
    )
  }

  const updateUnitPrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((i) => (i.product.$id === productId ? { ...i, unitPrice: Math.max(0, price) } : i))
    )
  }

  const updateLineDiscount = (productId: string, disc: number) => {
    setCart((prev) =>
      prev.map((i) => (i.product.$id === productId ? { ...i, discount: Math.max(0, disc) } : i))
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.$id !== productId))
  }

  // Submit Complete Sale
  const handleCompleteSale = async () => {
    if (!activeBusiness?.$id || !user?.$id) return
    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add at least one product to complete sale.',
        variant: 'destructive',
      })
      return
    }

    if (dueAmount > 0 && (!selectedCustomerId || selectedCustomerId === 'guest')) {
      toast({
        title: 'Customer Required for Credit Sale',
        description: 'Please select or add a customer to record outstanding credit/due (Udhaar).',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        customerId: selectedCustomerId || undefined,
        items: cart.map((item) => ({
          productId: item.product.$id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
        discount: effectiveOverallDiscount,
        discountType: discountType === 'percent' ? ('percentage' as const) : ('fixed' as const),
        discountValue: discountInputValue || 0,
        vatEnabled: isVatEnabled,
        taxRate: effectiveTaxRate,
        paidAmount: effectivePaidAmount,
        paymentMethod,
      }

      const result = await saleService.createSale(payload, activeBusiness.$id, user.$id)

      toast({
        title: 'Sale Completed Successfully!',
        description: `Sale #${result.sale.saleNumber || result.sale.$id} recorded. Total: Rs. ${result.sale.total.toFixed(2)}`,
      })

      router.push(`/app/sales/${result.sale.$id}`)
    } catch (err: any) {
      toast({
        title: 'Sale Transaction Failed',
        description: err.message || 'Failed to finalize sale.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 text-slate-900">
      <PageHeader
        title="POS Billing Terminal"
        description="Quick point-of-sale terminal for instant customer billing and stock deduction."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/app/sales')}
            className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-semibold"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Sales Ledger
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Product Catalog & Scanner */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode & Search Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600 pointer-events-none" />
              <Input
                placeholder="Scan Barcode or SKU..."
                aria-label="Scan Barcode or SKU"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="pl-10 font-mono h-11 bg-white border-slate-300"
              />
            </form>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search catalog by product name..."
                aria-label="Search catalog by product name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-white border-slate-300"
              />
            </div>
          </div>

          {/* Catalog Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" /> Loading inventory catalog...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center border border-slate-200 rounded-xl bg-white text-slate-500 text-sm">
              No products found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stockQuantity <= 0
                return (
                  <button
                    key={p.$id}
                    type="button"
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock}
                    className={`p-3.5 text-left rounded-xl border transition-all ${
                      isOutOfStock
                        ? 'border-slate-200 bg-slate-100/60 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-indigo-600 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    <div className="font-bold text-slate-900 text-xs truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {p.sku}</div>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                      <span className="font-mono font-bold text-indigo-600 text-xs">
                        Rs. {p.sellingPrice.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isOutOfStock
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : p.stockQuantity <= (p.lowStockThreshold || 5)
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {p.stockQuantity} {p.unit}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Panel: Interactive POS Cart & Billing */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-indigo-600" /> Current Cart ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-red-600 hover:text-red-700 font-bold"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Selector with Quick Add */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Select Customer (Optional)</Label>
                <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="h-3 w-3" /> + New Customer
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white">
                    <DialogHeader>
                      <DialogTitle className="text-sm font-bold text-slate-900">Add New Customer</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateQuickCustomer} className="space-y-3 py-2">
                      <div>
                        <Label className="text-xs font-semibold">Customer Name *</Label>
                        <Input
                          required
                          placeholder="e.g. Ram Prasad"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Phone Number</Label>
                        <Input
                          placeholder="e.g. 98XXXXXXXX"
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold">Address / Location</Label>
                        <Input
                          placeholder="e.g. Kathmandu"
                          value={newCustAddress}
                          onChange={(e) => setNewCustAddress(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <DialogFooter className="pt-2">
                        <Button
                          type="submit"
                          disabled={isCreatingCustomer || !newCustName.trim()}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 text-xs w-full"
                        >
                          {isCreatingCustomer ? (
                            <>
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving Customer...
                            </>
                          ) : (
                            'Create & Select Customer'
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="text-xs font-medium">
                  <SelectValue placeholder="Walk-in Guest / Select Customer" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  <SelectItem value="guest">Walk-in Guest</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.$id} value={c.$id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                Click products from the catalog or scan barcodes to add to cart.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice - item.discount
                  return (
                    <div
                      key={item.product.$id}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate max-w-[160px]">
                          {item.product.name}
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          Rs. {lineTotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.$id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono font-bold text-slate-900 px-2">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.$id, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Unit Price input */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-semibold">Rate:</span>
                          <Input
                            type="number"
                            min="0"
                            aria-label="Unit price rate"
                            value={item.unitPrice}
                            onChange={(e) => updateUnitPrice(item.product.$id, parseFloat(e.target.value) || 0)}
                            className="w-16 h-7 text-xs font-mono px-1.5 py-0 bg-white"
                          />
                        </div>

                        {/* Line Discount input */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-semibold">Disc:</span>
                          <Input
                            type="number"
                            min="0"
                            aria-label="Line discount"
                            value={item.discount}
                            onChange={(e) => updateLineDiscount(item.product.$id, parseFloat(e.target.value) || 0)}
                            className="w-14 h-7 text-xs font-mono px-1 py-0 bg-white"
                          />
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.$id)}
                          aria-label="Remove item from cart"
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Overall Billing Summary */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-900">Rs. {subtotal.toFixed(2)}</span>
              </div>

              {/* Interactive Discount & VAT Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
                {/* Discount Section with Toggle (Rs. vs %) */}
                <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-extrabold text-slate-700">
                      Discount ({discountType === 'percent' ? '%' : 'Rs.'})
                    </Label>

                    {/* Segmented Toggle Button: Rs. | % */}
                    <div className="inline-flex items-center bg-slate-200 p-0.5 rounded-md text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setDiscountType('rs')}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          discountType === 'rs'
                            ? 'bg-white text-indigo-700 shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Rs.
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('percent')}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          discountType === 'percent'
                            ? 'bg-white text-indigo-700 shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={discountType === 'percent' ? 100 : undefined}
                    placeholder={discountType === 'percent' ? 'e.g. 10%' : 'e.g. 50'}
                    value={discountInputValue === 0 ? '' : discountInputValue}
                    onChange={(e) => setDiscountInputValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-8 font-mono text-xs bg-white border-slate-300"
                  />

                  {effectiveOverallDiscount > 0 && (
                    <div className="text-[10px] text-emerald-700 font-bold font-mono text-right">
                      - Rs. {effectiveOverallDiscount.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* VAT Section with Toggle (ON vs OFF) */}
                <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-extrabold text-slate-700">
                      VAT ({isVatEnabled ? `${taxRate}%` : 'OFF'})
                    </Label>

                    {/* Segmented Toggle Button: OFF | ON */}
                    <div className="inline-flex items-center bg-slate-200 p-0.5 rounded-md text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setIsVatEnabled(false)}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          !isVatEnabled
                            ? 'bg-white text-slate-900 shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        OFF
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsVatEnabled(true)}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          isVatEnabled
                            ? 'bg-indigo-600 text-white shadow-xs font-black'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ON ({taxRate}%)
                      </button>
                    </div>
                  </div>

                  {isVatEnabled ? (
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-8 font-mono text-xs bg-white border-slate-300"
                    />
                  ) : (
                    <div className="h-8 rounded-md bg-slate-100 border border-slate-200 text-slate-400 text-xs font-mono font-bold flex items-center justify-center">
                      VAT Disabled (0%)
                    </div>
                  )}

                  {isVatEnabled && (
                    <div className="text-[10px] text-slate-600 font-bold font-mono text-right">
                      + Rs. {taxAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-900 font-bold py-3 px-3.5 border border-indigo-100 bg-indigo-50/60 rounded-xl my-2">
                <span className="text-xs uppercase tracking-wider text-indigo-900 font-extrabold">Grand Total</span>
                <span className="font-mono text-2xl text-indigo-700 font-extrabold">
                  Rs. {grandTotal.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <Label className="text-[10px] font-bold text-slate-700">Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
                  >
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card / Fonepay</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-slate-700">Paid Amount (Rs.)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    placeholder={`Full (Rs. ${grandTotal.toFixed(2)})`}
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>
              </div>

              {dueAmount > 0 ? (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs flex justify-between text-red-700 font-bold">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" /> Outstanding Due (Udhaar):
                  </span>
                  <span className="font-mono font-extrabold">Rs. {dueAmount.toFixed(2)}</span>
                </div>
              ) : changeAmount > 0 ? (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex justify-between text-emerald-800 font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Change Return to Customer:
                  </span>
                  <span className="font-mono font-extrabold">Rs. {changeAmount.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            {/* Complete Sale Action Trigger */}
            <Button
              onClick={handleCompleteSale}
              disabled={isSubmitting || cart.length === 0}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Transaction...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" /> Complete Sale & Print Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
