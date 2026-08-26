import { LandingNavbar } from './navbar'
import { LandingHero } from './hero'
import { LandingProblemSolution } from './problem-solution'
import { LandingHowItWorks } from './how-it-works'
import { LandingAccountFlow } from './account-flow'
import { LandingProductPreview } from './product-preview'
import { LandingNepalSection } from './nepal-section'
import { LandingBusinessReports } from './business-reports'
import { LandingFeatures } from './features'
import { LandingPricing } from './pricing'
import { LandingFAQ } from './faq'
import { LandingCTA } from './cta'
import { LandingFooter } from './footer'
import { StickyWhatsAppCTA } from './sticky-whatsapp'

export function LandingPageView() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <LandingNavbar />

      <main className="pb-16 md:pb-0">
        <LandingHero />
        <LandingProblemSolution />
        <LandingHowItWorks />
        <LandingAccountFlow />
        <LandingProductPreview />
        <LandingNepalSection />
        <LandingBusinessReports />
        <LandingFeatures />
        <LandingPricing />
        <LandingFAQ />
        <LandingCTA />
      </main>

      <LandingFooter />

      <StickyWhatsAppCTA />
    </div>
  )
}
