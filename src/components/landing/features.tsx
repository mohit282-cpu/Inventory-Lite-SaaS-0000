"use client"

import { useLanguage } from '@/context/language-context'
import { CheckCircle2 } from 'lucide-react'
import { en } from '@/locales/en'
import { ne } from '@/locales/ne'

export function LandingFeatures() {
  const { language } = useLanguage()

  const featureList = language === 'ne' ? ne.features.list : en.features.list

  return (
    <section id="features" className="py-10 sm:py-16 lg:py-20 bg-white text-slate-900 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Section Header */}
        <div className="max-w-3xl text-left space-y-2">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md border border-indigo-100">
            {language === 'ne' ? ne.features.badge : en.features.badge}
          </span>
          <h2 className="text-[1.5rem] sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {language === 'ne' ? ne.features.headline : en.features.headline}
          </h2>
          <p className="text-sm sm:text-lg text-slate-600 leading-relaxed">
            {language === 'ne' ? ne.features.description : en.features.description}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
          {featureList.map((feat: string, idx: number) => (
            <div
              key={idx}
              className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 sm:gap-3 shadow-xs hover:border-indigo-300 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
              <span className="text-xs sm:text-sm lg:text-base font-bold text-slate-900 leading-snug">
                {feat}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
