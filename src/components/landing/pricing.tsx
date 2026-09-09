"use client"

import { useLanguage } from '@/context/language-context'
import { Button } from '@/components/ui/button'
import { Check, Sparkles } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon'
import { PRICING_PLANS } from '@/config/pricing'

const WHATSAPP_NUMBER = "9779805330808"

function getWhatsAppUrl(planName: string, lang: string): string {
  let msg: string
  if (lang === 'ne') {
    msg = `नमस्कार, मलाई Inventory Lite को ${planName} योजनामा रुचि छ। कृपया थप जानकारी दिनुहोस्।`
  } else {
    msg = `Hello, I am interested in the Inventory Lite ${planName} plan. Please provide more information.`
  }
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

const FEATURES = ['allFeaturesIncluded', 'oneStore', 'regularUpdates', 'prioritySupport'] as const

export function LandingPricing() {
  const { t, language } = useLanguage()
  const isNe = language === 'ne'

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 items-stretch">
          {PRICING_PLANS.map((plan) => {
            const name = isNe ? plan.nameNe : plan.nameEn
            const period = isNe ? plan.periodNe : plan.periodEn
            const billingNote = isNe ? plan.billingNoteNe : plan.billingNoteEn
            const effectiveMonthly = isNe ? plan.effectiveMonthlyNe : plan.effectiveMonthlyEn
            const savingsText = plan.savingsFormatted ? `${t('pricing.saveNpr')} NPR ${plan.savingsFormatted}` : null

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-5 sm:p-7 lg:p-8 transition-all duration-200 ${
                  plan.isFeatured
                    ? 'border-indigo-500 shadow-xl ring-2 ring-indigo-200 md:scale-[1.03] bg-gradient-to-b from-indigo-50/60 via-white to-white'
                    : 'border-slate-200 shadow-sm bg-white hover:border-slate-300'
                }`}
              >
                {/* Featured "Best Value" Badge */}
                {plan.badgeKey === 'bestValue' && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md bg-indigo-600 ring-2 ring-white">
                      <Sparkles className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                      {t('pricing.bestValue')}
                    </span>
                  </div>
                )}

                {/* Header Title */}
                <div className={`mb-4 sm:mb-5 ${plan.badgeKey ? 'pt-2' : ''}`}>
                  <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-md inline-block ${
                    plan.isFeatured
                      ? 'text-indigo-800 bg-indigo-100 border border-indigo-200'
                      : 'text-slate-700 bg-slate-100 border border-slate-200'
                  }`}>
                    {name}
                  </h3>
                </div>

                {/* Pricing Display Area */}
                <div className="mb-5 sm:mb-6 border-b border-slate-100 pb-5">
                  {/* Regular Price Cross-out */}
                  {plan.regularPriceFormatted && (
                    <p className="text-xs sm:text-sm text-slate-400 font-mono mb-1">
                      <span className="line-through">NPR {plan.regularPriceFormatted}</span>
                    </p>
                  )}

                  {/* Primary Price */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-500">NPR</span>
                    <span className="text-[2.25rem] sm:text-4xl lg:text-5xl font-black font-mono text-slate-900 leading-none tracking-tight">
                      {plan.priceFormatted}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-500">
                      {period}
                    </span>
                  </div>

                  {/* Billing Period Note */}
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {billingNote}
                  </p>

                  {/* Effective Monthly Price */}
                  {effectiveMonthly && (
                    <p className="text-xs font-bold text-indigo-700 mt-2">
                      {effectiveMonthly}
                    </p>
                  )}

                  {/* Savings Tag */}
                  {savingsText && (
                    <div className="mt-2.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shadow-2xs">
                        {savingsText}
                      </span>
                    </div>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {FEATURES.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                      <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        plan.isFeatured ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </div>
                      {t(`pricing.${feat}`)}
                    </li>
                  ))}
                </ul>

                <p className="text-[11px] sm:text-xs text-slate-400 mb-5 leading-relaxed">
                  {t('pricing.oneStoreNote')}
                </p>

                {/* WhatsApp Contact CTA */}
                <Button
                  asChild
                  size="lg"
                  className={`w-full h-11 sm:h-12 px-5 sm:px-6 font-bold text-xs sm:text-sm shadow-sm transition-all ${
                    plan.isFeatured
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                      : 'bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 hover:border-indigo-300'
                  }`}
                >
                  <a
                    href={getWhatsAppUrl(name, language)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                    {t('pricing.getMonthlyPlan')}
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
