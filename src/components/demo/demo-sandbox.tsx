"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { AppLogo } from '@/components/ui/app-logo'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import {
  ShoppingCart,
  Boxes,
  Users,
  Settings,
  ArrowLeft,
  Sparkles,
  Printer,
  Building,
  CheckCircle2,
} from 'lucide-react'
import { DemoPos, DemoProduct, DemoCustomer } from './demo-pos'
import { DemoInventory } from './demo-inventory'
import { DemoKhata } from './demo-khata'

const INITIAL_DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: 'p1',
    name: 'Wai Wai Instant Noodles 75g',
    category: 'FMCG',
    barcode: '8901030123456',
    purchasePrice: 18,
    sellingPrice: 25,
    stockQuantity: 120,
    unit: 'Pcs',
    expiryDate: '2026-11-30',
  },
  {
    id: 'p2',
    name: 'Fortune Sunlite Sunflower Oil 1L',
    category: 'Groceries',
    barcode: '8901030999999',
    purchasePrice: 240,
    sellingPrice: 285,
    stockQuantity: 18,
    unit: 'Ltr',
    expiryDate: '2027-01-15',
  },
  {
    id: 'p3',
    name: 'Samsung 25W Fast Charger Type-C',
    category: 'Electronics',
    barcode: '8806090123456',
    purchasePrice: 850,
    sellingPrice: 1250,
    stockQuantity: 8,
    unit: 'Pcs',
    isLowStock: true,
  },
  {
    id: 'p4',
    name: 'Goldstar Running Shoes Black Size 42',
    category: 'Clothing',
    barcode: '9770123456789',
    purchasePrice: 1200,
    sellingPrice: 1650,
    stockQuantity: 14,
    unit: 'Pair',
  },
  {
    id: 'p5',
    name: 'Dettol Original Soap 125g',
    category: 'FMCG',
    barcode: '8901030444444',
    purchasePrice: 45,
    sellingPrice: 60,
    stockQuantity: 45,
    unit: 'Pcs',
    expiryDate: '2026-10-20',
  },
  {
    id: 'p6',
    name: 'Basmati Chamal Premium 20kg Bag',
    category: 'Groceries',
    barcode: '8901030777777',
    purchasePrice: 2100,
    sellingPrice: 2450,
    stockQuantity: 5,
    unit: 'Bag',
    isLowStock: true,
  },
  {
    id: 'p7',
    name: 'Red Bull Energy Drink 250ml',
    category: 'FMCG',
    barcode: '9002490100070',
    purchasePrice: 165,
    sellingPrice: 210,
    stockQuantity: 60,
    unit: 'Can',
    expiryDate: '2026-09-15',
  },
  {
    id: 'p8',
    name: 'CG LED Smart TV 32-inch HD',
    category: 'Electronics',
    barcode: '8901030888888',
    purchasePrice: 16500,
    sellingPrice: 19800,
    stockQuantity: 3,
    unit: 'Pcs',
    isLowStock: true,
  },
]

const INITIAL_DEMO_CUSTOMERS: DemoCustomer[] = [
  { id: 'c1', name: 'Ram Bahadur Thapa', phone: '9801234567', dueBalance: 4500 },
  { id: 'c2', name: 'Sita Devi Shrestha', phone: '9841122334', dueBalance: 1250 },
  { id: 'c3', name: 'Hari Prasad Gurung', phone: '9811998877', dueBalance: 0 },
]

export function DemoSandbox() {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'khata' | 'settings'>('pos')
  const [products, setProducts] = useState<DemoProduct[]>(INITIAL_DEMO_PRODUCTS)
  const [customers, setCustomers] = useState<DemoCustomer[]>(INITIAL_DEMO_CUSTOMERS)

  const [shopInfo, setShopInfo] = useState({
    name: 'Sharma Kirana & General Store',
    address: 'New Road, Kathmandu, Nepal',
    panVatNumber: '301984210',
    phone: '+977 9805330808',
  })

  // Handlers for Stock & Customer updates across tabs
  const handleUpdateStock = (productId: string, quantitySold: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newQty = Math.max(0, p.stockQuantity - quantitySold)
          return { ...p, stockQuantity: newQty, isLowStock: newQty < 10 }
        }
        return p
      })
    )
  }

  const handleAdjustStock = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newQty = Math.max(0, p.stockQuantity + delta)
          return { ...p, stockQuantity: newQty, isLowStock: newQty < 10 }
        }
        return p
      })
    )
  }

  const handleAddProduct = (newProduct: DemoProduct) => {
    setProducts((prev) => [newProduct, ...prev])
  }

  const handleUpdateProduct = (updatedProduct: DemoProduct) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)))
  }

  const handleUpdateCustomerDue = (customerId: string, addDueAmount: number) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, dueBalance: c.dueBalance + addDueAmount } : c))
    )
  }

  const handleRecordPayment = (customerId: string, amountPaid: number) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, dueBalance: Math.max(0, c.dueBalance - amountPaid) } : c
      )
    )
  }

  const handleAddCustomer = (newCust: DemoCustomer) => {
    setCustomers((prev) => [newCust, ...prev])
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased pb-12">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 w-full bg-slate-950 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <AppLogo size={32} textColor="text-white" />
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800">
              <Sparkles className="h-3.5 w-3.5" /> Interactive Sandbox Mode
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher align="right" />
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white text-xs font-semibold"
            >
              <Link href="/">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Exit Sandbox
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Sandbox Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner Notice */}
        <div className="p-4 rounded-2xl bg-indigo-900 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-800">
          <div className="space-y-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-300" /> {shopInfo.name}
            </h2>
            <p className="text-xs text-indigo-200">
              PAN/VAT: <strong>{shopInfo.panVatNumber}</strong> • {shopInfo.address}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-indigo-700 text-indigo-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Live Nepalese Lakhs Currency & 58mm/80mm Thermal Receipt Engine Active
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'pos'
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <ShoppingCart className="h-4 w-4" /> POS Counter (F2/F4)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Boxes className="h-4 w-4" /> Stock & Inventory ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('khata')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'khata'
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Users className="h-4 w-4" /> Udhaar Khata ({customers.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Settings className="h-4 w-4" /> Receipt & Shop Profile
          </button>
        </div>

        {/* Tab Content Render */}
        {activeTab === 'pos' && (
          <DemoPos
            products={products}
            customers={customers}
            onUpdateStock={handleUpdateStock}
            onUpdateCustomerDue={handleUpdateCustomerDue}
            shopInfo={shopInfo}
          />
        )}

        {activeTab === 'inventory' && (
          <DemoInventory
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onAdjustStock={handleAdjustStock}
          />
        )}

        {activeTab === 'khata' && (
          <DemoKhata
            customers={customers}
            onRecordPayment={handleRecordPayment}
            onAddCustomer={handleAddCustomer}
          />
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs text-slate-900">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Printer className="h-5 w-5 text-indigo-600" /> Customizable Thermal Receipt Header Settings
            </h3>
            <p className="text-xs text-slate-500">
              Configure the business name, address, and PAN/VAT registration printed on customer invoices.
            </p>

            <div className="space-y-3 text-xs font-bold text-slate-700 pt-2">
              <div>
                <label className="block mb-1">Shop / Business Name</label>
                <input
                  type="text"
                  value={shopInfo.name}
                  onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block mb-1">Shop Address</label>
                <input
                  type="text"
                  value={shopInfo.address}
                  onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">PAN / VAT Number</label>
                  <input
                    type="text"
                    value={shopInfo.panVatNumber}
                    onChange={(e) => setShopInfo({ ...shopInfo, panVatNumber: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-medium font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={shopInfo.phone}
                    onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-medium font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
