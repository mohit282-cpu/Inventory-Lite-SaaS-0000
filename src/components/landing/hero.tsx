"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLanguage } from '@/context/language-context'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  CheckCircle2,
  Building,
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
} from 'lucide-react'

export function LandingHero() {
  const { t } = useLanguage()
  const [imgError, setImgError] = useState(false)

  return (
    <section className="relative py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-b border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Headline, Copy & Primary Actions */}
          <div className="lg:col-span-5 text-left space-y-6">
            <div className="inline-block text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100">
              {t('hero.badge')}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              <span className="block">{t('hero.titleLine1')}</span>
              <span className="block text-indigo-600 mt-1 sm:mt-2">{t('hero.titleLine2')}</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-[1.7]">
              {t('hero.description')}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <Button
                asChild
                size="lg"
                className="h-12 sm:h-13 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md text-base sm:text-lg"
              >
                <Link href="/demo">
                  Try Demo Workspace <ArrowRight className="ml-2 h-5 w-5 shrink-0" />
                </Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 sm:h-13 px-6 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-semibold text-base"
              >
                <Link href="/auth/signup">Get Started Free</Link>
              </Button>
            </div>

            {/* 4 Small Trust Indicators */}
            <div className="pt-4 grid grid-cols-2 gap-3 text-xs sm:text-sm text-slate-800 font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('hero.trustBadge1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('hero.trustBadge2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('hero.trustBadge3')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('hero.trustBadge4')}</span>
              </div>
            </div>
          </div>

          {/* Right Column: LARGE, READABLE Product UI Showcase */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-3.5 sm:p-5 text-left overflow-hidden ring-1 ring-slate-800/80">
              
              {/* Window Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/90" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/90" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/90" />
                  <span className="text-xs text-slate-400 font-mono ml-2 hidden sm:inline">
                    inventorylite.app/dashboard
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-200 font-semibold bg-slate-950 px-3 py-1 rounded-md border border-slate-800">
                  <Building className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-none">{t('hero.storeName')}</span>
                </div>
              </div>

              {/* Real Screenshot or Fallback UI */}
              {!imgError ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <Image
                    src="/screenshots/hero-dashboard.png"
                    alt="Inventory Lite Dashboard - Real Product Software UI"
                    width={1280}
                    height={800}
                    priority
                    unoptimized
                    className="w-full h-auto object-cover object-top max-h-[500px] sm:max-h-[580px]"
                    onError={() => setImgError(true)}
                  />
                </div>
              ) : (
                /* High-fidelity Fallback UI */
                <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                        <span>{t('hero.todaysSales')}</span>
                        <ShoppingCart className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      </div>
                      <div className="text-lg font-bold font-mono text-emerald-400 mt-1">Rs. 14,250</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                        <span>{t('hero.thisMonth')}</span>
                        <TrendingUp className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      </div>
                      <div className="text-lg font-bold font-mono text-white mt-1">Rs. 185,400</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                        <span>{t('hero.products')}</span>
                        <Package className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      </div>
                      <div className="text-lg font-bold font-mono text-white mt-1">{t('hero.itemsCount')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
                        <span>{t('hero.lowStock')}</span>
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      </div>
                      <div className="text-lg font-bold font-mono text-amber-400 mt-1">{t('hero.alertsCount')}</div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" /> {t('hero.liveActivity')}
                      </span>
                      <span className="text-xs text-emerald-400 font-mono">{t('hero.realtime')}</span>
                    </div>
                    <table className="w-full text-left text-xs min-w-[300px]">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800">
                          <th className="pb-1.5">{t('hero.colSaleNo')}</th>
                          <th className="pb-1.5">{t('hero.colCustomer')}</th>
                          <th className="pb-1.5">{t('hero.colPayment')}</th>
                          <th className="pb-1.5 text-right">{t('hero.colTotal')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        <tr>
                          <td className="py-2 text-indigo-400 font-bold">#INV-1048</td>
                          <td className="py-2 text-slate-200 font-sans">Ram Bahadur Construction</td>
                          <td className="py-2 text-slate-400 font-sans">{t('hero.fonepay')}</td>
                          <td className="py-2 text-right text-emerald-400 font-bold">Rs. 4,800</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-indigo-400 font-bold">#INV-1047</td>
                          <td className="py-2 text-slate-200 font-sans">{t('hero.walkinCustomer')}</td>
                          <td className="py-2 text-slate-400 font-sans">{t('hero.cash')}</td>
                          <td className="py-2 text-right text-emerald-400 font-bold">Rs. 1,250</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
