"use client"

import React from 'react'
import { useLanguage } from '@/context/language-context'
import {
  PackagePlus,
  Boxes,
  ShoppingCart,
  Receipt,
  BarChart3,
  ChevronRight,
} from 'lucide-react'

export function LandingHowItWorks() {
  const { t } = useLanguage()

  const workflowSteps = [
    {
      num: '01',
      title: t('howItWorks.step1Title'),
      desc: t('howItWorks.step1Desc'),
      icon: PackagePlus,
    },
    {
      num: '02',
      title: t('howItWorks.step2Title'),
      desc: t('howItWorks.step2Desc'),
      icon: Boxes,
    },
    {
      num: '03',
      title: t('howItWorks.step3Title'),
      desc: t('howItWorks.step3Desc'),
      icon: ShoppingCart,
    },
    {
      num: '04',
      title: t('howItWorks.step4Title'),
      desc: t('howItWorks.step4Desc'),
      icon: Receipt,
    },
    {
      num: '05',
      title: t('howItWorks.step5Title'),
      desc: t('howItWorks.step5Desc'),
      icon: BarChart3,
    },
  ]

  return (
    <section id="workflow" className="py-12 sm:py-16 lg:py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-3xl text-left space-y-3">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {t('howItWorks.headline')}
          </h2>
          
          {/* Visual Flow Indicator */}
          <div className="inline-flex items-center gap-1.5 flex-wrap text-xs sm:text-sm font-bold text-indigo-800 bg-indigo-50 px-3.5 py-1.5 rounded-lg border border-indigo-100">
            <span>उत्पादन</span>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-500" />
            <span>स्टक</span>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-500" />
            <span>बिक्री</span>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-500" />
            <span>भुक्तानी/उधारो</span>
            <ChevronRight className="h-3.5 w-3.5 text-indigo-500" />
            <span>रिपोर्ट</span>
          </div>
        </div>

        {/* 5-Step Journey Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 relative items-stretch">
          {workflowSteps.map((item, idx) => {
            const Icon = item.icon
            const isLast = idx === workflowSteps.length - 1
            return (
              <div key={idx} className="relative flex flex-col">
                <div className="h-full p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-400 hover:shadow-md transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                        {item.num}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 leading-[1.6]">
                      {item.desc}
                    </p>
                  </div>
                </div>

                {!isLast && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-indigo-600 text-white items-center justify-center shadow-md border-2 border-white">
                    <ChevronRight className="h-4 w-4 shrink-0" />
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
