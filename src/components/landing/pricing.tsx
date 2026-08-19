"use client"

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, ArrowRight, ShieldCheck } from 'lucide-react'

const INCLUDED_LIST = [
  'Product catalog & category management',
  'Stock level tracking & low-stock alerts',
  'POS billing counter & barcode scanning',
  'Customer credit (Udharo) & due ledger',
  'Printable A4 tax invoices & thermal receipts',
  'Operational store expense logging',
  'Dashboard analytics & sales trend charts',
  'Profit & Loss operational summary reports',
  'Mobile & desktop web application access',
]

export function LandingPricing() {
  return (
    <section id="pricing" className="py-16 sm:py-24 bg-white text-slate-900 border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="max-w-2xl mb-12 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Transparent Access
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mt-2">
            Everything you need. NPR 0.
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Inventory Lite is free to use for small businesses in Nepal. No credit card or subscription required.
          </p>
        </div>

        {/* Single Clean Panel */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 sm:p-12 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-200">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Inventory Lite Complete MVP
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Full core functionality included without recurring software fees.
              </p>
            </div>

            <div className="text-left md:text-right shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-extrabold font-mono text-emerald-700">
                  NPR 0
                </span>
                <span className="text-sm text-slate-600 font-normal">/ month</span>
              </div>
              <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> No credit card required
              </p>
            </div>
          </div>

          <div className="py-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              What&apos;s Included:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-800">
              {INCLUDED_LIST.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-start gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm text-base"
            >
              <Link href="/auth/signup">
                Start Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 text-base font-semibold"
            >
              <Link href="/auth/login">Login to Portal</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
