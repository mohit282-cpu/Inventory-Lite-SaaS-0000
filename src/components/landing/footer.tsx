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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="flex items-center gap-2 inline-block">
              <AppLogo size={36} textColor="text-white" />
            </Link>
            <p className="text-slate-300 max-w-sm text-sm sm:text-base leading-relaxed">
              {t('footer.subtitle')}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs sm:text-sm mb-4">
                {t('footer.productHeading')}
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="#product" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.overview')}
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.workflow')}
                  </a>
                </li>
                <li>
                  <a href="#product" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.stock')}
                  </a>
                </li>
                <li>
                  <a href="#product" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.pos')}
                  </a>
                </li>
                <li>
                  <a href="#product" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.invoices')}
                  </a>
                </li>
                <li>
                  <a href="#product" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.udhaar')}
                  </a>
                </li>
                <li>
                  <a href="#product" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.expenses')}
                  </a>
                </li>
                <li>
                  <a href="#product" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.reports')}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs sm:text-sm mb-4">
                {t('footer.businessHeading')}
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="#workflow" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.smallBiz')}
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.nepalFeat')}
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.pricing')}
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-sm text-slate-400 hover:text-white transition-colors inline-block">
                    {t('footer.faq')}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-xs sm:text-sm mb-4">
                {t('footer.supportHeading')}
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('contact')}
                    className="text-sm text-slate-400 hover:text-white transition-colors text-left inline-block"
                  >
                    {t('footer.help')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('contact')}
                    className="text-sm text-slate-400 hover:text-white transition-colors text-left inline-block"
                  >
                    {t('footer.contact')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('privacy')}
                    className="text-sm text-slate-400 hover:text-white transition-colors text-left inline-block"
                  >
                    {t('footer.privacy')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('terms')}
                    className="text-sm text-slate-400 hover:text-white transition-colors text-left inline-block"
                  >
                    {t('footer.terms')}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-sm text-slate-400 gap-4">
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
