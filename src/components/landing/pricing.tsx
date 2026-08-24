"use client"

import React from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/language-context'
import { Button } from '@/components/ui/button'
import { Check, ArrowRight, ShieldCheck } from 'lucide-react'

export function LandingPricing() {
  const { t } = useLanguage()

  const includedList = [
    t('pricing.item1'),
    t('pricing.item2'),
    t('pricing.item3'),
    t('pricing.item4'),
    t('pricing.item5'),
    t('pricing.item6'),
    t('pricing.item7'),
    t('pricing.item8'),
    t('pricing.item9'),
    t('pricing.item10'),
  ]

  return (
    <section id="pricing" className="py-12 sm:py-16 lg:py-20 bg-slate-50 text-slate-900 border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Section Heading */}
        <div className="max-w-2xl text-left space-y-2">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {t('pricing.headline')}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-[1.7]">
            {t('pricing.description')}
          </p>
        </div>

        {/* Single Transparent Panel */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
                Full Plan Included
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                Inventory Lite
              </h3>
            </div>

            <div className="text-left md:text-right shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-extrabold font-mono text-emerald-700">
                  NPR 0
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-700 font-bold mt-1 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 shrink-0" /> {t('pricing.noCard')}
              </p>
            </div>
          </div>

          <div className="py-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Included Shop Features
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-base text-slate-900 font-semibold">
              {includedList.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
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
              className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md text-base"
            >
              <Link href="/auth/signup">
                {t('pricing.startFree')} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 text-base font-semibold"
            >
              <a href="#product">{t('pricing.explore')}</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
