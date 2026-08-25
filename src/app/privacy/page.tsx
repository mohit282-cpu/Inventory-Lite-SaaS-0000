import type { Metadata } from 'next'
import Link from 'next/link'
import { AppLogo } from '@/components/ui/app-logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — Inventory Lite',
  description: 'Privacy Policy explaining how Inventory Lite protects your business data.',
}

export default function PrivacyPage() {
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
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-100">
            <Lock className="h-4 w-4 text-emerald-600" />
            Data Protection Policy
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500">
            Last Updated: August 2026 • Encrypted Multi-Tenant Architecture
          </p>
        </div>

        <article className="prose prose-slate max-w-none text-slate-700 space-y-6 text-sm sm:text-base leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
            <p>
              We collect user account information (Name, Email, Phone number), Business profile details (PAN/VAT number, Business Name, Address), inventory items, transactions, and customer credit ledger records required to deliver POS and stock management functionality.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">2. How We Use Your Information</h2>
            <p>
              Your data is used solely to operate your Inventory Lite workspace, generate invoices, track stock movements, format financial reports, and facilitate customer Udhaar settlements. We do not sell or share business records with third-party advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">3. Data Isolation & Security</h2>
            <p>
              All application data is protected by strict tenant isolation rules. Database queries automatically include business boundary filters to prevent unauthorized access across accounts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">4. Local Device Storage</h2>
            <p>
              Inventory Lite utilizes browser LocalStorage and IndexedDB to cache offline sales, active carts, and user preferences locally so your shop can continue billing during internet interruptions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">5. Your Data Rights</h2>
            <p>
              You have full ownership of your catalog and billing records. Owners can export transaction statements or request complete workspace deletion at any time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">6. Privacy Contacts</h2>
            <p>
              If you have questions regarding data privacy, please contact privacy@inventorylite.app.
            </p>
          </section>
        </article>
      </main>
    </div>
  )
}
