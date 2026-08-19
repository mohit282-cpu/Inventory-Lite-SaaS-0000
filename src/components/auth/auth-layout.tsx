"use client"

import React from 'react'
import Link from 'next/link'
import { Store, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
  showBackToHome?: boolean
}

export function AuthLayout({
  children,
  title,
  subtitle,
  showBackToHome = true,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 font-sans antialiased text-slate-900">
      {/* Left Brand Panel (Desktop 40% Width) */}
      <div className="lg:col-span-5 hidden lg:flex flex-col justify-between p-10 lg:p-12 bg-slate-950 text-white border-r border-slate-800 relative overflow-hidden">
        {/* Brand Header */}
        <div className="space-y-8 z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold group-hover:bg-indigo-500 transition-colors shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Inventory <span className="text-indigo-400">Lite</span>
            </span>
          </Link>

          <div className="space-y-3 max-w-sm">
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-snug">
              Simple inventory & billing for small businesses.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Manage your products, stock, sales, customers, and invoices from one simple portal — completely free.
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Catalog items, rates, and stock thresholds</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Record sales quickly at the POS counter</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Generate printable A4 & thermal tax invoices</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Keep customer credit (Udharo) ledgers organized</span>
            </div>
          </div>
        </div>

        {/* Brand Footer Notice */}
        <div className="pt-8 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400 font-medium z-10">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span>100% Free Software • Built for Nepal Businesses</span>
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-white">
        {/* Mobile Header / Back Link */}
        <div className="flex items-center justify-between pb-6">
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              Inventory <span className="text-indigo-600">Lite</span>
            </span>
          </Link>

          {showBackToHome && (
            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5 transition-colors ml-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
            </Link>
          )}
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6 py-4">
          <div className="space-y-1.5 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>

          {children}
        </div>

        {/* Auth Page Footer */}
        <div className="pt-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Inventory Lite • Simple Inventory & Billing
        </div>
      </div>
    </div>
  )
}
