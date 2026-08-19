"use client"

import React from 'react'
import {
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

export function LandingFeatures() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-white text-slate-900 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Section Header */}
        <div className="max-w-3xl text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Feature Deep-Dives
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mt-2">
            Built for how your store operates
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Four essential tools combined into one quiet, reliable business application.
          </p>
        </div>

        {/* Story 1: Inventory (Image Left / Text Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-lg text-left text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="font-bold text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-400" /> Stock Inventory Ledger
              </span>
              <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> 2 Low Stock Alerts
              </span>
            </div>
            <div className="space-y-2 font-mono">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="text-white font-bold text-xs">Ultratech Cement (50kg)</div>
                  <div className="text-[10px] text-slate-400">SKU: UTR-CEM-01</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">120 Bags</div>
                  <div className="text-[10px] text-slate-500">Threshold: 10</div>
                </div>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="text-white font-bold text-xs">Copper Wire 1.5sqmm</div>
                  <div className="text-[10px] text-slate-400">SKU: COP-WIR-15</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-bold">4 Rolls</div>
                  <div className="text-[10px] text-slate-500">Threshold: 5</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 text-left space-y-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              01
            </div>
            <h3 className="text-2xl font-bold text-slate-900">
              Always know what&apos;s on your shelf.
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Catalog items with purchase & selling rates, barcodes, and custom alert thresholds. Every sale automatically updates current stock so you never run out unexpectedly.
            </p>
            <ul className="space-y-2 text-xs text-slate-700 pt-1 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Automatic low-stock threshold alerts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Stock movement history logs</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Story 2: Sales (Text Left / Image Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-t border-slate-200 pt-16">
          <div className="lg:col-span-5 text-left space-y-4 order-2 lg:order-1">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              02
            </div>
            <h3 className="text-2xl font-bold text-slate-900">
              Record sales without slowing down the counter.
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Quickly select items, scan barcodes, apply discounts, and calculate VAT tax rate totals during busy store rush hours.
            </p>
            <ul className="space-y-2 text-xs text-slate-700 pt-1 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Barcode scanner & quick SKU search</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Multiple payment methods (Cash, Fonepay, Card)</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-lg text-left text-xs order-1 lg:order-2">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-400" /> POS Billing Counter
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold">Total: Rs. 1,030.00</span>
            </div>
            <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between text-slate-200">
                <span>1x Ultratech Cement (50kg)</span>
                <span className="font-mono text-emerald-400 font-bold">Rs. 850.00</span>
              </div>
              <div className="flex justify-between text-slate-200">
                <span>2x PVC Elbow 1-inch</span>
                <span className="font-mono text-emerald-400 font-bold">Rs. 180.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Story 3: Customers & Dues (Image Left / Text Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-t border-slate-200 pt-16">
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-lg text-left text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-400" /> Customer Credit (Udharo) Ledger
              </span>
              <span className="text-xs text-amber-400 font-mono font-bold">Total Dues: Rs. 12,500</span>
            </div>
            <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-200">
                <div>
                  <div className="font-bold text-white">Shrestha Hardware & Construction</div>
                  <div className="text-[10px] text-slate-400">Phone: 9841000000</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-amber-400 font-bold">Rs. 8,500 Due</div>
                  <div className="text-[10px] text-emerald-400">Paid Rs. 4,000</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 text-left space-y-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              03
            </div>
            <h3 className="text-2xl font-bold text-slate-900">
              Keep customer credit dues in one place.
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Track customer accounts, record partial payments, and manage outstanding balances (Udharo) without searching through handwritten notebooks.
            </p>
            <ul className="space-y-2 text-xs text-slate-700 pt-1 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Customer purchase & credit history</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Partial payment settlement logging</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Story 4: Invoices (Text Left / Image Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-t border-slate-200 pt-16">
          <div className="lg:col-span-5 text-left space-y-4 order-2 lg:order-1">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              04
            </div>
            <h3 className="text-2xl font-bold text-slate-900">
              Professional invoices without complicated software.
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Generate clean A4 tax invoices or 80mm thermal receipts with PAN/VAT headers and date details ready for instant printing.
            </p>
            <ul className="space-y-2 text-xs text-slate-700 pt-1 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Printable A4 & 80mm Thermal Receipt formats</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>PAN/VAT business registration header</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-lg text-left text-xs order-1 lg:order-2 text-slate-900">
            <div className="flex justify-between border-b border-slate-200 pb-3 mb-3">
              <div>
                <div className="font-extrabold text-sm uppercase text-slate-900">Pashupati Traders</div>
                <div className="text-slate-600 text-[11px]">Kathmandu, Nepal • PAN: 601234567</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-indigo-700 text-sm">TAX INVOICE</div>
                <div className="text-slate-500 text-[11px]">INV-2026-0042</div>
              </div>
            </div>
            <div className="flex justify-between font-bold border-t border-b border-slate-200 py-2">
              <span>Total Amount Paid</span>
              <span className="font-mono text-sm">Rs. 1,030.00 (13% VAT Included)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
