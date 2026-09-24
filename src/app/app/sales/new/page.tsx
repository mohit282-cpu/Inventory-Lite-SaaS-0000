"use client"

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { productService } from '@/services/product.service'
import { customerService } from '@/services/customer.service'
import { saleService } from '@/services/sale.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { getDefaultVatState, DEFAULT_VAT_RATE } from '@/lib/localization'
import { logger } from '@/lib/logger'
import { formatMoney } from '@/lib/money'
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
  CreditCard,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
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
  const { activeBusiness, user, isAuthLoading, isWorkspaceLoading } = useAuth()
  const { toast } = useToast()

  const barcodeInputRef = useRef<HTMLInputElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Cart & Checkout State
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [isClearCartOpen, setIsClearCartOpen] = useState(false)

  // Quick Customer Dialog State
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustAddress, setNewCustAddress] = useState('')
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

  // Discount Toggle State: 'rs' | 'percent'
  const [discountType, setDiscountType] = useState<'rs' | 'percent'>('rs')
  const [discountInputValue, setDiscountInputValue] = useState<number>(0)

  // VAT Tax State & Toggle
  const [isVatEnabled, setIsVatEnabled] = useState<boolean>(true)
  const [taxRate, setTaxRate] = useState<number>(DEFAULT_VAT_RATE)

  // Payment Mode State: 'full_payment' | 'partial_udhaar' | 'full_udhaar'
  const [paymentMode, setPaymentMode] = useState<'full_payment' | 'partial_udhaar' | 'full_udhaar'>('full_payment')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paidAmountInput, setPaidAmountInput] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Focus barcode input on mount & register POS keyboard shortcuts (F2, F4, F10)
  useEffect(() => {
    barcodeInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        barcodeInputRef.current?.focus()
      } else if (e.key === 'F4') {
        e.preventDefault()
        setIsCustomerDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchData = useCallback(async () => {
    if (!activeBusiness?.$id) {
      if (!isAuthLoading && !isWorkspaceLoading) {
        setIsLoading(false)
      }
      return
    }
    const bId = activeBusiness.$id
    try {
      setIsLoading(true)
      setCatalogError(null)
      const [prods, custs] = await Promise.all([
        productService.listProducts(bId, { isActive: true, limit: 200 }),
        customerService.listCustomers(bId),
      ])
      setProducts(prods || [])
      setCustomers(custs || [])
    } catch (err: any) {
      const errRef = logger.error('POS catalog loading failed', err, {
        category: 'APPWRITE',
        path: '/app/sales/new',
        businessId: bId,
      })
      setCatalogError(err.message || 'Failed to fetch catalog from Appwrite.')
      toast({
        title: 'Error loading POS catalog',
        description: `${err.message || 'Failed to fetch catalog.'} (Ref: ${errRef})`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, isAuthLoading, isWorkspaceLoading, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Initialize default VAT state based on active business tax registration ONCE when active business changes
  useEffect(() => {
    if (activeBusiness) {
      const defaultState = getDefaultVatState(activeBusiness)
      setIsVatEnabled(defaultState.vatEnabled)
      setTaxRate(defaultState.vatRate)
    }
  }, [activeBusiness])

  // Quick Customer Creation
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
      setSelectedCustomerId(created.$id) // Auto-select newly created customer
      setNewCustName('')
      setNewCustPhone('')
      setNewCustAddress('')
      setIsCustomerDialogOpen(false)

      toast({
        title: 'Customer Created & Selected',
        description: `"${created.name}" is now selected for this sale transaction.`,
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

  // Memoized Search Filter
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const q = searchQuery.trim().toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    )
  }, [searchQuery, products])

  // Raw Subtotal Calculation
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }, [cart])

  // Line Items Total Discount Calculation
  const totalLineDiscount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.discount, 0)
  }, [cart])

  // Subtotal after Line Item Discounts
  const subAfterLineDisc = useMemo(() => {
    return Math.max(0, subtotal - totalLineDiscount)
  }, [subtotal, totalLineDiscount])

  // Effective Overall Discount in Rupees Calculation
  const effectiveOverallDiscount = useMemo(() => {
    if (discountType === 'percent') {
      const pct = Math.min(100, Math.max(0, discountInputValue || 0))
      return (subAfterLineDisc * pct) / 100
    }
    return Math.min(subAfterLineDisc, Math.max(0, discountInputValue || 0))
  }, [subAfterLineDisc, discountType, discountInputValue])

  // Taxable Subtotal Calculation
  const taxableSubtotal = useMemo(() => {
    return Math.max(0, subAfterLineDisc - effectiveOverallDiscount)
  }, [subAfterLineDisc, effectiveOverallDiscount])

  // Effective Tax Rate & VAT Amount Calculation
  const effectiveTaxRate = isVatEnabled ? Math.max(0, taxRate) : 0
  const taxAmount = useMemo(() => {
    return (taxableSubtotal * effectiveTaxRate) / 100
  }, [taxableSubtotal, effectiveTaxRate])

  // Grand Total Calculation
  const grandTotal = useMemo(() => {
    return taxableSubtotal + taxAmount
  }, [taxableSubtotal, taxAmount])

  // Paid Amount & Due Calculations
  const { dueAmount, changeAmount, effectivePaidAmount } = useMemo(() => {
    let paid = paidAmountInput !== '' ? parseFloat(paidAmountInput) || 0 : grandTotal
    if (paymentMode === 'full_payment') {
      paid = grandTotal
    } else if (paymentMode === 'full_udhaar' || paymentMethod === 'full_udhaar') {
      paid = 0
    }
    const due = Math.max(0, grandTotal - paid)
    const change = Math.max(0, paid - grandTotal)

    return {
      effectivePaidAmount: Math.min(paid, grandTotal),
      dueAmount: due,
      changeAmount: change,
    }
  }, [grandTotal, paidAmountInput, paymentMode, paymentMethod])

  // Barcode / SKU Scan Handler
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
        title: 'Product Not Found',
        description: `No product matching barcode/SKU "${barcodeInput.trim()}"`,
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
            description: `Only ${product.stockQuantity} ${product.unit || 'pcs'} available in stock.`,
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
        description: `Only ${item.product.stockQuantity} ${item.product.unit || 'pcs'} available in stock.`,
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

  const handleClearCartConfirmed = () => {
    setCart([])
    setIsClearCartOpen(false)
    toast({
      title: 'Cart Cleared',
      description: 'All items removed from the current sale.',
    })
  }

  // Customer requirement check for Udhaar
  const isUdhaarMode = paymentMode === 'partial_udhaar' || paymentMode === 'full_udhaar' || paymentMethod === 'full_udhaar'
  const isCustomerRequiredMissing = isUdhaarMode && (!selectedCustomerId || selectedCustomerId === 'guest')

  // Submit Complete Sale
  const handleCompleteSale = async () => {
    if (isSubmitting || !activeBusiness?.$id || !user?.$id) return

    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Click a product or scan a barcode to add items to cart.',
        variant: 'destructive',
      })
      return
    }

    if (isCustomerRequiredMissing) {
      toast({
        title: 'Customer Required for Udhaar',
        description: 'Please select a registered customer to process Udhaar (credit) sales.',
        variant: 'destructive',
      })
      return
    }

    if (paymentMode === 'partial_udhaar') {
      if (effectivePaidAmount <= 0) {
        toast({
          title: 'Invalid Paid Amount',
          description: 'Partial Udhaar requires a paid amount greater than Rs. 0.00.',
          variant: 'destructive',
        })
        return
      }
      if (effectivePaidAmount >= grandTotal) {
        toast({
          title: 'Invalid Partial Udhaar',
          description: 'Paid amount cannot equal or exceed grand total for Partial Udhaar. Select Full Payment instead.',
          variant: 'destructive',
        })
        return
      }
    }

    setIsSubmitting(true)

    try {
      const payload = {
        customerId: selectedCustomerId && selectedCustomerId !== 'guest' ? selectedCustomerId : undefined,
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
        idempotencyKey: `pos_${activeBusiness.$id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      }

      const result = await saleService.createSale(payload, activeBusiness.$id, user.$id)

      toast({
        title: 'Sale Completed Successfully!',
        description: `Sale #${result.sale.saleNumber || result.sale.$id} recorded. Total: Rs. ${formatMoney(result.sale.total)}`,
      })

      if (result.invoice?.$id) {
        router.push(`/app/invoices/${result.invoice.$id}`)
      } else {
        router.push(`/app/sales/${result.sale.$id}`)
      }
    } catch (err: any) {
      toast({
        title: 'Sale Transaction Failed',
        description: err.message || 'Failed to finalize sale. Cart data preserved.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCustomerDoc = customers.find((c) => c.$id === selectedCustomerId)

  return (
    <div className="space-y-4 text-slate-900">
      <PageHeader
        title="POS Billing Terminal"
        description="Quick point-of-sale terminal for instant customer billing and stock deduction."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/app/sales')}
            className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Sales Ledger
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Barcode Scanner & Product Catalog */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode & Search Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <form onSubmit={handleBarcodeSubmit} className="relative">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600 pointer-events-none" />
              <Input
                ref={barcodeInputRef}
                placeholder="Scan Barcode or SKU..."
                aria-label="Scan Barcode or SKU"
                value={barcodeInput}
                disabled={isSubmitting}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="pl-10 font-mono h-11 bg-white border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500 text-xs"
              />
            </form>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search catalog by product name..."
                aria-label="Search catalog by product name"
                value={searchQuery}
                disabled={isSubmitting}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-white border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Catalog Grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                </div>
              ))}
            </div>
          ) : catalogError ? (
            <div className="p-6 text-center border border-amber-200 rounded-xl bg-amber-50/60 text-slate-800 space-y-3">
              <AlertCircle className="h-8 w-8 mx-auto text-amber-600" />
              <h3 className="text-sm font-bold">Unable to load catalog</h3>
              <p className="text-xs text-slate-600">{catalogError}</p>
              <Button onClick={fetchData} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry Loading Catalog
              </Button>
            </div>
          ) : !activeBusiness?.$id ? (
            <div className="p-6 text-center border border-slate-200 rounded-xl bg-white text-slate-600 space-y-2">
              <AlertCircle className="h-8 w-8 mx-auto text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">No Active Business Selected</h3>
              <p className="text-xs text-slate-500">
                Please select or onboard your business to start recording sales at the POS terminal.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center border border-slate-200 rounded-xl bg-white text-slate-500 text-sm">
              {searchQuery ? `No products found matching "${searchQuery}"` : 'No products cataloged yet. Add products in Products menu to start POS billing.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stockQuantity <= 0
                const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold || 5)

                return (
                  <button
                    key={p.$id}
                    type="button"
                    onClick={() => addToCart(p)}
                    disabled={isOutOfStock || isSubmitting}
                    aria-label={`Add ${p.name} to cart. Price: Rs. ${formatMoney(p.sellingPrice)}. Stock: ${p.stockQuantity} ${p.unit || 'pcs'}`}
                    className={`p-3.5 text-left rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isOutOfStock
                        ? 'border-slate-200 bg-slate-100/60 opacity-60 cursor-not-allowed'
                        : 'border-slate-200 bg-white hover:border-indigo-600 hover:shadow-md active:scale-[0.98]'
                    }`}
                  >
                    <div className="font-bold text-slate-900 text-xs truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {p.sku}</div>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                      <span className="font-mono font-bold text-indigo-700 text-xs">
                        Rs. {formatMoney(p.sellingPrice)}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isOutOfStock
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : isLowStock
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : isLowStock ? `Low Stock (${p.stockQuantity})` : `${p.stockQuantity} ${p.unit || 'pcs'}`}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Panel: Primary POS Cart & Payment Hub */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-sm">
            {/* Header with Cart Count & Clear Cart Trigger */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-indigo-600" /> Current Cart ({cart.length})
              </h2>
              {cart.length > 0 && (
                <Dialog open={isClearCartOpen} onOpenChange={setIsClearCartOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      className="text-xs text-red-600 hover:text-red-700 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded px-1"
                    >
                      Clear Cart
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-white border-red-200 text-slate-900">
                    <DialogHeader>
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center justify-center font-bold shrink-0">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-base font-bold text-slate-900">Clear cart?</DialogTitle>
                      </div>
                      <DialogDescription className="text-xs text-slate-600 mt-2">
                        This will remove all items from the current sale transaction.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-3 flex flex-col-reverse sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsClearCartOpen(false)}
                        className="text-xs border-slate-300 font-semibold"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleClearCartConfirmed}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                      >
                        Clear Cart
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Customer Selector with Inline Quick Add */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="customerSelect" className="text-xs font-bold text-slate-700">
                  Select Customer {isUdhaarMode ? <span className="text-red-600">*</span> : '(Optional)'}
                </Label>
                <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
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
                        <Label htmlFor="newCustNameInput" className="text-xs font-semibold">Customer Name *</Label>
                        <Input
                          id="newCustNameInput"
                          required
                          placeholder="e.g. Ram Prasad"
                          value={newCustName}
                          disabled={isCreatingCustomer}
                          onChange={(e) => setNewCustName(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCustPhoneInput" className="text-xs font-semibold">Phone Number</Label>
                        <Input
                          id="newCustPhoneInput"
                          placeholder="e.g. 98XXXXXXXX"
                          value={newCustPhone}
                          disabled={isCreatingCustomer}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          className="h-9 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label htmlFor="newCustAddrInput" className="text-xs font-semibold">Address / Location</Label>
                        <Input
                          id="newCustAddrInput"
                          placeholder="e.g. Kathmandu"
                          value={newCustAddress}
                          disabled={isCreatingCustomer}
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

              <Select
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
                disabled={isSubmitting}
              >
                <SelectTrigger id="customerSelect" aria-label="Select Customer" className="text-xs font-medium bg-white">
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

              {selectedCustomerDoc && (
                <div className="text-[11px] font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 flex justify-between items-center">
                  <span className="font-bold text-slate-800">{selectedCustomerDoc.name}</span>
                  <span>{selectedCustomerDoc.phone || 'No Phone'}</span>
                </div>
              )}

              {isCustomerRequiredMissing && (
                <div className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Select a customer to process Udhaar (credit) sales.</span>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50/60 space-y-1">
                <p className="font-bold text-slate-700">No items in cart</p>
                <p className="text-[11px] text-slate-500">Click a product or scan a barcode to add items.</p>
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
                        <span className="font-bold text-slate-900 truncate max-w-[170px]">
                          {item.product.name}
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                          Rs. {formatMoney(lineTotal)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md p-0.5">
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => updateQuantity(item.product.$id, item.quantity - 1)}
                            aria-label={`Decrease quantity of ${item.product.name}`}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded disabled:opacity-40"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono font-bold text-slate-900 px-2">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={isSubmitting || item.quantity >= item.product.stockQuantity}
                            onClick={() => updateQuantity(item.product.$id, item.quantity + 1)}
                            aria-label={`Increase quantity of ${item.product.name}`}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded disabled:opacity-40"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Unit Price Rate Input */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-semibold">Rate:</span>
                          <Input
                            type="number"
                            min="0"
                            aria-label={`Rate for ${item.product.name}`}
                            disabled={isSubmitting}
                            value={item.unitPrice}
                            onChange={(e) => updateUnitPrice(item.product.$id, parseFloat(e.target.value) || 0)}
                            className="w-16 h-7 text-xs font-mono px-1.5 py-0 bg-white"
                          />
                        </div>

                        {/* Line Discount Input */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 font-semibold">Disc:</span>
                          <Input
                            type="number"
                            min="0"
                            aria-label={`Discount for ${item.product.name}`}
                            disabled={isSubmitting}
                            value={item.discount}
                            onChange={(e) => updateLineDiscount(item.product.$id, parseFloat(e.target.value) || 0)}
                            className="w-14 h-7 text-xs font-mono px-1 py-0 bg-white"
                          />
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => removeFromCart(item.product.$id)}
                          aria-label={`Remove ${item.product.name} from cart`}
                          className="text-slate-400 hover:text-red-600 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Overall Billing Summary & Calculation Controls */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-slate-900">Rs. {formatMoney(subtotal)}</span>
              </div>

              {/* Interactive Discount & VAT Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
                {/* Discount Section */}
                <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-extrabold text-slate-700">
                      Discount ({discountType === 'percent' ? '%' : 'Rs.'})
                    </Label>

                    {/* Segmented Toggle Button: Rs. | % */}
                    <div className="inline-flex items-center bg-slate-200 p-0.5 rounded-md text-[10px] font-bold">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setDiscountType('rs')}
                        aria-pressed={discountType === 'rs'}
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
                        disabled={isSubmitting}
                        onClick={() => setDiscountType('percent')}
                        aria-pressed={discountType === 'percent'}
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
                    disabled={isSubmitting}
                    placeholder={discountType === 'percent' ? 'e.g. 10%' : 'e.g. 50'}
                    value={discountInputValue === 0 ? '' : discountInputValue}
                    onChange={(e) => setDiscountInputValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-8 font-mono text-xs bg-white border-slate-300"
                  />

                  {effectiveOverallDiscount > 0 && (
                    <div className="text-[10px] text-emerald-700 font-bold font-mono text-right">
                      - Rs. {formatMoney(effectiveOverallDiscount)}
                    </div>
                  )}
                </div>

                {/* VAT Section */}
                <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-extrabold text-slate-700">
                      VAT ({isVatEnabled ? `${taxRate}%` : 'OFF'})
                    </Label>

                    {/* Segmented Toggle Button: OFF | ON */}
                    <div className="inline-flex items-center bg-slate-200 p-0.5 rounded-md text-[10px] font-bold">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setIsVatEnabled(false)}
                        aria-pressed={!isVatEnabled}
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
                        disabled={isSubmitting}
                        onClick={() => setIsVatEnabled(true)}
                        aria-pressed={isVatEnabled}
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
                      disabled={isSubmitting}
                      value={taxRate}
                      onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-8 font-mono text-xs bg-white border-slate-300"
                    />
                  ) : (
                    <div className="h-8 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-xs font-mono font-bold flex items-center justify-center">
                      VAT Disabled (0%)
                    </div>
                  )}

                  {isVatEnabled && (
                    <div className="text-[10px] text-slate-600 font-bold font-mono text-right">
                      + Rs. {formatMoney(taxAmount)}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Mode Selector Bar */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-[11px] font-extrabold text-slate-700">Select Payment Method</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setPaymentMode('full_payment')
                      setPaymentMethod('cash')
                      setPaidAmountInput(grandTotal.toString())
                    }}
                    aria-pressed={paymentMode === 'full_payment'}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      paymentMode === 'full_payment'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs font-extrabold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Full Payment
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setPaymentMode('partial_udhaar')
                      setPaymentMethod('cash')
                      if (parseFloat(paidAmountInput || '0') <= 0 || parseFloat(paidAmountInput || '0') >= grandTotal) {
                        setPaidAmountInput((grandTotal / 2).toFixed(2))
                      }
                    }}
                    aria-pressed={paymentMode === 'partial_udhaar'}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      paymentMode === 'partial_udhaar'
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs font-extrabold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> Partial Udhaar
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setPaymentMode('full_udhaar')
                      setPaymentMethod('full_udhaar')
                      setPaidAmountInput('0')
                    }}
                    aria-pressed={paymentMode === 'full_udhaar'}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      paymentMode === 'full_udhaar'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-extrabold'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" /> Full Udhaar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <Label htmlFor="paymentChannelSelect" className="text-[10px] font-bold text-slate-700">Payment Channel</Label>
                  <Select
                    value={paymentMethod}
                    disabled={isSubmitting}
                    onValueChange={(val) => {
                      const method = val as PaymentMethod
                      setPaymentMethod(method)
                      if (method === 'full_udhaar') {
                        setPaymentMode('full_udhaar')
                        setPaidAmountInput('0')
                      }
                    }}
                  >
                    <SelectTrigger id="paymentChannelSelect" aria-label="Select Payment Channel" className="h-8 text-xs font-medium bg-white">
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="full_udhaar">Full Udhaar</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card / Fonepay</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amountPaidInput" className="text-[10px] font-bold text-slate-700">Amount Paid (Rs.)</Label>
                  <Input
                    id="amountPaidInput"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    disabled={isSubmitting || paymentMode === 'full_udhaar' || paymentMethod === 'full_udhaar'}
                    placeholder={`Rs. ${formatMoney(grandTotal)}`}
                    value={paymentMode === 'full_udhaar' || paymentMethod === 'full_udhaar' ? '0' : paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="h-8 font-mono text-xs disabled:bg-slate-100 disabled:text-slate-500 bg-white"
                  />
                </div>
              </div>

              {/* Dynamic Payment Mode Summaries */}
              {paymentMode === 'full_payment' && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-slate-900 space-y-1 text-xs">
                  <div className="font-extrabold flex items-center justify-between text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Full Payment Summary
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-200 text-slate-900 font-black text-[10px]">
                      PAID IN FULL
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 font-mono">
                    <div>Grand Total: <span className="font-bold">Rs. {formatMoney(grandTotal)}</span></div>
                    <div>Paid Amount: <span className="font-bold text-emerald-700">Rs. {formatMoney(effectivePaidAmount)}</span></div>
                    <div>Udhaar Due: <span className="font-bold text-slate-700">Rs. 0.00</span></div>
                    {changeAmount > 0 && <div>Change Return: <span className="font-bold text-emerald-700">Rs. {formatMoney(changeAmount)}</span></div>}
                  </div>
                </div>
              )}

              {paymentMode === 'partial_udhaar' && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-slate-900 space-y-1 text-xs">
                  <div className="font-extrabold flex items-center justify-between text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-indigo-600" /> Partial Udhaar Summary
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-200 text-slate-900 font-black text-[10px]">
                      PARTIAL / DUE
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                    <div>
                      Customer:{' '}
                      <span className="font-bold text-slate-900">
                        {customers.find((c) => c.$id === selectedCustomerId)?.name || 'None (Mandatory)'}
                      </span>
                    </div>
                    <div>
                      Grand Total: <span className="font-mono font-bold text-slate-900">Rs. {formatMoney(grandTotal)}</span>
                    </div>
                    <div>
                      Paid Received: <span className="font-mono font-bold text-emerald-700">Rs. {formatMoney(effectivePaidAmount)}</span>
                    </div>
                    <div>
                      Udhaar Added: <span className="font-mono font-extrabold text-indigo-700">Rs. {formatMoney(dueAmount)}</span>
                    </div>
                  </div>
                </div>
              )}

              {paymentMode === 'full_udhaar' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-slate-900 space-y-1 text-xs">
                  <div className="font-extrabold flex items-center justify-between text-slate-900">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-amber-600" /> Full Udhaar Summary
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-slate-900 font-black text-[10px]">
                      UNPAID / FULL UDHAAR
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                    <div>
                      Customer:{' '}
                      <span className="font-bold text-slate-900">
                        {customers.find((c) => c.$id === selectedCustomerId)?.name || 'None (Mandatory)'}
                      </span>
                    </div>
                    <div>
                      Grand Total: <span className="font-mono font-bold text-slate-900">Rs. {formatMoney(grandTotal)}</span>
                    </div>
                    <div>
                      Paid Received: <span className="font-mono font-bold text-emerald-700">Rs. 0.00</span>
                    </div>
                    <div>
                      Udhaar Added: <span className="font-mono font-extrabold text-amber-800">Rs. {formatMoney(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Complete Sale Action Trigger */}
            <Button
              onClick={handleCompleteSale}
              disabled={isSubmitting || cart.length === 0 || isCustomerRequiredMissing}
              aria-label={isSubmitting ? "Completing sale transaction" : "Complete sale and print invoice"}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-sm disabled:opacity-50 mt-2 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Completing Sale...
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
