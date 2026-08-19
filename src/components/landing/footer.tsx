"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { Store } from 'lucide-react'
import { LegalModal } from '@/components/landing/legal-modal'

export function LandingFooter() {
  const [modalType, setModalType] = useState<'privacy' | 'terms' | 'contact' | null>(null)

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                <Store className="h-4.5 w-4.5" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">
                Inventory <span className="text-indigo-400">Lite</span>
              </span>
            </Link>
            <p className="text-slate-400 leading-relaxed max-w-xs">
              Simple inventory & billing software built for small businesses in Nepal.
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-white">Product</div>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#preview" className="hover:text-white transition-colors">
                  Product Preview
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pricing Plans
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-white">Account</div>
            <ul className="space-y-2">
              <li>
                <Link href="/auth/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="hover:text-white transition-colors">
                  Create Business Account
                </Link>
              </li>
              <li>
                <Link href="/onboarding" className="hover:text-white transition-colors">
                  Business Setup Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support Links */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-white">Legal & Support</div>
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

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>© {new Date().getFullYear()} Inventory Lite. All rights reserved.</div>
          <div>Simple Inventory & Billing SaaS for Nepal.</div>
        </div>
      </div>

      <LegalModal
        isOpen={modalType !== null}
        type={modalType}
        onClose={() => setModalType(null)}
      />
    </footer>
  )
}
