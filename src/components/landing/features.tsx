"use client"

import React from 'react'
import { useLanguage } from '@/context/language-context'
import {
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

export function LandingFeatures() {
  const { t } = useLanguage()

  return (
    <section id="features" className="py-16 sm:py-24 bg-white text-slate-900 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20">
        {/* Section Header */}
        <div className="max-w-3xl text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            {t('features.badge')}
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mt-2">
            {t('features.headline')}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            {t('features.description')}
          </p>
        </div>

        {/* Story 1: Inventory (Image Left / Text Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-5 shadow-lg text-left text-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-3 gap-2">
              <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-400 shrink-0" /> {t('features.story1Ledger')}
              </span>
              <span className="text-xs text-amber-400 font-mono flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {t('features.story1Alerts')}
              </span>
            </div>
            <div className="space-y-2 font-mono">
              <div className="p-3 rounded bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="text-white font-bold">Ultratech Cement (50kg)</div>
                  <div className="text-xs text-slate-400">SKU: UTR-CEM-01</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-bold">120 Bags</div>
                  <div className="text-xs text-slate-500">Threshold: 10</div>
                </div>
              </div>
              <div className="p-3 rounded bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="text-white font-bold">Copper Wire 1.5sqmm</div>
                  <div className="text-xs text-slate-400">SKU: COP-WIR-15</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-bold">4 Rolls</div>
                  <div className="text-xs text-slate-500">Threshold: 5</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 text-left space-y-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {t('features.story1Title')}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {t('features.story1Desc')}
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 pt-1 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('features.story1Bullet1')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('features.story1Bullet2')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Story 2: Sales (Text Left / Image Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-t border-slate-200 pt-16">
          <div className="lg:col-span-5 text-left space-y-4 order-2 lg:order-1">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {t('features.story2Title')}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {t('features.story2Desc')}
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 pt-1 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('features.story2Bullet1')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('features.story2Bullet2')}</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-5 shadow-lg text-left text-xs order-1 lg:order-2 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-3 gap-2">
              <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-400 shrink-0" /> {t('features.story2Ledger')}
              </span>
              <span className="text-xs text-emerald-400 font-mono font-bold">Total: Rs. 1,030.00</span>
            </div>
            <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-200">
                <span>1x Ultratech Cement (50kg)</span>
                <span className="text-emerald-400 font-bold">Rs. 850.00</span>
              </div>
              <div className="flex justify-between text-slate-200">
                <span>2x PVC Elbow 1-inch</span>
                <span className="text-emerald-400 font-bold">Rs. 180.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Story 3: Customers & Dues (Image Left / Text Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-t border-slate-200 pt-16">
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-5 shadow-lg text-left text-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-3 gap-2">
              <span className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-400 shrink-0" /> {t('features.story3Ledger')}
              </span>
              <span className="text-xs text-amber-400 font-mono font-bold">{t('features.story3Dues')}</span>
            </div>
            <div className="p-3 rounded bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-200">
                <div>
                  <div className="font-bold text-white">Shrestha Hardware & Construction</div>
                  <div className="text-xs text-slate-400 font-mono">Phone: 9841000000</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-amber-400 font-bold">Rs. 8,500 Due</div>
                  <div className="text-xs text-emerald-400">Paid Rs. 4,000</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 text-left space-y-4">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {t('features.story3Title')}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {t('features.story3Desc')}
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 pt-1 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('features.story3Bullet1')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('features.story3Bullet2')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Story 4: Invoices (Text Left / Image Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-t border-slate-200 pt-16">
          <div className="lg:col-span-5 text-left space-y-4 order-2 lg:order-1">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              04
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {t('features.story4Title')}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {t('features.story4Desc')}
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 pt-1 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('features.story4Bullet1')}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{t('features.story4Bullet2')}</span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-lg text-left text-xs order-1 lg:order-2 text-slate-900 overflow-hidden">
            <div className="flex flex-wrap justify-between border-b border-slate-200 pb-3 mb-3 gap-2">
              <div>
                <div className="font-extrabold text-sm uppercase text-slate-900">Pashupati Traders</div>
                <div className="text-slate-600 text-xs">Kathmandu, Nepal • PAN: 601234567</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-indigo-700 text-sm">TAX INVOICE</div>
                <div className="text-slate-500 text-xs">INV-2026-0042</div>
              </div>
            </div>
            <div className="flex flex-wrap justify-between font-bold border-t border-b border-slate-200 py-2 gap-2 text-xs sm:text-sm">
              <span>Total Amount Paid</span>
              <span className="font-mono text-xs sm:text-sm">Rs. 1,030.00 (13% VAT Included)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
