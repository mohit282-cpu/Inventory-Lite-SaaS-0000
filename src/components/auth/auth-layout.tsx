"use client"


import Link from 'next/link'
import { CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react'
import { AppLogo } from '@/components/ui/app-logo'

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
            <AppLogo size={36} textColor="text-white" />
          </Link>

          <div className="space-y-3 max-w-sm">
            <h1 className="text-2xl font-extrabold tracking-tight leading-snug">
              Modern POS, Inventory & Credit Management for Nepal
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed font-normal">
              Empower your retail store, hardware shop, or wholesale business with localized billing, VAT invoices, and Udhaar tracking.
            </p>
          </div>

          <div className="space-y-3.5 pt-4">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>100% Multi-Tenant Isolation & Security</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Offline-Friendly & Touch-Optimized POS</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>NPR Currency & Paisa Accounting Precision</span>
            </div>
          </div>
        </div>

        {/* Footer Badge */}
        <div className="text-[11px] text-slate-500 flex items-center gap-2 z-10 pt-8 border-t border-slate-900">
          <ShieldCheck className="h-4 w-4 text-indigo-400" />
          <span>Appwrite BaaS Powered & Encrypted</span>
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-10 lg:p-12 bg-white">
        {/* Mobile Header / Back Link */}
        <div className="flex items-center justify-between pb-6">
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <AppLogo size={32} />
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
