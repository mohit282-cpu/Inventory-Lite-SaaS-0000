"use client"

import React from 'react'
import { LandingNavbar } from './navbar'
import { LandingHero } from './hero'
import { LandingProblemSolution } from './problem-solution'
import { LandingHowItWorks } from './how-it-works'
import { LandingProductPreview } from './product-preview'
import { LandingFeatures } from './features'
import { LandingNepalSection } from './nepal-section'
import { LandingPricing } from './pricing'
import { LandingFAQ } from './faq'
import { LandingCTA } from './cta'
import { LandingFooter } from './footer'

export function LandingPageView() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* 1. Header Navigation */}
      <LandingNavbar />

      <main>
        {/* 2. Editorial Product Hero */}
        <LandingHero />

        {/* 3. Problem & Solution Contrast */}
        <LandingProblemSolution />

        {/* 4. Core Workflow Step Journey */}
        <LandingHowItWorks />

        {/* 5. Actual Product Canvas Showcase */}
        <LandingProductPreview />

        {/* 6. Feature Story Deep-Dives */}
        <LandingFeatures />

        {/* 7. Nepal Context & Capabilities */}
        <LandingNepalSection />

        {/* 8. Free Model Access Section (NPR 0) */}
        <LandingPricing />

        {/* 9. Clean Accordion FAQ */}
        <LandingFAQ />

        {/* 10. Confident Final Call-to-Action */}
        <LandingCTA />
      </main>

      {/* 11. Restrained Footer */}
      <LandingFooter />
    </div>
  )
}
