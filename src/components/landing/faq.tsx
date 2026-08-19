"use client"

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'What is Inventory Lite?',
    a: 'Inventory Lite is a simple, web-based inventory and billing management system built specifically for micro and small retail/wholesale businesses in Nepal.',
  },
  {
    q: 'Do I need to install any software?',
    a: 'No. Inventory Lite works directly through your standard web browser on desktop computers, laptops, tablets, or smartphones without downloading complex software.',
  },
  {
    q: 'Can I use it from my mobile phone?',
    a: 'Yes! The user interface is fully responsive and designed for easy navigation on mobile touchscreens.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. You can register for a Free account to manage basic stock and record store sales without entering credit card details.',
  },
  {
    q: 'Can I manage customer credit dues (Udharo)?',
    a: 'Yes. You can track customer profiles, record sales on credit, log partial payments, and see total outstanding balances anytime.',
  },
  {
    q: 'Is my business data isolated securely from other businesses?',
    a: 'Yes. Inventory Lite enforces multi-tenant database isolation. All queries and document reads are strictly filtered by your unique business ID so only authorized members of your business can access your data.',
  },
]

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <section id="faq" className="py-16 sm:py-24 border-b border-slate-800/60 bg-slate-900/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Everything you need to know about getting started with Inventory Lite.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm font-bold text-white focus:outline-none"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-indigo-400 transition-transform duration-200 shrink-0 ml-3 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50 mt-1">
                    <p className="pt-3">{item.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
