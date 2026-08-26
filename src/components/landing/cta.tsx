"use client"

import Link from 'next/link'
import { useLanguage } from '@/context/language-context'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon'

const WHATSAPP_URL = "https://wa.me/9779805330808?text=Hello%2C%20I%27m%20interested%20in%20Inventory%20Lite%20for%20my%20business.%20I%20would%20like%20to%20know%20more%20about%20the%20software%20and%20how%20I%20can%20get%20an%20account."

export function LandingCTA() {
  const { t } = useLanguage()

  return (
    <section className="py-10 sm:py-16 lg:py-20 bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white text-left">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-7 sm:gap-8">
        <div className="space-y-2.5 sm:space-y-3 max-w-2xl">
          <h2 className="text-[1.5rem] sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.18]">
            {t('cta.headline')}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-indigo-200 leading-[1.65]">
            {t('cta.description')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0 w-full lg:w-auto">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-12 sm:h-13 px-7 sm:px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg text-sm sm:text-base lg:text-lg"
          >
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="h-5 w-5 mr-2 shrink-0" />
              {t('cta.startFree')}
            </a>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto h-12 sm:h-13 px-6 sm:px-7 border-white/30 bg-transparent text-white hover:bg-white/10 font-semibold text-sm sm:text-base"
          >
            <Link href="/demo">
              {t('cta.seeHow')} <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
