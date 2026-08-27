"use client"

import { useLanguage } from '@/context/language-context'
import {
  Notebook,
  FileSpreadsheet,
  Calculator,
  FileText,
  DollarSign,
  CheckCircle2,
} from 'lucide-react'

export function LandingProblemSolution() {
  const { t } = useLanguage()

  const problems = [
    { number: '01', title: t('problemSolution.beforeItem1'), desc: t('problemSolution.beforeDesc1'), icon: Notebook },
    { number: '02', title: t('problemSolution.beforeItem2'), desc: t('problemSolution.beforeDesc2'), icon: FileSpreadsheet },
    { number: '03', title: t('problemSolution.beforeItem3'), desc: t('problemSolution.beforeDesc3'), icon: FileText },
    { number: '04', title: t('problemSolution.beforeItem4'), desc: t('problemSolution.beforeDesc4'), icon: DollarSign },
    { number: '05', title: t('problemSolution.beforeItem5'), desc: t('problemSolution.beforeDesc5'), icon: Calculator },
  ]

  return (
    <section className="py-10 sm:py-16 lg:py-20 bg-white text-slate-900 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mb-8 sm:mb-14 text-left">
          <h2 className="text-[1.5rem] sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {t('problemSolution.headline')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 items-stretch">
          {problems.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-colors"
              >
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-600 bg-slate-200/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md">
                      {item.number}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base lg:text-xl font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-[1.65]">
                    {item.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Strong Statement Container */}
        <div className="mt-8 sm:mt-14 p-5 sm:p-8 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white text-center border border-indigo-800 shadow-xl max-w-4xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-2 text-emerald-400 font-bold text-[11px] sm:text-xs sm:text-sm tracking-wider uppercase bg-emerald-500/10 px-2.5 sm:px-3 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {t('problemSolution.simpleSolution')}
          </div>
          <h3 className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-snug">
            {t('problemSolution.afterResult')}
          </h3>
        </div>
      </div>
    </section>
  )
}
