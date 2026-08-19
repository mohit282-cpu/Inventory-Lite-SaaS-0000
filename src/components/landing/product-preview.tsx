"use client"

import React, { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Plus,
} from 'lucide-react'

type TabType = 'dashboard' | 'products' | 'pos' | 'invoice'

export function LandingProductPreview() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  return (
    <section id="preview" className="py-16 sm:py-24 border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
            Product Interface
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
            Designed for clarity and speed
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Explore the real user interface designed for daily retail operations.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" /> Live Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Package className="h-4 w-4" /> Products Catalog
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pos'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="h-4 w-4" /> POS Billing Terminal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'invoice'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" /> Tax Invoice
          </button>
        </div>

        {/* Preview Frame */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl">
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-fade-in text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white">Store Analytics</h4>
                  <p className="text-[11px] text-slate-400">Pashupati Traders • Kathmandu</p>
                </div>
                <div className="px-2.5 py-1 rounded bg-indigo-500/15 text-indigo-400 text-xs font-bold border border-indigo-500/30">
                  NPR Currency
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Today&apos;s Sales</div>
                  <div className="text-lg font-bold font-mono text-emerald-400 mt-1">Rs. 18,450.00</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">This Month</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">Rs. 242,100.00</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Products</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">214 Items</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Customer Dues</div>
                  <div className="text-lg font-bold font-mono text-amber-400 mt-1">Rs. 12,500.00</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-3 animate-fade-in text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white">Product Inventory</h4>
                <div className="px-3 py-1 bg-indigo-600 text-white rounded-md text-xs font-bold flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase">
                      <th className="pb-2">Product Name</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Selling Price</th>
                      <th className="pb-2">Stock Qty</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="py-2.5 font-bold text-white">Ultratech Cement (50kg)</td>
                      <td className="py-2.5 text-slate-300">Construction</td>
                      <td className="py-2.5 font-mono text-emerald-400 font-bold">Rs. 850.00</td>
                      <td className="py-2.5 font-mono text-slate-200">120 Bags</td>
                      <td className="py-2.5">
                        <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                          In Stock
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold text-white">Copper Wire 1.5sqmm</td>
                      <td className="py-2.5 text-slate-300">Electrical</td>
                      <td className="py-2.5 font-mono text-emerald-400 font-bold">Rs. 2,400.00</td>
                      <td className="py-2.5 font-mono text-amber-400 font-bold">4 Rolls</td>
                      <td className="py-2.5">
                        <span className="text-[11px] font-medium text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                          Low Stock
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold text-white">PVC Pipe 4-inch</td>
                      <td className="py-2.5 text-slate-300">Plumbing</td>
                      <td className="py-2.5 font-mono text-emerald-400 font-bold">Rs. 620.00</td>
                      <td className="py-2.5 font-mono text-red-400 font-bold">0 Pcs</td>
                      <td className="py-2.5">
                        <span className="text-[11px] font-medium text-red-400 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/30">
                          Out of Stock
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in text-left">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white border-b border-slate-800 pb-2">
                  POS Cart (3 items)
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>1x Ultratech Cement</span>
                  <span className="font-mono text-emerald-400 font-bold">Rs. 850.00</span>
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>2x PVC Elbow 1-inch</span>
                  <span className="font-mono text-emerald-400 font-bold">Rs. 180.00</span>
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>1x Teflon Tape</span>
                  <span className="font-mono text-emerald-400 font-bold">Rs. 40.00</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Grand Total</span>
                  <span className="font-mono text-lg text-emerald-400 font-extrabold">Rs. 1,070.00</span>
                </div>
                <div className="py-2 px-3 rounded bg-emerald-600 text-white font-bold text-xs text-center">
                  Complete Sale & Print Invoice
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoice' && (
            <div className="p-4 rounded-xl bg-white text-slate-900 animate-fade-in text-left text-xs space-y-3">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <div>
                  <div className="font-extrabold text-sm uppercase">Pashupati Traders</div>
                  <div className="text-slate-600">Kathmandu, Nepal • PAN: 601234567</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 text-sm">TAX INVOICE</div>
                  <div className="text-slate-500">INV-2026-0042</div>
                </div>
              </div>
              <div className="flex justify-between font-bold border-t border-b border-slate-200 py-1.5">
                <span>Total Amount Paid</span>
                <span className="font-mono text-sm">Rs. 1,070.00 (VAT Inclusive 13%)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
