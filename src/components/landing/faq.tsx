"use client"

import React, { useState } from 'react'
import { useLanguage } from '@/context/language-context'
import { ChevronDown } from 'lucide-react'

export function LandingFAQ() {
  const { t } = useLanguage()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqItems = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
    { q: t('faq.q7'), a: t('faq.a7') },
  ]

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <section id="faq" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200 text-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            {t('faq.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            {t('faq.headline')}
          </h2>
        </div>

        {/* Clean Accordion List */}
        <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
          {faqItems.map((item, idx) => {
            const isOpen = openIndex === idx
            return (
              <div key={idx} className="py-4">
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  className="w-full flex items-center justify-between text-left text-base sm:text-lg font-bold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/50 rounded-md py-1.5 gap-4"
                >
                  <span className="leading-snug">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-500 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <p id={`faq-answer-${idx}`} className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed animate-fade-in pr-6">
                    {item.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
