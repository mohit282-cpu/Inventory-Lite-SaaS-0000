import React from 'react'

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Add your products',
    desc: 'Catalog items with SKUs, selling prices, categories, and initial stock quantities.',
  },
  {
    step: '02',
    title: 'Track your stock',
    desc: 'Monitor exact inventory quantities and receive automated low-stock notifications.',
  },
  {
    step: '03',
    title: 'Record a sale',
    desc: 'Select items or scan barcodes at the POS billing counter during customer checkout.',
  },
  {
    step: '04',
    title: 'Generate an invoice',
    desc: 'Print clean A4 tax invoices or 80mm thermal receipts with PAN/VAT headers.',
  },
  {
    step: '05',
    title: "Know what's left",
    desc: 'Review updated stock levels and outstanding customer dues (Udharo) in real time.',
  },
]

export function LandingHowItWorks() {
  return (
    <section id="workflow" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Simple Daily Journey
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            From stock to sale in a few clicks.
          </h2>
          <p className="mt-3 text-base text-slate-600">
            A linear workflow built around how shop owners actually run their counter day to day.
          </p>
        </div>

        {/* 5-Step Journey Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {WORKFLOW_STEPS.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-lg bg-white border border-slate-200 space-y-3 shadow-sm hover:border-indigo-300 transition-colors"
            >
              <div className="text-2xl font-extrabold font-mono text-indigo-600">
                {item.step}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
