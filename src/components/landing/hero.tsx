"use client"

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Sparkles,
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Building,
} from 'lucide-react'

export function LandingHero() {
  return (
    <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-6">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Built for Small Businesses in Nepal</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
          Simple Inventory & Billing. <span className="text-indigo-400">Free for Small Businesses.</span>
        </h1>

        {/* Supporting Copy */}
        <p className="mt-5 text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Manage your products, stock, sales, customers, and invoices from one simple dashboard — completely free.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/25 text-base"
          >
            <Link href="/auth/signup">
              Start Free <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto h-12 px-7 border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 text-base"
          >
            <a href="#how-it-works">See How It Works</a>
          </Button>
        </div>

        {/* Hero Product Visual Preview */}
        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-3 sm:p-5 text-left backdrop-blur-md">
            {/* Window header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 px-1">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-slate-400 font-mono ml-2 hidden sm:inline">
                  inventorylite.app/app/dashboard
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                <Building className="h-3.5 w-3.5 text-indigo-400" />
                <span>Pashupati Hardware Store (NPR)</span>
              </div>
            </div>

            {/* Dashboard Mock Content */}
            <div className="space-y-4">
              {/* KPI Cards Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
                    <span>Today&apos;s Sales</span>
                    <ShoppingCart className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">
                    Rs. 14,250.00
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
                    <span>Monthly Sales</span>
                    <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-white mt-1">
                    Rs. 185,400.00
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
                    <span>Products</span>
                    <Package className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-white mt-1">
                    148 Items
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase">
                    <span>Low Stock</span>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-amber-400 mt-1">
                    3 Alerts
                  </div>
                </div>
              </div>

              {/* Lower Section Preview: Recent Sales */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" /> Live Sales Activity
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> System Operational
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] text-slate-400 font-semibold uppercase border-b border-slate-800/80">
                        <th className="pb-2">Sale #</th>
                        <th className="pb-2">Customer</th>
                        <th className="pb-2">Payment</th>
                        <th className="pb-2 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      <tr>
                        <td className="py-2 font-mono font-medium text-indigo-400">#INV-1048</td>
                        <td className="py-2 text-slate-200">Shrestha Hardware</td>
                        <td className="py-2 uppercase text-[10px] text-slate-400">Cash</td>
                        <td className="py-2 text-right font-mono font-bold text-emerald-400">Rs. 4,800.00</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono font-medium text-indigo-400">#INV-1047</td>
                        <td className="py-2 text-slate-200">Walk-in Customer</td>
                        <td className="py-2 uppercase text-[10px] text-slate-400">Fonepay</td>
                        <td className="py-2 text-right font-mono font-bold text-emerald-400">Rs. 1,250.00</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono font-medium text-indigo-400">#INV-1046</td>
                        <td className="py-2 text-slate-200">Ramesh Traders</td>
                        <td className="py-2 uppercase text-[10px] text-slate-400">Bank Transfer</td>
                        <td className="py-2 text-right font-mono font-bold text-emerald-400">Rs. 8,200.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
