"use client"

import React from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/language-context'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function LandingCTA() {
  const { t } = useLanguage()

  return (
    <section className="py-16 sm:py-24 bg-indigo-900 text-white text-left">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.2]">
            {t('cta.headline')}
          </h2>
          <p className="text-base sm:text-lg text-indigo-200">
            {t('cta.description')}
          </p>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-12 px-8 bg-white hover:bg-slate-100 text-indigo-950 font-bold shadow-md text-base"
          >
            <Link href="/auth/signup">
              {t('cta.startFree')} <ArrowRight className="ml-2 h-5 w-5 text-indigo-900 shrink-0" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
