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
} from 'lucide-react'
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
  const [overallDiscount, setOverallDiscount] = useState<number>(0)
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

  // Memoized Calculations
  const { subtotal, grandTotal, dueAmount, effectivePaidAmount } =
    React.useMemo(() => {
      const sub = cart.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice - item.discount,
        0
      )
      const taxable = Math.max(0, sub - overallDiscount)
      const tax = (taxable * taxRate) / 100
      const total = taxable + tax
      const paid = paidAmountInput !== '' ? parseFloat(paidAmountInput) || 0 : total
      const due = Math.max(0, total - paid)

      return {
        subtotal: sub,
        taxableSubtotal: taxable,
        taxAmount: tax,
        grandTotal: total,
        dueAmount: due,
        effectivePaidAmount: paid,
      }
    }, [cart, overallDiscount, taxRate, paidAmountInput])

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
        overallDiscount,
        taxRate,
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
    <div className="space-y-4">
      <PageHeader
        title="POS Billing Terminal"
        description="Quick point-of-sale terminal for instant customer billing and stock deduction."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push('/app/sales')}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
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
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
              <Input
                placeholder="Scan Barcode or SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-white font-mono placeholder:text-slate-500"
              />
            </form>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search catalog by product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Catalog Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-2" /> Loading inventory...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center border border-slate-800 rounded-xl bg-slate-900/60 text-slate-400 text-sm">
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
                    className={`p-3 text-left rounded-xl border transition-all ${
                      isOutOfStock
                        ? 'border-slate-800/40 bg-slate-950/40 opacity-50 cursor-not-allowed'
                        : 'border-slate-800 bg-slate-900/80 hover:border-indigo-500/60 hover:bg-slate-800/80 active:scale-[0.98]'
                    }`}
                  >
                    <div className="font-semibold text-white text-xs truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {p.sku}</div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                      <span className="font-mono font-bold text-indigo-400 text-xs">
                        Rs. {p.sellingPrice.toFixed(2)}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                          isOutOfStock
                            ? 'bg-red-500/20 text-red-400'
                            : p.stockQuantity <= (p.lowStockThreshold || 5)
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
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
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-indigo-400" /> Current Cart ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Select Customer (Optional)</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white text-xs">
                  <SelectValue placeholder="Walk-in Guest / Select Customer" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs max-h-48">
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
              <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                Click products from the catalog or scan barcodes to add to cart.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cart.map((item) => {
                  const lineTotal = item.quantity * item.unitPrice - item.discount
                  return (
                    <div
                      key={item.product.$id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white truncate max-w-[160px]">
                          {item.product.name}
                        </span>
                        <span className="font-mono font-bold text-emerald-400">
                          Rs. {lineTotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-md p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.$id, item.quantity - 1)}
                            className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono font-bold text-white px-2">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.$id, item.quantity + 1)}
                            className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Unit Price input */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">Rate:</span>
                          <Input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateUnitPrice(item.product.$id, parseFloat(e.target.value) || 0)}
                            className="w-16 h-7 text-xs font-mono bg-slate-900 border-slate-800 text-white px-1.5 py-0"
                          />
                        </div>

                        {/* Line Discount input */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500">Disc:</span>
                          <Input
                            type="number"
                            min="0"
                            value={item.discount}
                            onChange={(e) => updateLineDiscount(item.product.$id, parseFloat(e.target.value) || 0)}
                            className="w-14 h-7 text-xs font-mono bg-slate-900 border-slate-800 text-white px-1 py-0"
                          />
                        </div>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.$id)}
                          className="text-slate-500 hover:text-red-400 p-1"
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
            <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-white">Rs. {subtotal.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 py-1">
                <div>
                  <Label className="text-[10px] text-slate-400">Overall Discount (Rs.)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={overallDiscount}
                    onChange={(e) => setOverallDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-8 bg-slate-950/60 border-slate-800 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-400">VAT Tax (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-8 bg-slate-950/60 border-slate-800 text-white font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between text-slate-300 font-bold py-1 border-t border-slate-800">
                <span>Grand Total</span>
                <span className="font-mono text-base text-emerald-400">
                  Rs. {grandTotal.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <Label className="text-[10px] text-slate-400">Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
                  >
                    <SelectTrigger className="h-8 bg-slate-950/60 border-slate-800 text-white text-xs">
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs">
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card / Fonepay</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[10px] text-slate-400">Paid Amount (Rs.)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder={`Full (Rs. ${grandTotal.toFixed(2)})`}
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    className="h-8 bg-slate-950/60 border-slate-800 text-white font-mono text-xs"
                  />
                </div>
              </div>

              {dueAmount > 0 && (
                <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/60 text-xs flex justify-between text-red-200">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-red-400" /> Outstanding Due:
                  </span>
                  <span className="font-mono font-bold">Rs. {dueAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Complete Sale Action Trigger */}
            <Button
              onClick={handleCompleteSale}
              disabled={isSubmitting || cart.length === 0}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50 mt-2"
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
