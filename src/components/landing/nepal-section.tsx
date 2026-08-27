"use client"

import { useLanguage } from '@/context/language-context'
import {
  Banknote,
  Calendar,
  Users,
  CreditCard,
  FileCheck,
  LineChart,
  AlertCircle,
} from 'lucide-react'

export function LandingNepalSection() {
  const { t } = useLanguage()

  const nepalPoints = [
    { icon: Banknote, title: t('nepal.pt1Title'), desc: t('nepal.pt1Desc') },
    { icon: Calendar, title: t('nepal.pt2Title'), desc: t('nepal.pt2Desc') },
    { icon: Users, title: t('nepal.pt3Title'), desc: t('nepal.pt3Desc') },
    { icon: FileCheck, title: t('nepal.pt4Title'), desc: t('nepal.pt4Desc') },
    { icon: CreditCard, title: t('nepal.pt5Title'), desc: t('nepal.pt5Desc') },
    { icon: LineChart, title: t('nepal.pt6Title'), desc: t('nepal.pt6Desc') },
  ]

  return (
    <section className="py-10 sm:py-16 lg:py-20 bg-slate-50 border-b border-slate-200 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 sm:space-y-10">
        <div className="max-w-4xl text-left space-y-2 sm:space-y-3">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md border border-indigo-200">
            {t('nepal.badge')}
          </span>
          <h2 className="text-[1.5rem] sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {t('nepal.headline')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {nepalPoints.map((pt, idx) => {
            const Icon = pt.icon
            return (
              <div
                key={idx}
                className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2.5 sm:space-y-3 flex flex-col justify-start hover:border-indigo-300 transition-colors"
              >
                <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-11 lg:w-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 leading-snug">
                  {pt.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-[1.7]">
                  {pt.desc}
                </p>
              </div>
            )
          })}
        </div>

        {/* Responsible Disclaimer Box */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm text-slate-600 flex items-start gap-2.5 sm:gap-3 max-w-5xl mx-auto">
          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 shrink-0 mt-0.5" />
          <p className="leading-[1.6]">
            {t('nepal.disclaimer')}
          </p>
        </div>
      </div>
    </section>
  )
}
