"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { AppLogo } from '@/components/ui/app-logo'
import { LegalModal } from './legal-modal'

export function LandingFooter() {
  const [modalType, setModalType] = useState<'privacy' | 'terms' | 'contact' | null>(null)

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <AppLogo size={32} textColor="text-white" />
            </Link>
            <p className="text-slate-400 max-w-sm text-xs leading-relaxed">
              Simple inventory and billing for small businesses in Nepal.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-7 grid grid-cols-3 gap-6">
            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-3">
                Product
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#product" className="hover:text-white transition-colors">
                    Product Overview
                  </a>
                </li>
                <li>
                  <a href="#workflow" className="hover:text-white transition-colors">
                    Workflow
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-3">
                Portal
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/auth/login" className="hover:text-white transition-colors">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/auth/signup" className="hover:text-white transition-colors">
                    Register
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] mb-3">
                Legal & Support
              </h4>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('privacy')}
                    className="hover:text-white transition-colors text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('terms')}
                    className="hover:text-white transition-colors text-left"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setModalType('contact')}
                    className="hover:text-white transition-colors text-left"
                  >
                    Contact Support
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
          <div>
            &copy; {new Date().getFullYear()} Inventory Lite SaaS. All rights reserved.
          </div>
          <div>Built for small businesses in Nepal</div>
        </div>
      </div>

      {/* Legal Dialog Modals */}
      <LegalModal isOpen={!!modalType} type={modalType} onClose={() => setModalType(null)} />
    </footer>
  )
}
