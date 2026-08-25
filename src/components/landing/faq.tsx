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
    { q: t('faq.q8'), a: t('faq.a8') },
    { q: t('faq.q9'), a: t('faq.a9') },
    { q: t('faq.q10'), a: t('faq.a10') },
    { q: t('faq.q11'), a: t('faq.a11') },
    { q: t('faq.q12'), a: t('faq.a12') },
  ]

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <section id="faq" className="py-12 sm:py-16 lg:py-20 bg-white border-b border-slate-200 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-left space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
            Answers & Clarifications
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {t('faq.headline')}
          </h2>
        </div>

        {/* Clean Accordion List */}
        <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
          {faqItems.map((item, idx) => {
            const isOpen = openIndex === idx
            return (
              <div key={idx} className="py-4 sm:py-5">
                <button
                  id={`faq-trigger-${idx}`}
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  className="w-full flex items-center justify-between text-left text-lg sm:text-xl font-bold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg py-1 gap-4"
                >
                  <span className="leading-snug">{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-500 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${idx}`}
                    className="mt-3 text-base text-slate-700 leading-[1.7] pr-4 sm:pr-6"
                  >
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
