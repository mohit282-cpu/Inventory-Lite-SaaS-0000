"use client"

import React, { useState } from 'react'
import Image from 'next/image'
import { useLanguage } from '@/context/language-context'
import {
  TrendingUp,
  CreditCard,
  Users,
  Boxes,
  PieChart,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'

export function LandingBusinessReports() {
  const { t } = useLanguage()
  const [imgError, setImgError] = useState(false)

  const reportItems = [
    {
      icon: TrendingUp,
      title: t('reports.salesLabel'),
      desc: t('reports.salesDesc'),
    },
    {
      icon: CreditCard,
      title: t('reports.expensesLabel'),
      desc: t('reports.expensesDesc'),
    },
    {
      icon: Users,
      title: t('reports.duesLabel'),
      desc: t('reports.duesDesc'),
    },
    {
      icon: Boxes,
      title: t('reports.stockValueLabel'),
      desc: t('reports.stockValueDesc'),
    },
    {
      icon: PieChart,
      title: t('reports.estimatedProfitLabel'),
      desc: t('reports.estimatedProfitDesc'),
      highlight: true,
    },
    {
      icon: ShieldCheck,
      title: t('reports.healthLabel'),
      desc: t('reports.healthDesc'),
    },
  ]

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white border-b border-slate-200 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section Header */}
        <div className="max-w-3xl text-left space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100">
            Business Intelligence
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {t('reports.headline')}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-[1.7]">
            {t('reports.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Side: Large Real Application Screenshot */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 sm:p-5 shadow-2xl overflow-hidden ring-1 ring-slate-800/80">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-slate-400 font-mono ml-2 hidden sm:inline">
                    inventorylite.app/reports
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  Audit Center Active
                </span>
              </div>

              {!imgError ? (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                  <Image
                    src="/screenshots/business-reports.png"
                    alt="Inventory Lite Business Reports & Audit Center"
                    width={1280}
                    height={800}
                    unoptimized
                    className="w-full h-auto object-cover object-top max-h-[480px] sm:max-h-[540px]"
                    onError={() => setImgError(true)}
                  />
                </div>
              ) : (
                <div className="p-6 bg-slate-900 rounded-xl space-y-3 font-mono text-xs">
                  <div className="text-slate-400">Total Sales: <span className="text-emerald-400 font-bold">Rs. 185,400</span></div>
                  <div className="text-slate-400">Total Expenses: <span className="text-rose-400 font-bold">Rs. 32,100</span></div>
                  <div className="text-slate-400">Estimated Profit: <span className="text-emerald-400 font-bold">Rs. 48,250</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Key Metrics Breakdown */}
          <div className="lg:col-span-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
              {reportItems.map((item, idx) => {
                const Icon = item.icon
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex items-start gap-3.5 transition-colors ${
                      item.highlight
                        ? 'bg-indigo-50/70 border-indigo-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${
                        item.highlight
                          ? 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-white text-indigo-700 border-slate-200'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-[1.6] mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Accountant Note & Disclaimer */}
            <div className="pt-2 space-y-2">
              <p className="text-xs sm:text-sm font-bold text-indigo-900 bg-indigo-50 px-4 py-2.5 rounded-lg border border-indigo-100">
                {t('reports.accountantNote')}
              </p>
              
              <div className="text-xs text-slate-500 flex items-start gap-2 pt-1 leading-normal">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t('reports.disclaimerNote')}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
