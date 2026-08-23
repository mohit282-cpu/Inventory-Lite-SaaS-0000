"use client"

import React from 'react'
import { useLanguage } from '@/context/language-context'
import {
  Notebook,
  FileSpreadsheet,
  Calculator,
  MessageSquare,
  FileText,
  Check,
  X,
  Package,
  Boxes,
  ShoppingCart,
  Users,
} from 'lucide-react'

export function LandingProblemSolution() {
  const { t } = useLanguage()

  const beforeItems = [
    { icon: Notebook, text: t('problemSolution.beforeItem1') },
    { icon: FileSpreadsheet, text: t('problemSolution.beforeItem2') },
    { icon: Calculator, text: t('problemSolution.beforeItem3') },
    { icon: MessageSquare, text: t('problemSolution.beforeItem4') },
    { icon: FileText, text: t('problemSolution.beforeItem5') },
  ]

  const afterItems = [
    { icon: Package, text: t('problemSolution.afterItem1') },
    { icon: Boxes, text: t('problemSolution.afterItem2') },
    { icon: ShoppingCart, text: t('problemSolution.afterItem3') },
    { icon: Users, text: t('problemSolution.afterItem4') },
    { icon: FileText, text: t('problemSolution.afterItem5') },
  ]

  return (
    <section className="py-16 sm:py-24 bg-white text-slate-900 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
            {t('problemSolution.badge')}
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mt-2 leading-[1.15]">
            {t('problemSolution.headline')}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            {t('problemSolution.description')}
          </p>
        </div>

        {/* Editorial Before / After Contrast Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Before Column */}
          <div className="p-6 sm:p-8 rounded-xl bg-slate-50 border border-slate-200 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm sm:text-base">
                <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <X className="h-4 w-4" />
                </div>
                <span>{t('problemSolution.beforeTitle')}</span>
              </div>

              <div className="space-y-3">
                {beforeItems.map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm font-medium text-slate-700">
                      <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{item.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 pt-3 border-t border-slate-200">
              {t('problemSolution.beforeResult')}
            </p>
          </div>

          {/* After Column */}
          <div className="p-6 sm:p-8 rounded-xl bg-indigo-900 text-white border border-indigo-800 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm sm:text-base">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <Check className="h-4 w-4" />
                </div>
                <span>{t('problemSolution.afterTitle')}</span>
              </div>

              <div className="space-y-3">
                {afterItems.map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-indigo-950/80 border border-indigo-800/80 text-xs sm:text-sm font-medium text-indigo-100">
                      <Icon className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>{item.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-indigo-200 pt-3 border-t border-indigo-800/80">
              {t('problemSolution.afterResult')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
