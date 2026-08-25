import { LandingNavbar } from './navbar'
import { LandingHero } from './hero'
import { LandingProblemSolution } from './problem-solution'
import { LandingHowItWorks } from './how-it-works'
import { LandingProductPreview } from './product-preview'
import { LandingNepalSection } from './nepal-section'
import { LandingBusinessReports } from './business-reports'
import { LandingTrustSecurity } from './trust-security'
import { LandingFeatures } from './features'
import { LandingPricing } from './pricing'
import { LandingFAQ } from './faq'
import { LandingCTA } from './cta'
import { LandingFooter } from './footer'

export function LandingPageView() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header Navigation */}
      <LandingNavbar />

      <main>
        {/* Editorial Product Hero */}
        <LandingHero />

        {/* Problem Section */}
        <LandingProblemSolution />

        {/* Core Workflow Step Journey */}
        <LandingHowItWorks />

        {/* Actual Product Canvas Showcase */}
        <LandingProductPreview />

        {/* Nepal Context & Capabilities */}
        <LandingNepalSection />

        {/* Business Reports Showcase */}
        <LandingBusinessReports />

        {/* Trust & Security Section */}
        <LandingTrustSecurity />

        {/* 16 Feature Grid Section */}
        <LandingFeatures />

        {/* Free Model Access Section (NPR 0) */}
        <LandingPricing />

        {/* Clean Accordion FAQ */}
        <LandingFAQ />

        {/* Confident Final Call-to-Action */}
        <LandingCTA />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  )
}
