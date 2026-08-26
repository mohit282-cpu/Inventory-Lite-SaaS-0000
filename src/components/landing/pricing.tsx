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
]

const FEATURES = ['allFeaturesIncluded', 'oneStore', 'regularUpdates', 'prioritySupport'] as const

export function LandingPricing() {
  const { t } = useLanguage()

  return (
    <section id="pricing" className="py-12 sm:py-16 lg:py-20 bg-slate-50 text-slate-900 border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        <div className="max-w-2xl text-left space-y-2">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {t('pricing.headline')}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-[1.7]">
            {t('pricing.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {PLANS.map((plan) => {
            const isHighlighted = plan.badge !== null
            return (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 sm:p-8 transition-shadow ${
                  isHighlighted
                    ? 'border-indigo-300 shadow-lg ring-1 ring-indigo-100'
                    : 'border-slate-200 shadow-sm'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm ${
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

                <div className={`mb-6 ${plan.badge ? 'pt-3' : ''}`}>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100 inline-block">
                    {t(`pricing.${plan.key}`)}
                  </h3>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs font-bold text-slate-500">{plan.priceSuffix}</span>
                    <span className="text-4xl sm:text-5xl font-extrabold font-mono text-slate-900 leading-none">
                      {plan.price}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 font-semibold mt-1.5">
                    {t(`pricing.${plan.period}`)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t(`pricing.${plan.billNote}`)}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {FEATURES.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-700 font-medium">
                      <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3" />
                      </div>
                      {t(`pricing.${feat}`)}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  size="lg"
                  className={`w-full h-12 px-6 font-bold text-sm shadow-sm ${
                    isHighlighted
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  <a
                    href={getWhatsAppUrl(t(`pricing.${plan.key}`))}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon className="h-5 w-5 mr-2 shrink-0" />
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
