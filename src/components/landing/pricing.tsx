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
  ]

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-white text-slate-900 border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="max-w-2xl mb-12 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            {t('pricing.badge')}
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mt-2">
            {t('pricing.headline')}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            {t('pricing.description')}
          </p>
        </div>

        {/* Single Clean Panel */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-10 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-200">
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {t('pricing.planTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {t('pricing.planDesc')}
              </p>
            </div>

            <div className="text-left md:text-right shrink-0">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-extrabold font-mono text-emerald-700">
                  NPR 0
                </span>
                <span className="text-sm text-slate-600 font-normal">{t('pricing.perMonth')}</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 shrink-0" /> {t('pricing.noCard')}
              </p>
            </div>
          </div>

          <div className="py-8">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              {t('pricing.includedHeader')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm text-slate-800">
              {includedList.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
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
              className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm text-base"
            >
              <Link href="/auth/signup">
                {t('pricing.startFree')} <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12 px-8 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 text-base font-semibold"
            >
              <Link href="/auth/login">{t('pricing.loginPortal')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
