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
    <section id="product" className="py-16 sm:py-24 bg-slate-900 text-slate-100 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="max-w-3xl mb-12 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Actual Product Showcase
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
            Built around real daily store operations
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Click through the core views of Inventory Lite. Simple interfaces built for speed behind the counter.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-slate-800 pb-4">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" /> 01. Dashboard Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Package className="h-4 w-4" /> 02. Products & Stock
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'pos'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShoppingCart className="h-4 w-4" /> 03. POS Billing Counter
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'invoice'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FileText className="h-4 w-4" /> 04. Tax Invoice & Receipts
          </button>
        </div>

        {/* Tab View Container */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-fade-in text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white">Live Store Summary</h4>
                  <p className="text-xs text-slate-400">Products • Stock • Revenue • Outstanding Dues</p>
                </div>
                <span className="text-xs text-indigo-400 font-mono">NPR Currency</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Today&apos;s Revenue</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">Rs. 18,450.00</div>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Monthly Volume</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">Rs. 242,100.00</div>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Cataloged Items</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">214 Items</div>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Udharo (Customer Dues)</div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-1">Rs. 12,500.00</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-3 animate-fade-in text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white">Product Catalog & Alerts</h4>
                  <p className="text-xs text-slate-400">Keep your stock organized with instant threshold alerts</p>
                </div>
                <div className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold flex items-center gap-1">
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
                      <th className="pb-2">Stock Level</th>
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
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in text-left">
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white border-b border-slate-800 pb-2">
                  Record a sale in seconds
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>1x Ultratech Cement</span>
                  <span className="font-mono text-emerald-400 font-bold">Rs. 850.00</span>
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>2x PVC Elbow 1-inch</span>
                  <span className="font-mono text-emerald-400 font-bold">Rs. 180.00</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-xs text-slate-400 font-semibold uppercase">Grand Total</span>
                  <span className="font-mono text-lg text-emerald-400 font-extrabold">Rs. 1,030.00</span>
                </div>
                <div className="py-2 px-3 rounded bg-emerald-600 text-white font-bold text-xs text-center">
                  Complete Sale & Print Invoice
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoice' && (
            <div className="p-4 rounded-lg bg-white text-slate-900 animate-fade-in text-left text-xs space-y-3">
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
                <span className="font-mono text-sm">Rs. 1,030.00 (VAT 13% Included)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
