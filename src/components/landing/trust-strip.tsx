"use client"

import { useLanguage } from '@/context/language-context'
import { Zap, Smartphone, CheckCircle, Gift } from 'lucide-react'

export function LandingTrustStrip() {
  const { t } = useLanguage()

  const trustPoints = [
    {
      icon: Zap,
      title: t('trust.simpleFastTitle'),
      desc: t('trust.simpleFastDesc'),
    },
    {
      icon: CheckCircle,
      title: t('trust.nepalBizTitle'),
      desc: t('trust.nepalBizDesc'),
    },
    {
      icon: Smartphone,
      title: t('trust.desktopMobileTitle'),
      desc: t('trust.desktopMobileDesc'),
    },
    {
      icon: Gift,
      title: t('trust.startFreeTitle'),
      desc: t('trust.startFreeDesc'),
    },
  ]

  return (
    <section className="py-8 bg-slate-900/40 border-b border-slate-800/60 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPoints.map((pt, idx) => {
            const Icon = pt.icon
            return (
              <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {pt.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
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
