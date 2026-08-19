"use client"

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQ_ITEMS = [
  {
    q: 'What is Inventory Lite?',
    a: 'Inventory Lite is a simple web-based inventory, sales POS billing, customer credit (Udharo), and invoice management application built specifically for small retail and wholesale businesses.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes. Inventory Lite is 100% free to use for small businesses with no hidden charges, trial expirations, or credit card requirements.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. Inventory Lite runs directly in your web browser on mobile phones, tablets, laptops, and desktop computers.',
  },
  {
    q: 'Can I use it on my phone?',
    a: 'Yes. The entire application interface is fully responsive and designed to work smoothly on Android, iOS, and desktop browsers.',
  },
  {
    q: 'Can I manage customer dues (Udharo)?',
    a: 'Yes. You can record customer profiles, log credit sales, record partial repayments, and track remaining due balances in real time.',
  },
  {
    q: 'Can I print invoices?',
    a: 'Yes. You can generate printable A4 tax invoices and 80mm thermal receipts with your shop’s PAN/VAT details directly from your web browser.',
  },
  {
    q: 'Is my business data separated from other businesses?',
    a: 'Yes. Every registered business operates in complete multi-tenant isolation. Your store’s products, sales, and customer ledgers are strictly accessible only by authorized members of your business account.',
  },
]

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <section id="faq" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200 text-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Clear Answers
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        {/* Clean Accordion List */}
        <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx
            return (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between text-left text-base font-bold text-slate-900 focus:outline-none"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-500 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed animate-fade-in">
                    {item.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
