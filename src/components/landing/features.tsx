"use client"

import React from 'react'
import { useLanguage } from '@/context/language-context'
import { CheckCircle2 } from 'lucide-react'

export function LandingFeatures() {
  const { t, language } = useLanguage()

  const defaultEnglishFeatures = [
    "Product Management",
    "Stock Tracking",
    "POS Billing",
    "Sales Records",
    "Customer Management",
    "Udhaar Tracking",
    "Expense Tracking",
    "Invoices",
    "Stock Movement",
    "Business Reports",
    "BS / AD Calendar",
    "NPR Currency",
    "PAN / VAT Settings",
    "Payment Tracking",
    "Data Export",
    "Team & RBAC Permissions",
  ]

  const nepaliFeatures = [
    "उत्पादन व्यवस्थापन",
    "स्टक व्यवस्थापन",
    "POS बिलिङ",
    "बिक्री रेकर्ड",
    "ग्राहक व्यवस्थापन",
    "उधारो व्यवस्थापन",
    "खर्च व्यवस्थापन",
    "इनभ्वाइस",
    "स्टक मुभमेन्ट",
    "व्यापार रिपोर्ट",
    "वि.सं. / ई.सं. क्यालेन्डर",
    "NPR मुद्रा",
    "PAN / VAT सेटिङ",
    "भुक्तानी रेकर्ड",
    "डेटा निर्यात",
    "टोली तथा पहुँच अधिकार",
  ]

  const featureList = language === 'ne' ? nepaliFeatures : defaultEnglishFeatures

  return (
    <section id="features" className="py-12 sm:py-16 lg:py-20 bg-white text-slate-900 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="max-w-3xl text-left space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100">
            {t('features.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {t('features.headline')}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            {t('features.description')}
          </p>
        </div>

        {/* 16 Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {featureList.map((feat, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 shadow-xs hover:border-indigo-300 transition-colors"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="text-base font-bold text-slate-900 leading-snug">
                {feat}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
