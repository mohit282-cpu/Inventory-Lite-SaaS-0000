"use client"

import React from 'react'
import { LandingNavbar } from '@/components/landing/navbar'
import { LandingHero } from '@/components/landing/hero'
import { LandingTrustStrip } from '@/components/landing/trust-strip'
import { LandingProblemSolution } from '@/components/landing/problem-solution'
import { LandingFeatures } from '@/components/landing/features'
import { LandingHowItWorks } from '@/components/landing/how-it-works'
import { LandingProductPreview } from '@/components/landing/product-preview'
import { LandingNepalSection } from '@/components/landing/nepal-section'
import { LandingPricing } from '@/components/landing/pricing'
import { LandingFAQ } from '@/components/landing/faq'
import { LandingCTA } from '@/components/landing/cta'
import { LandingFooter } from '@/components/landing/footer'

export function LandingPageView() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600/30 selection:text-white">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingTrustStrip />
        <LandingProblemSolution />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingProductPreview />
        <LandingNepalSection />
        <LandingPricing />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
