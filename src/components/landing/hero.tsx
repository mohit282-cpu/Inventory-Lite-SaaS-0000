import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
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
    <section className="relative py-12 md:py-20 lg:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Human Copy & Primary Actions */}
          <div className="lg:col-span-5 text-left space-y-6">
            <div className="inline-block text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
              Inventory & billing for small businesses
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Know what you have. <br />
              <span className="text-indigo-600">Know what you sold.</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              Inventory Lite helps small businesses keep track of products, stock, sales, customers, and invoices without the complexity of traditional business software.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 px-7 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm text-base"
              >
                <Link href="/auth/signup">
                  Start Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-6 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-semibold text-base"
              >
                <a href="#product">See the product</a>
              </Button>
            </div>

            <div className="pt-4 flex items-center gap-6 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>NPR 0 Free Model</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>No Credit Card Needed</span>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Product UI Preview */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-4 sm:p-5 text-left">
              {/* Window Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 px-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-slate-400 font-mono ml-2 hidden sm:inline">
                    inventorylite.app/app/dashboard
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                  <Building className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Pashupati Hardware Store (NPR)</span>
                </div>
              </div>

              {/* Real Product UI Mockup */}
              <div className="space-y-4">
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                      <span>Today&apos;s Sales</span>
                      <ShoppingCart className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                      Rs. 14,250
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                      <span>This Month</span>
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      Rs. 185,400
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                      <span>Products</span>
                      <Package className="h-3.5 w-3.5 text-blue-400" />
                    </div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      148 Items
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                      <span>Low Stock</span>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                      3 Alerts
                    </div>
                  </div>
                </div>

                {/* Recent Activity Table */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-indigo-400" /> Live Sales Activity
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">Real-time</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] text-slate-400 font-semibold uppercase border-b border-slate-800/80">
                        <th className="pb-1.5">Sale #</th>
                        <th className="pb-1.5">Customer</th>
                        <th className="pb-1.5">Payment</th>
                        <th className="pb-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      <tr>
                        <td className="py-2 font-mono font-medium text-indigo-400">#INV-1048</td>
                        <td className="py-2 text-slate-200">Shrestha Hardware</td>
                        <td className="py-2 uppercase text-[10px] text-slate-400">Cash</td>
                        <td className="py-2 text-right font-mono font-bold text-emerald-400">Rs. 4,800</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono font-medium text-indigo-400">#INV-1047</td>
                        <td className="py-2 text-slate-200">Walk-in Customer</td>
                        <td className="py-2 uppercase text-[10px] text-slate-400">Fonepay</td>
                        <td className="py-2 text-right font-mono font-bold text-emerald-400">Rs. 1,250</td>
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
