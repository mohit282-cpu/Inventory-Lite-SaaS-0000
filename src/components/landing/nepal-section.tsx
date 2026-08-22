import React from 'react'
import {
  Banknote,
  FileCheck,
  Calendar,
  CreditCard,
  Wifi,
} from 'lucide-react'

const NEPAL_POINTS = [
  {
    icon: Banknote,
    title: 'Native NPR Currency',
    desc: 'All sales rates, inventory valuation, and expense reports are computed natively in Nepali Rupees.',
  },
  {
    icon: FileCheck,
    title: 'PAN & VAT Invoicing',
    desc: 'Print official receipts with your store’s PAN or VAT registration number.',
  },
  {
    icon: Calendar,
    title: 'Bikram Sambat (B.S.) Dates',
    desc: 'Display transaction dates in Nepali B.S. calendar dates alongside standard A.D.',
  },
  {
    icon: CreditCard,
    title: 'Customer Udharo Ledger',
    desc: 'Track customer credit, log partial payments, and see remaining due balances.',
  },
  {
    icon: Wifi,
    title: 'Fast Mobile Web Access',
    desc: 'Works smoothly on mobile browsers across 3G, 4G, and local store Wi-Fi.',
  },
]

export function LandingNepalSection() {
  return (
    <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Local Business Context
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mt-2 leading-[1.15]">
            Made for the way small businesses in Nepal actually work.
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Designed around local retail customs, currency formats, PAN/VAT invoice standards, and customer credit traditions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {NEPAL_POINTS.map((pt, idx) => {
            const Icon = pt.icon
            return (
              <div
                key={idx}
                className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3"
              >
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{pt.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{pt.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
