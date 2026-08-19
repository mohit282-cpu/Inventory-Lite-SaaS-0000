"use client"

import React from 'react'
import {
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  AlertTriangle,
  FileText,
  CreditCard,
  Smartphone,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Package,
    title: 'Inventory Management',
    desc: 'Catalog items with SKUs, barcodes, selling prices, categories, and initial stock quantities easily.',
  },
  {
    icon: ShoppingCart,
    title: 'Sales & Billing',
    desc: 'Record store transactions quickly with POS barcode scanning and instant price calculations.',
  },
  {
    icon: Users,
    title: 'Customer Management',
    desc: 'Keep customer profiles, purchase history, and outstanding credit dues (Udharo) organized.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Dashboard',
    desc: 'Monitor daily sales volume, current month revenue, product counts, and expense summaries.',
  },
  {
    icon: AlertTriangle,
    title: 'Low Stock Alerts',
    desc: 'Receive automatic stock threshold notifications before running out of top-selling items.',
  },
  {
    icon: FileText,
    title: 'Professional Invoices',
    desc: 'Generate clean A4 tax invoices and 80mm thermal receipts containing PAN/VAT details.',
  },
  {
    icon: CreditCard,
    title: 'Expense Tracking',
    desc: 'Log store operational expenses like rent, electricity, and wages to calculate real profit.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Friendly',
    desc: 'Access your full Inventory Lite portal seamlessly on smartphones, tablets, or laptops.',
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="py-16 sm:py-24 border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
            Core Features
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
            Everything you need to run your store
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Simple, practical features built specifically for daily micro-retail and wholesale operations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <div
                key={idx}
                className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
