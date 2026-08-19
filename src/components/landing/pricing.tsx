"use client"

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react'

const INCLUDED_FEATURES = [
  'Product catalog & category management',
  'Real-time stock level tracking & low-stock alerts',
  'POS sales terminal & barcode scanning',
  'Customer credit (Udharo) & due balance tracking',
  'Printable A4 tax invoices & 80mm thermal receipts',
  'Daily & monthly operational expense logging',
  'Interactive dashboard metrics & sales trend charts',
  'Basic Profit & Loss operational summary reports',
  'Fully responsive mobile & desktop web application',
]

export function LandingPricing() {
  return (
    <section id="pricing" className="py-16 sm:py-24 border-b border-slate-800/60 bg-slate-900/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" /> 100% Free Software
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Inventory Lite — Free Forever
          </h2>
          <p className="mt-3 text-base text-slate-400">
            Simple Inventory & Billing. Free for small businesses in Nepal. No credit card or subscription required.
          </p>
        </div>

        {/* Single Ultra-Clean Pricing Card */}
        <div className="rounded-3xl border border-indigo-500/40 bg-slate-900 p-8 sm:p-12 shadow-2xl relative overflow-hidden ring-1 ring-indigo-500/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div>
              <div className="text-xl font-bold text-white flex items-center gap-2">
                <span>Inventory Lite Complete MVP</span>
                <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/15 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  Full Access
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Everything you need to manage your store stock, customers, and billing.
              </p>
            </div>

            <div className="text-left md:text-right shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-extrabold font-mono text-emerald-400">
                  NPR 0
                </span>
                <span className="text-sm text-slate-400 font-normal">/ month</span>
              </div>
              <p className="text-xs text-emerald-400/90 font-medium mt-1 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> No credit card required
              </p>
            </div>
          </div>

          <div className="py-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Included in Inventory Lite:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-200">
              {INCLUDED_FEATURES.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="leading-snug">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 text-base"
            >
              <Link href="/auth/signup">
                Start Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 text-base"
            >
              <Link href="/auth/login">Login to Portal</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
