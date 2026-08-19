"use client"

import React from 'react'

const STEPS = [
  {
    step: '01',
    title: 'Create Your Business',
    desc: 'Register in seconds and enter your store name, address, PAN/VAT, and currency preference.',
  },
  {
    step: '02',
    title: 'Add Your Products',
    desc: 'Catalog your inventory with product names, SKUs, selling prices, categories, and initial stock.',
  },
  {
    step: '03',
    title: 'Start Selling & Billing',
    desc: 'Record sales, manage customer credit balances (Udharo), and print clean tax invoices.',
  },
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 border-b border-slate-800/60 bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
            Simple Workflow
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
            Get started in 3 simple steps
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            No complex setup or technical skills needed. Be operational in under 5 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {STEPS.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative space-y-4"
            >
              <div className="text-3xl font-black font-mono text-indigo-500/40">
                {item.step}
              </div>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
