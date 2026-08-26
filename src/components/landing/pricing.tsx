"use client"

import { useLanguage } from '@/context/language-context'
import { Button } from '@/components/ui/button'
import { Check, Crown, Zap } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon'

function getWhatsAppUrl(planLabel: string): string {
  const msg = `Hello, I am interested in Inventory Lite. I would like to subscribe to the ${planLabel} plan. Please provide me with the account setup and payment details.`
  return `https://wa.me/9779805330808?text=${encodeURIComponent(msg)}`
}

const PLANS = [
  { key: 'monthly' as const, price: '699', priceSuffix: 'NPR', period: 'perMonth' as const, billNote: 'billedMonthly' as const, badge: null },
  { key: 'sixMonth' as const, price: '4,194', priceSuffix: 'NPR', period: 'perSixMonth' as const, billNote: 'billedSixMonth' as const, badge: 'bestValue' as const },
  { key: 'yearly' as const, price: '7,689', priceSuffix: 'NPR', period: 'perYear' as const, billNote: 'billedYearly' as const, badge: 'mostSavings' as const },
] as const

const FEATURES = ['allFeaturesIncluded', 'oneStore', 'regularUpdates', 'prioritySupport'] as const

export function LandingPricing() {
  const { t } = useLanguage()

  return (
    <section id="pricing" className="py-10 sm:py-16 lg:py-20 bg-slate-50 text-slate-900 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 sm:space-y-10">
        <div className="max-w-2xl text-left space-y-2">
          <h2 className="text-[1.5rem] sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {t('pricing.headline')}
          </h2>
          <p className="text-sm sm:text-lg text-slate-600 leading-[1.65]">
            {t('pricing.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {PLANS.map((plan) => {
            const isHighlighted = plan.badge !== null
            const isAnnual = plan.key === 'yearly'
            return (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border bg-white p-5 sm:p-7 lg:p-8 transition-shadow ${
                  isAnnual
                    ? 'border-indigo-400 shadow-xl ring-2 ring-indigo-200 md:scale-[1.03]'
                    : isHighlighted
                    ? 'border-indigo-300 shadow-lg ring-1 ring-indigo-100'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-white shadow-sm ${
                        plan.badge === 'bestValue'
                          ? 'bg-indigo-600'
                          : 'bg-emerald-600'
                      }`}
                    >
                      {plan.badge === 'bestValue' ? (
                        <Crown className="h-3 w-3" />
                      ) : (
                        <Zap className="h-3 w-3" />
                      )}
                      {t(`pricing.${plan.badge}`)}
                    </span>
                  </div>
                )}

                <div className={`mb-4 sm:mb-6 ${plan.badge ? 'pt-3' : ''}`}>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 sm:px-3 py-1 rounded-md border border-indigo-100 inline-block">
                    {t(`pricing.${plan.key}`)}
                  </h3>
                </div>

                <div className="mb-4 sm:mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500">{plan.priceSuffix}</span>
                    <span className="text-[2rem] sm:text-4xl lg:text-5xl font-extrabold font-mono text-slate-900 leading-none">
                      {plan.price}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1.5">
                    {t(`pricing.${plan.period}`)}
                  </p>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    {t(`pricing.${plan.billNote}`)}
                  </p>
                  {isAnnual && (
                    <span className="inline-block mt-2 text-[11px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 sm:px-2.5 py-0.5 rounded-full">
                      {t('pricing.yearlySavings')}
                    </span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-5 sm:mb-6 flex-1">
                  {FEATURES.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                      <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </div>
                      {t(`pricing.${feat}`)}
                    </li>
                  ))}
                </ul>

                <p className="text-[11px] sm:text-xs text-slate-400 mb-4 sm:mb-5 leading-relaxed">
                  {t('pricing.oneStoreNote')}
                </p>

                <Button
                  asChild
                  size="lg"
                  className={`w-full h-11 sm:h-12 px-5 sm:px-6 font-bold text-xs sm:text-sm shadow-sm ${
                    isAnnual
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                      : isHighlighted
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  <a
                    href={getWhatsAppUrl(t(`pricing.${plan.key}`))}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" />
                    {t('pricing.startFree')}
                  </a>
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
