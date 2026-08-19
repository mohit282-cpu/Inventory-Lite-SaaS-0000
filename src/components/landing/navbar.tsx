"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Store, Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LandingNavbar() {
  const { user, activeBusiness } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const hasPortalAccess = !!user

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30 group-hover:bg-indigo-500 transition-colors">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            Inventory <span className="text-indigo-400">Lite</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#preview" className="hover:text-white transition-colors">
            Preview
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        {/* Desktop Auth CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {hasPortalAccess ? (
            <Button
              asChild
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/20"
            >
              <Link href={activeBusiness ? "/app/dashboard" : "/onboarding"}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> Go to Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                asChild
                className="text-slate-300 hover:text-white hover:bg-slate-900"
              >
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button
                asChild
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/20"
              >
                <Link href="/auth/signup">
                  Start Free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-4 animate-fade-in">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#preview"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white transition-colors"
            >
              Preview
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-white transition-colors"
            >
              FAQ
            </a>
          </nav>

          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2.5">
            {hasPortalAccess ? (
              <Button
                asChild
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold min-h-[44px]"
              >
                <Link href={activeBusiness ? "/app/dashboard" : "/onboarding"}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Go to Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  asChild
                  className="w-full border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 min-h-[44px]"
                >
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold min-h-[44px]"
                >
                  <Link href="/auth/signup">
                    Start Free <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
