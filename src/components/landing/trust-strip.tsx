"use client"

import React from 'react'
import { Zap, Smartphone, CheckCircle, Gift } from 'lucide-react'

const TRUST_POINTS = [
  {
    icon: Zap,
    title: 'Simple & Fast to Use',
    desc: 'No complex training required for store staff',
  },
  {
    icon: CheckCircle,
    title: 'Built for Nepal Businesses',
    desc: 'Native NPR currency & PAN/VAT invoice headers',
  },
  {
    icon: Smartphone,
    title: 'Works Desktop & Mobile',
    desc: 'Access your store data anywhere from your browser',
  },
  {
    icon: Gift,
    title: 'Start Free Today',
    desc: 'Get started instantly without entering credit card info',
  },
]

export function LandingTrustStrip() {
  return (
    <section className="py-8 bg-slate-900/40 border-b border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST_POINTS.map((pt, idx) => {
            const Icon = pt.icon
            return (
              <div key={idx} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-tight">
                    {pt.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    {pt.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
