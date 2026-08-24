"use client"

import React from 'react'
import { useLanguage } from '@/context/language-context'
import { Lock, FileStack, Download, MapPin } from 'lucide-react'

export function LandingTrustSecurity() {
  const { t } = useLanguage()

  const trustPoints = [
    {
      icon: Lock,
      title: t('trust.protectedTitle'),
      desc: t('trust.protectedDesc'),
    },
    {
      icon: FileStack,
      title: t('trust.organizedTitle'),
      desc: t('trust.organizedDesc'),
    },
    {
      icon: Download,
      title: t('trust.exportTitle'),
      desc: t('trust.exportDesc'),
    },
    {
      icon: MapPin,
      title: t('trust.builtTitle'),
      desc: t('trust.builtDesc'),
    },
  ]

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-slate-900 text-slate-100 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-3xl text-center mx-auto space-y-2">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.2]">
            {t('trust.headline')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPoints.map((pt, idx) => {
            const Icon = pt.icon
            return (
              <div
                key={idx}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                  {pt.title}
                </h3>
                <p className="text-sm text-slate-300 leading-[1.6]">
                  {pt.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
