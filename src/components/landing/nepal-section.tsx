"use client"

import React from 'react'
import {
  Banknote,
  FileCheck,
  Calendar,
  CreditCard,
  Wifi,
} from 'lucide-react'

const NEPAL_FEATURES = [
  {
    icon: Banknote,
    title: 'Native NPR Currency',
    desc: 'All sales transactions, product rates, stock valuation, and reports are computed natively in Nepali Rupees.',
  },
  {
    icon: FileCheck,
    title: 'PAN / VAT Printed Invoices',
    desc: 'Easily include your business PAN or VAT registration number on every printed invoice and receipt.',
  },
  {
    icon: Calendar,
    title: 'Bikram Sambat (B.S.) Dates',
    desc: 'Display and print transaction dates in Nepali B.S. calendar dates alongside standard A.D. dates.',
  },
  {
    icon: CreditCard,
    title: 'Udharo (Customer Dues) Tracking',
    desc: 'Keep clear ledger records of customer credit balances, partial cash payments, and remaining due amounts.',
  },
  {
    icon: Wifi,
    title: 'Fast Mobile Web Experience',
    desc: 'Optimized for smooth performance on smartphones across 3G, 4G, and local Wi-Fi connections in Nepal.',
  },
]

export function LandingNepalSection() {
  return (
    <section className="py-16 sm:py-24 border-b border-slate-800/60 bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3">
            Local Business Relevance
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Built with small businesses in Nepal in mind
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Tailored for local commercial workflows, payment customs, and billing requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {NEPAL_FEATURES.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="h-10 w-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
