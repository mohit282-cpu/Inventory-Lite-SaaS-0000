"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Barcode,
  QrCode,
  UserCheck,
  DollarSign,
} from 'lucide-react'
import { formatNPR } from '@/lib/localization'
import { DemoThermalReceipt, DemoReceiptData } from './demo-thermal-receipt'

export interface DemoProduct {
  id: string
  name: string
  category: string
  barcode: string
  purchasePrice: number
  sellingPrice: number
  stockQuantity: number
  unit: string
  expiryDate?: string
  isLowStock?: boolean
}

export interface DemoCustomer {
  id: string
  name: string
  phone: string
  dueBalance: number
}

interface DemoPosProps {
  products: DemoProduct[]
  customers: DemoCustomer[]
  onUpdateStock: (productId: string, quantitySold: number) => void
  onUpdateCustomerDue: (customerId: string, addDueAmount: number) => void
  shopInfo: {
    name: string
    address: string
    panVatNumber: string
    phone: string
  }
}

interface CartItem extends DemoProduct {
  cartQty: number
  discount: number
}

export function DemoPos({
  products,
  customers,
  onUpdateStock,
  onUpdateCustomerDue,
  shopInfo,
}: DemoPosProps) {
  const { toast } = useToast()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [taxMode, setTaxMode] = useState<'pan' | 'vat'>('vat') // 'pan' = 0%, 'vat' = 13%
  const [selectedCustomer, setSelectedCustomer] = useState<DemoCustomer | null>(null)

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'khata' | 'split'>('cash')
  const [cashTendered, setCashTendered] = useState<string>('')

  // Thermal Receipt Modal State
  const [receiptData, setReceiptData] = useState<DemoReceiptData | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  // Focus search bar on mount & keyboard shortcuts (F2: search, F4: checkout)
  useEffect(() => {
    searchInputRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      } else if (e.key === 'F4') {
        e.preventDefault()
        if (cart.length > 0) {
          setIsCheckoutOpen(true)
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart])

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      p.category.toLowerCase().includes(q)
    return matchesCat && matchesSearch
  })

  const categories = ['all', ...Array.from(new Set(products.map((p) => p.category)))]

  // Add to cart
  const addToCart = (product: DemoProduct) => {
    if (product.stockQuantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Out of Stock',
        description: `${product.name} has 0 stock quantity available.`,
      })
      return
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        if (existing.cartQty >= product.stockQuantity) {
          toast({
            variant: 'destructive',
            title: 'Stock Limit Reached',
            description: `Only ${product.stockQuantity} ${product.unit} available in stock.`,
          })
          return prev
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item
        )
      }
      return [...prev, { ...product, cartQty: 1, discount: 0 }]
    })
  }

  // Update item quantity
  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.cartQty + delta
            if (newQty > item.stockQuantity) {
              toast({
                variant: 'destructive',
                title: 'Stock Exceeded',
                description: `Maximum available quantity is ${item.stockQuantity}`,
              })
              return item
            }
            return newQty > 0 ? { ...item, cartQty: newQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId))
  }

  // Simulate Barcode Scanner input
  const handleSimulateBarcode = () => {
    const barcodeItem = products.find((p) => p.barcode === '8901030123456') || products[0]
    if (barcodeItem) {
      addToCart(barcodeItem)
      toast({
        title: 'Barcode Scanned',
        description: `Scanned: ${barcodeItem.name} (${barcodeItem.barcode})`,
      })
    }
  }

  // Cart Totals
  const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.cartQty, 0)
  const taxAmount = taxMode === 'vat' ? subtotal * 0.13 : 0
  const grandTotal = subtotal + taxAmount

  // Cash Change Calculation
  const parsedCash = parseFloat(cashTendered) || 0
  const changeGiven = parsedCash > grandTotal ? parsedCash - grandTotal : 0

  // Complete Order
  const handleCompleteSale = () => {
    if (cart.length === 0) return

    if (paymentMethod === 'khata' && !selectedCustomer) {
      toast({
        variant: 'destructive',
        title: 'Customer Required for Khata',
        description: 'Please select a customer from the dropdown to bill on Khata (Credit).',
      })
      return
    }

    // Process Stock Update
    cart.forEach((item) => {
      onUpdateStock(item.id, item.cartQty)
    })

    // Process Customer Due Update if Khata or Split
    if (paymentMethod === 'khata' && selectedCustomer) {
      onUpdateCustomerDue(selectedCustomer.id, grandTotal)
    }

    const now = new Date()
    const invoiceNum = `INV-83/84-${Math.floor(100000 + Math.random() * 900000)}`
    const bsDate = '२०८३ श्रावण १०'

    const receipt: DemoReceiptData = {
      shopName: shopInfo.name,
      shopAddress: shopInfo.address,
      panVatNumber: shopInfo.panVatNumber,
      phone: shopInfo.phone,
      invoiceNumber: invoiceNum,
      date: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bsDate: bsDate,
      cashierName: 'Demo Cashier',
      customerName: selectedCustomer?.name,
      taxMode: taxMode,
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.cartQty,
        unitPrice: item.sellingPrice,
        total: item.sellingPrice * item.cartQty,
      })),
      subtotal: subtotal,
      taxAmount: taxAmount,
      totalAmount: grandTotal,
      paymentMethod:
        paymentMethod === 'cash'
          ? 'CASH'
          : paymentMethod === 'qr'
          ? 'FONEPAY QR'
          : paymentMethod === 'khata'
          ? 'KHATA (UDHARO)'
          : 'SPLIT (CASH + QR)',
      paidAmount: parsedCash > 0 ? parsedCash : grandTotal,
      changeAmount: changeGiven,
      paperWidth: '80mm',
    }

    setReceiptData(receipt)
    setIsCheckoutOpen(false)
    setIsReceiptOpen(true)
    setCart([])
    setCashTendered('')
    setSelectedCustomer(null)

    toast({
      title: 'Sale Completed Successfully!',
      description: `Invoice ${invoiceNum} generated. Total: ${formatNPR(grandTotal)}`,
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Product Selection & Counter */}
      <div className="lg:col-span-7 space-y-4">
        {/* Search & Barcode Emulation Bar */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search items by name, barcode... (F2)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    e.preventDefault()
                    const exactBarcodeMatch = products.find((p) => p.barcode === searchQuery.trim())
                    if (exactBarcodeMatch) {
                      addToCart(exactBarcodeMatch)
                      setSearchQuery('')
                    } else if (filteredProducts.length > 0) {
                      addToCart(filteredProducts[0])
                      setSearchQuery('')
                    }
                  }
                }}
                className="pl-10 h-11 bg-slate-50 border-slate-200 text-sm focus:bg-white"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleSimulateBarcode}
              className="h-11 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-semibold text-xs sm:text-sm shrink-0"
            >
              <Barcode className="mr-1.5 h-4 w-4 text-indigo-600" /> Scan Barcode
            </Button>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Catalog Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.stockQuantity <= 0
            return (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                className={`p-3.5 rounded-xl bg-white border transition-all cursor-pointer select-none space-y-2 flex flex-col justify-between ${
                  isOutOfStock
                    ? 'opacity-60 border-slate-200 bg-slate-50 cursor-not-allowed'
                    : 'border-slate-200 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                      {p.category}
                    </span>
                    {p.isLowStock && (
                      <span className="text-[9px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Low Stock
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-tight">
                    {p.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">Code: {p.barcode}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-indigo-700">
                    {formatNPR(p.sellingPrice)}
                  </span>
                  <span className={`text-[11px] font-bold ${isOutOfStock ? 'text-rose-600' : 'text-slate-600'}`}>
                    {p.stockQuantity} {p.unit}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column: Active Cart Sidebar */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Current Order ({cart.length})</h3>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setCart([])}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Customer Select Dropdown for Khata Billing */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5 text-indigo-600" /> Customer Profile (Optional for Khata)
          </label>
          <select
            value={selectedCustomer?.id || ''}
            onChange={(e) => {
              const cust = customers.find((c) => c.id === e.target.value) || null
              setSelectedCustomer(cust)
            }}
            className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-medium bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
          >
            <option value="">-- Walk-in Cash Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone}) - Due: {formatNPR(c.dueBalance)}
              </option>
            ))}
          </select>
        </div>

        {/* Itemized Cart List */}
        <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingCart className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">Cart is empty. Click items or scan barcode.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-slate-900 truncate">{item.name}</h5>
                  <p className="text-slate-500 font-mono">{formatNPR(item.sellingPrice)} / {item.unit}</p>
                </div>

                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, -1)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="font-bold px-1 min-w-[20px] text-center">{item.cartQty}</span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.id, 1)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <span className="font-extrabold text-slate-900 w-16 text-right">
                  {formatNPR(item.sellingPrice * item.cartQty)}
                </span>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Tax Mode Switcher (PAN vs 13% VAT) */}
        <div className="pt-2 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTaxMode('pan')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                taxMode === 'pan' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              0% PAN Bill
            </button>
            <button
              type="button"
              onClick={() => setTaxMode('vat')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                taxMode === 'vat' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              13% VAT Invoice
            </button>
          </div>

          {/* Subtotal & Total Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">{formatNPR(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({taxMode === 'vat' ? '13% VAT' : '0% PAN'}):</span>
              <span className="font-semibold text-slate-900">{formatNPR(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="text-indigo-700">{formatNPR(grandTotal)}</span>
            </div>
          </div>

          <Button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md rounded-xl"
          >
            Checkout & Pay (F4)
          </Button>
        </div>
      </div>

      {/* Checkout Dialog Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 space-y-5 shadow-2xl border border-slate-200 animate-fade-in text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Complete Payment</h3>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Total Display Banner */}
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-center space-y-1">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Amount Due</span>
              <div className="text-3xl font-extrabold text-indigo-900">{formatNPR(grandTotal)}</div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Select Payment Tender</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                    paymentMethod === 'cash'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="h-5 w-5" /> Cash
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('qr')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                    paymentMethod === 'qr'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="h-5 w-5" /> Fonepay QR
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('khata')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-colors ${
                    paymentMethod === 'khata'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <UserCheck className="h-5 w-5" /> Khata (Udharo)
                </button>
              </div>
            </div>

            {/* Cash Tender Input */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700">Cash Amount Tendered (Rs.)</label>
                <Input
                  type="number"
                  placeholder={`e.g. ${Math.ceil(grandTotal / 100) * 100}`}
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="h-11 text-base font-bold"
                />
                {parsedCash > 0 && (
                  <div className="flex justify-between text-xs font-bold pt-1">
                    <span className="text-slate-600">Change Return:</span>
                    <span className={changeGiven > 0 ? 'text-emerald-600 font-extrabold' : 'text-slate-900'}>
                      {formatNPR(changeGiven)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* QR Payment Preview */}
            {paymentMethod === 'qr' && (
              <div className="p-4 rounded-xl bg-slate-900 text-white text-center space-y-2 border border-slate-800">
                <QrCode className="h-16 w-16 mx-auto text-emerald-400" />
                <p className="text-xs font-semibold text-slate-300">Scan Fonepay / eSewa / Khalti QR code</p>
                <p className="text-sm font-extrabold text-emerald-400">{formatNPR(grandTotal)}</p>
              </div>
            )}

            {/* Khata Notice */}
            {paymentMethod === 'khata' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <span className="font-bold block">Khata Credit Sale:</span>
                {selectedCustomer ? (
                  <p>
                    Full total of <strong>{formatNPR(grandTotal)}</strong> will be added to{' '}
                    <strong>{selectedCustomer.name}</strong>&apos;s Udhaar balance.
                  </p>
                ) : (
                  <p className="text-rose-700 font-bold">Please select a customer from the POS sidebar first.</p>
                )}
              </div>
            )}

            <Button
              type="button"
              onClick={handleCompleteSale}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
            >
              Complete Sale & Print Receipt
            </Button>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {receiptData && (
        <DemoThermalReceipt
          data={receiptData}
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}
    </div>
  )
}
