"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/language-context'
import { AppLogo } from '@/components/ui/app-logo'
import { LegalModal } from './legal-modal'

export function LandingFooter() {
  const { t } = useLanguage()
  const [modalType, setModalType] = useState<'privacy' | 'terms' | 'contact' | null>(null)

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-sm py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="flex items-center gap-2 inline-block">
              <AppLogo size={32} textColor="text-white" />
            </Link>
            <p className="text-slate-400 max-w-sm text-xs sm:text-sm leading-relaxed">
              {t('footer.subtitle')}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs mb-4">
                {t('footer.productHeading')}
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="#product" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.overview')}
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.workflow')}
                  </a>
                </li>
                <li>
                  <a href="#features" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.features')}
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.pricing')}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs mb-4">
                {t('footer.portalHeading')}
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/auth/login" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.login')}
                  </Link>
                </li>
                <li>
                  <Link href="/auth/signup" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.register')}
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.faq')}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs mb-4">
                {t('footer.legalHeading')}
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('privacy')}
                    className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors text-left inline-block"
                  >
                    {t('footer.privacy')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('terms')}
                    className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors text-left inline-block"
                  >
                    {t('footer.terms')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('contact')}
                    className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors text-left inline-block"
                  >
                    {t('footer.contact')}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-slate-400 gap-4">
          <div>
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </div>
          <div>{t('footer.builtFor')}</div>
        </div>
      </div>

      {/* Legal Dialog Modals */}
      <LegalModal isOpen={!!modalType} type={modalType} onClose={() => setModalType(null)} />
    </footer>
  )
}
