"use client"

import React from 'react'
import { useLanguage } from '@/context/language-context'
import {
  Banknote,
  FileCheck,
  Calendar,
  CreditCard,
  Wifi,
} from 'lucide-react'

export function LandingNepalSection() {
  const { t } = useLanguage()

  const nepalPoints = [
    {
      icon: Banknote,
      title: t('nepal.pt1Title'),
      desc: t('nepal.pt1Desc'),
    },
    {
      icon: FileCheck,
      title: t('nepal.pt2Title'),
      desc: t('nepal.pt2Desc'),
    },
    {
      icon: Calendar,
      title: t('nepal.pt3Title'),
      desc: t('nepal.pt3Desc'),
    },
    {
      icon: CreditCard,
      title: t('nepal.pt4Title'),
      desc: t('nepal.pt4Desc'),
    },
    {
      icon: Wifi,
      title: t('nepal.pt5Title'),
      desc: t('nepal.pt5Desc'),
    },
  ]

  return (
    <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            {t('nepal.badge')}
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mt-2 leading-[1.15]">
            {t('nepal.headline')}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            {t('nepal.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {nepalPoints.map((pt, idx) => {
            const Icon = pt.icon
            return (
              <div
                key={idx}
                className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3 flex flex-col justify-start"
              >
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">{pt.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{pt.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
