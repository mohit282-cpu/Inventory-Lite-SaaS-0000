"use client"

import React from 'react'
import { useLanguage } from '@/context/language-context'

export function LandingHowItWorks() {
  const { t } = useLanguage()

  const workflowSteps = [
    {
      step: '01',
      title: t('howItWorks.step1Title'),
      desc: t('howItWorks.step1Desc'),
    },
    {
      step: '02',
      title: t('howItWorks.step2Title'),
      desc: t('howItWorks.step2Desc'),
    },
    {
      step: '03',
      title: t('howItWorks.step3Title'),
      desc: t('howItWorks.step3Desc'),
    },
    {
      step: '04',
      title: t('howItWorks.step4Title'),
      desc: t('howItWorks.step4Desc'),
    },
    {
      step: '05',
      title: t('howItWorks.step5Title'),
      desc: t('howItWorks.step5Desc'),
    },
  ]

  return (
    <section id="workflow" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            {t('howItWorks.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            {t('howItWorks.headline')}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            {t('howItWorks.description')}
          </p>
        </div>

        {/* 5-Step Journey Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
          {workflowSteps.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-sm hover:border-indigo-300 transition-colors flex flex-col justify-start"
            >
              <div className="text-2xl font-extrabold font-mono text-indigo-600">
                {item.step}
              </div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">{item.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
