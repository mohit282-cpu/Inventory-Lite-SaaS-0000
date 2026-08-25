import type { Metadata } from 'next'
import Link from 'next/link'
import { AppLogo } from '@/components/ui/app-logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service — Inventory Lite',
  description: 'Terms of Service and legal agreement for using Inventory Lite SaaS.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={32} />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-3 border-b border-slate-200 pb-6">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-500">
            Last Updated: August 2026 • Applies to all Inventory Lite SaaS accounts in Nepal
          </p>
        </div>

        <article className="prose prose-slate max-w-none text-slate-700 space-y-6 text-sm sm:text-base leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By creating an account or accessing the Inventory Lite application, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use our services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">2. Business Account & Multi-Tenant Data Isolation</h2>
            <p>
              Each business account is strictly isolated within our Appwrite cloud database. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your business workspace.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">3. Compliance with Nepalese Tax & Accounting Laws</h2>
            <p>
              Inventory Lite provides tools for issuing 0% PAN (Non-VAT estimate/bills) and 13% VAT Tax Invoices in accordance with the Inland Revenue Department (IRD) of Nepal. Business owners remain responsible for filing accurate tax returns.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">4. Offline Mode & Data Synchronization</h2>
            <p>
              Inventory Lite supports offline caching for uninterrupted point-of-sale operations. Pending offline sales automatically synchronize to the Appwrite server once connectivity is restored.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">5. Limitation of Liability</h2>
            <p>
              Inventory Lite is provided &quot;as is&quot; without warranties of any kind. We are not liable for business losses, data errors caused by invalid user inputs, or external network outages.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">6. Contact Information</h2>
            <p>
              For legal inquiries or account support, please visit our{' '}
              <Link href="/contact" className="text-indigo-600 font-semibold underline">
                Contact Page
              </Link>{' '}
              or email support@inventorylite.app.
            </p>
          </section>
        </article>
      </main>
    </div>
  )
}
