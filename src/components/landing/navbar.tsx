"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/context/language-context'
import { Menu, X, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/ui/app-logo'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon'

const WHATSAPP_NUMBER = "9779805330808"
const WHATSAPP_MSG_EN = "Hello, I want to know more about Inventory Lite and get an account for my business."
const WHATSAPP_MSG_NE = "नमस्कार, मलाई Inventory Lite बारे जानकारी चाहिएको छ र मेरो व्यवसायका लागि account बनाउन चाहन्छु।"

function getWhatsAppUrl(lang: string) {
  const msg = lang === 'ne' ? WHATSAPP_MSG_NE : WHATSAPP_MSG_EN
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

export function LandingNavbar() {
  const { user, activeBusiness, memberships } = useAuth()
  const { t, language } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const whatsappUrl = getWhatsAppUrl(language)

  const hasPortalAccess = !!user

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Inventory Lite Home">
          <AppLogo size={36} />
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-8 text-sm font-medium text-slate-600" aria-label="Main navigation">
          <a href="#product" className="hover:text-slate-900 transition-colors">
            {t('nav.product')}
          </a>
          <a href="#workflow" className="hover:text-slate-900 transition-colors">
            {t('nav.workflow')}
          </a>
          <a href="#features" className="hover:text-slate-900 transition-colors">
            {t('nav.features')}
          </a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">
            {t('nav.pricing')}
          </a>
          <a href="#faq" className="hover:text-slate-900 transition-colors">
            {t('nav.faq')}
          </a>
        </nav>

        {/* Desktop Controls */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />

          {hasPortalAccess ? (
            <Button
              asChild
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm text-xs sm:text-sm"
            >
              <Link href={activeBusiness || memberships.length > 0 ? "/app/dashboard" : "/onboarding"}>
                <LayoutDashboard className="mr-2 h-4 w-4 shrink-0" /> {t('nav.goToDashboard')}
              </Link>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                asChild
                className="border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs sm:text-sm"
              >
                <Link href="/demo">Try Demo</Link>
              </Button>
              <Button
                variant="ghost"
                asChild
                className="text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium text-xs sm:text-sm"
              >
                <Link href="/auth/login">{t('nav.login')}</Link>
              </Button>
              <Button
                asChild
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm text-xs sm:text-sm"
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-4 w-4 mr-1.5 shrink-0" />
                  {t('nav.startFree')}
                </a>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Controls: WhatsApp Icon + Language + Hamburger */}
        <div className="flex md:hidden items-center gap-1.5">
          {!hasPortalAccess && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              aria-label="Contact on WhatsApp"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
          )}
          <LanguageSwitcher align="right" />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={t('nav.toggleMenu')}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 animate-fade-in shadow-lg">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-700" aria-label="Mobile navigation">
            <a
              href="#product"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-indigo-600 transition-colors"
            >
              {t('nav.product')}
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-indigo-600 transition-colors"
            >
              {t('nav.workflow')}
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-indigo-600 transition-colors"
            >
              {t('nav.features')}
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-indigo-600 transition-colors"
            >
              {t('nav.pricing')}
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-indigo-600 transition-colors"
            >
              {t('nav.faq')}
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2.5">
            {hasPortalAccess ? (
              <Button
                asChild
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold min-h-[44px]"
              >
                <Link href={activeBusiness || memberships.length > 0 ? "/app/dashboard" : "/onboarding"}>
                  <LayoutDashboard className="mr-2 h-4 w-4 shrink-0" /> {t('nav.goToDashboard')}
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  asChild
                  className="w-full border-slate-300 text-slate-800 hover:bg-slate-50 min-h-[44px]"
                >
                  <Link href="/auth/login">{t('nav.login')}</Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[44px]"
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <WhatsAppIcon className="h-4 w-4 mr-1.5 shrink-0" />
                    {t('nav.startFree')}
                  </a>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
