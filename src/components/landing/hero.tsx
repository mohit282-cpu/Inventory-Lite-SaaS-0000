"use client"

import React from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/language-context'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Building,
} from 'lucide-react'

export function LandingHero() {
  const { t } = useLanguage()

  return (
    <section className="relative py-12 md:py-20 lg:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Human Copy & Primary Actions */}
          <div className="lg:col-span-5 text-left space-y-6">
            <div className="inline-block text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
              {t('hero.badge')}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.2] max-w-2xl">
              <span className="block">{t('hero.titleLine1')}</span>
              <span className="block text-indigo-600 mt-1">{t('hero.titleLine2')}</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              {t('hero.description')}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 px-7 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm text-base"
              >
                <Link href="/auth/signup">
                  {t('hero.startFree')} <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-6 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-semibold text-base"
              >
                <a href="#product">{t('hero.seeProduct')}</a>
              </Button>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('hero.nprFreeModel')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('hero.noCardNeeded')}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Product UI Preview */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-4 sm:p-5 text-left overflow-hidden">
              {/* Window Bar */}
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-4 px-1 gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs text-slate-400 font-mono ml-2 hidden sm:inline">
                    inventorylite.app/app/dashboard
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                  <Building className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-none">{t('hero.storeName')}</span>
                </div>
              </div>

              {/* Real Product UI Mockup */}
              <div className="space-y-4">
                {/* 4 Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                      <span className="truncate">{t('hero.todaysSales')}</span>
                      <ShoppingCart className="h-3.5 w-3.5 text-emerald-400 shrink-0 ml-1" />
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-1">
                      Rs. 14,250
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                      <span className="truncate">{t('hero.thisMonth')}</span>
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-400 shrink-0 ml-1" />
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-white mt-1">
                      Rs. 185,400
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                      <span className="truncate">{t('hero.products')}</span>
                      <Package className="h-3.5 w-3.5 text-blue-400 shrink-0 ml-1" />
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-white mt-1">
                      {t('hero.itemsCount')}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                      <span className="truncate">{t('hero.lowStock')}</span>
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 ml-1" />
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-amber-400 mt-1">
                      {t('hero.alertsCount')}
                    </div>
                  </div>
                </div>

                {/* Recent Activity Table */}
                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto scrollbar-thin">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2 min-w-[320px]">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-indigo-400 shrink-0" /> {t('hero.liveActivity')}
                    </span>
                    <span className="text-xs text-emerald-400 font-mono">{t('hero.realtime')}</span>
                  </div>
                  <table className="w-full text-left text-xs min-w-[320px]">
                    <thead>
                      <tr className="text-xs text-slate-400 font-semibold uppercase border-b border-slate-800/80">
                        <th className="pb-1.5">{t('hero.colSaleNo')}</th>
                        <th className="pb-1.5">{t('hero.colCustomer')}</th>
                        <th className="pb-1.5">{t('hero.colPayment')}</th>
                        <th className="pb-1.5 text-right">{t('hero.colTotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      <tr>
                        <td className="py-2 font-mono font-medium text-indigo-400">#INV-1048</td>
                        <td className="py-2 text-slate-200">Shrestha Hardware</td>
                        <td className="py-2 uppercase text-xs text-slate-400">{t('hero.cash')}</td>
                        <td className="py-2 text-right font-mono font-bold text-emerald-400">Rs. 4,800</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-mono font-medium text-indigo-400">#INV-1047</td>
                        <td className="py-2 text-slate-200">{t('hero.walkinCustomer')}</td>
                        <td className="py-2 uppercase text-xs text-slate-400">{t('hero.fonepay')}</td>
                        <td className="py-2 text-right font-mono font-bold text-emerald-400">Rs. 1,250</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
