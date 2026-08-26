"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/language-context'
import { AppLogo } from '@/components/ui/app-logo'
import { LegalModal } from './legal-modal'
import { NewsletterForm } from './newsletter-form'
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon'

const WHATSAPP_URL = "https://wa.me/9779805330808?text=Hello%2C%20I%27m%20interested%20in%20Inventory%20Lite%20for%20my%20business.%20I%20would%20like%20to%20know%20more%20about%20the%20software%20and%20how%20I%20can%20get%20an%20account."

export function LandingFooter() {
  const { t } = useLanguage()
  const [modalType, setModalType] = useState<'privacy' | 'terms' | 'contact' | null>(null)

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-sm py-10 sm:py-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 sm:pb-10 border-b border-slate-800">
          {/* Brand Col & Newsletter */}
          <div className="md:col-span-5 space-y-5 sm:space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <AppLogo size={36} textColor="text-white" />
            </Link>
            <p className="text-slate-300 max-w-sm text-sm leading-relaxed">
              {t('footer.subtitle')}
            </p>
            <NewsletterForm />
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs sm:text-sm mb-3 sm:mb-4">
                {t('footer.productHeading')}
              </h4>
              <ul className="space-y-2 sm:space-y-2.5">
                <li><a href="#product" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.overview')}</a></li>
                <li><a href="#workflow" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.workflow')}</a></li>
                <li><a href="#product" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.stock')}</a></li>
                <li><a href="#product" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.pos')}</a></li>
                <li><a href="#product" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.invoices')}</a></li>
                <li><a href="#product" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.udhaar')}</a></li>
                <li><a href="#product" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.expenses')}</a></li>
                <li><a href="#product" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.reports')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs sm:text-sm mb-3 sm:mb-4">
                {t('footer.businessHeading')}
              </h4>
              <ul className="space-y-2 sm:space-y-2.5">
                <li><a href="#workflow" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.smallBiz')}</a></li>
                <li><a href="#workflow" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.nepalFeat')}</a></li>
                <li><a href="#pricing" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.pricing')}</a></li>
                <li><a href="#faq" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.faq')}</a></li>
              </ul>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs sm:text-sm mb-3 sm:mb-4">
                {t('footer.supportHeading')}
              </h4>
              <ul className="space-y-2 sm:space-y-2.5">
                <li><Link href="/demo" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block font-semibold text-indigo-400">{t('footer.tryDemo')}</Link></li>
                <li><Link href="/docs" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.helpDocs')}</Link></li>
                <li><Link href="/contact" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.contact')}</Link></li>
                <li><Link href="/privacy" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.privacy')}</Link></li>
                <li><Link href="/terms" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">{t('footer.terms')}</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Mobile WhatsApp CTA in Footer */}
        <div className="md:hidden">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors"
          >
            <WhatsAppIcon className="h-5 w-5 shrink-0" />
            {t('nav.startFree')}
          </a>
        </div>

        {/* Bottom Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-slate-400 gap-3 sm:gap-4">
          <div>
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </div>

      {/* Legal Dialog Modals */}
      <LegalModal isOpen={!!modalType} type={modalType} onClose={() => setModalType(null)} />
    </footer>
  )
}
