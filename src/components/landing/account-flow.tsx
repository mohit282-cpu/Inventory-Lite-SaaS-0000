"use client"

import { useLanguage } from '@/context/language-context'
import {
  MessageSquare,
  Settings,
  KeyRound,
  LogIn,
  Store,
} from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon'

export function LandingAccountFlow() {
  const { t } = useLanguage()

  const steps = [
    { icon: MessageSquare, title: t('accountFlow.step1Title'), desc: t('accountFlow.step1Desc') },
    { icon: Settings, title: t('accountFlow.step2Title'), desc: t('accountFlow.step2Desc') },
    { icon: KeyRound, title: t('accountFlow.step3Title'), desc: t('accountFlow.step3Desc') },
    { icon: LogIn, title: t('accountFlow.step4Title'), desc: t('accountFlow.step4Desc') },
    { icon: Store, title: t('accountFlow.step5Title'), desc: t('accountFlow.step5Desc') },
  ]

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white border-b border-slate-200 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-3xl text-left space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100">
            {t('accountFlow.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
            {t('accountFlow.headline')}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-[1.7]">
            {t('accountFlow.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div key={idx} className="relative flex flex-col">
                <div className="h-full p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-sm flex flex-col space-y-3 hover:border-emerald-400 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded">
                      {idx + 1}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-[1.6]">
                    {step.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-center pt-2">
          <a
            href="https://wa.me/9779805330808?text=Hello%2C%20I%27m%20interested%20in%20Inventory%20Lite%20for%20my%20business.%20I%20would%20like%20to%20know%20more%20about%20the%20software%20and%20how%20I%20can%20get%20an%20account."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-lg shadow-md transition-colors text-sm sm:text-base"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {t('hero.startFree')}
          </a>
        </div>
      </div>
    </section>
  )
}
