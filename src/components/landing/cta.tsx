"use client"

import Link from 'next/link'
import { useLanguage } from '@/context/language-context'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function LandingCTA() {
  const { t } = useLanguage()

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white text-left">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
        <div className="space-y-3 max-w-2xl">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.18]">
            {t('cta.headline')}
          </h2>
          <p className="text-base sm:text-lg text-indigo-200 leading-[1.7]">
            {t('cta.description')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full lg:w-auto">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-13 px-8 bg-white hover:bg-slate-100 text-indigo-950 font-bold shadow-lg text-base sm:text-lg"
          >
            <Link href="/demo">
              Launch Interactive Demo <ArrowRight className="ml-2 h-5 w-5 text-indigo-950 shrink-0" />
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full sm:w-auto h-13 px-7 border-indigo-500/50 bg-transparent text-white hover:bg-indigo-800 hover:text-white font-semibold text-base"
          >
            <Link href="/auth/signup">{t('cta.startFree')}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
