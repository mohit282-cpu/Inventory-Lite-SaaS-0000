"use client"

import Link from 'next/link'
import { useLanguage } from '@/context/language-context'
import { AppLogo } from '@/components/ui/app-logo'
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon'

const WHATSAPP_NUMBER = "9779805330808"
const WHATSAPP_MSG_EN = "Hello, I want to know more about Inventory Lite and get an account for my business."
const WHATSAPP_MSG_NE = "नमस्कार, मलाई Inventory Lite बारे जानकारी चाहिएको छ र मेरो व्यवसायका लागि account बनाउन चाहन्छु।"

function getWhatsAppUrl(lang: string) {
  const msg = lang === 'ne' ? WHATSAPP_MSG_NE : WHATSAPP_MSG_EN
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

export function LandingFooter() {
  const { t, language } = useLanguage()
  const whatsappUrl = getWhatsAppUrl(language)

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-sm py-10 sm:py-14" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Top Section: Brand + Links */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 sm:pb-10 border-b border-slate-800">
          {/* Brand */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="flex items-center gap-2" aria-label="Inventory Lite Home">
              <AppLogo size={36} textColor="text-white" />
            </Link>
            <p className="text-slate-300 max-w-sm text-sm leading-relaxed">
              {t('footer.subtitle')}
            </p>
            {/* Desktop WhatsApp CTA */}
            <div className="hidden md:block">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-lg shadow-md transition-colors text-sm min-h-[44px]"
              >
                <WhatsAppIcon className="h-4 w-4 shrink-0" />
                {t('nav.startFree')}
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-7 grid grid-cols-2 gap-6 sm:gap-8">
            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs sm:text-sm mb-3 sm:mb-4">
                {t('footer.productHeading')}
              </h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.features')}</a></li>
                <li><a href="#pricing" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.pricing')}</a></li>
                <li><Link href="/demo" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.interactiveDemo')}</Link></li>
                <li><Link href="/docs" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.userGuide')}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs sm:text-sm mb-3 sm:mb-4">
                {t('footer.supportHeading')}
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5">
                    <WhatsAppIcon className="h-3.5 w-3.5 shrink-0" />
                    {t('footer.whatsapp')}
                  </a>
                </li>
                <li><Link href="/contact" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.contact')}</Link></li>
                <li><Link href="/privacy" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.privacy')}</Link></li>
                <li><Link href="/terms" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.terms')}</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-slate-400 gap-3 sm:gap-4">
          <div>
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </div>
    </footer>
  )
}
