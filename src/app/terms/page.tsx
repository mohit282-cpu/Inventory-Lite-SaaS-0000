import type { Metadata } from 'next'
import Link from 'next/link'
import { AppLogo } from '@/components/ui/app-logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ShieldCheck, Play } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service — Inventory Lite',
  description: 'Terms of Service and legal agreement for using Inventory Lite SaaS in Nepal.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={32} />
          </Link>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" asChild>
              <Link href="/demo">
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Try Interactive Demo
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
              </Link>
            </Button>
          </div>
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
            Last Updated: August 2026
          </p>
        </div>

        <article className="prose prose-slate max-w-none text-slate-700 space-y-6 text-sm sm:text-base leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accepting access credentials, accessing, or using the Inventory Lite application, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">2. Admin-Provisioned Accounts</h2>
            <p>
              Inventory Lite is an admin-provisioned SaaS application. Accounts are created by the Inventory Lite administration team upon request. You do not create your own account through a public registration process. To get started, contact us via WhatsApp or email, and our team will set up your account and provide login credentials.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">3. Account Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must notify us immediately if you suspect unauthorized access to your account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">4. Subscription and Payment</h2>
            <p>
              Inventory Lite offers monthly, 6-month, and annual subscription plans. Pricing and billing terms are communicated at the time of account setup. Subscriptions must be renewed to continue accessing the service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">5. Cancellation</h2>
            <p>
              You may request account cancellation by contacting our support team. Upon cancellation, your access to the service will be revoked. Data retention and deletion follow our Privacy Policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">6. Acceptable Use</h2>
            <p>
              You agree to use Inventory Lite only for lawful business purposes. You must not use the service to store or transmit illegal content, attempt to gain unauthorized access to other accounts, or interfere with the operation of the service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">7. Customer Data</h2>
            <p>
              All business data you enter — including products, sales, customer records, and financial information — belongs to you. Inventory Lite processes this data solely to provide the service. Your business data is isolated from other accounts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">8. Data Ownership</h2>
            <p>
              You retain full ownership of all business data entered into Inventory Lite. You may export your data at any time. Upon account deletion, your data will be permanently removed from our servers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">9. Service Availability</h2>
            <p>
              We strive to keep Inventory Lite available and reliable. However, the service may occasionally be unavailable due to maintenance, updates, or circumstances beyond our control. We are not liable for any losses caused by service interruptions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">10. Offline Mode</h2>
            <p>
              Inventory Lite requires an active internet connection to operate. The application does not currently support offline billing or data synchronization.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">11. Third-Party Services</h2>
            <p>
              Inventory Lite uses Appwrite as its cloud database and authentication provider. Your use of the service is also subject to Appwrite&apos;s terms of service and privacy policy for data processing operations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">12. Tax and Accounting Responsibility</h2>
            <p>
              Inventory Lite provides tools for issuing 0% PAN and 13% VAT invoices in accordance with the Inland Revenue Department (IRD) of Nepal. Business owners remain solely responsible for filing accurate tax returns, maintaining proper accounting records, and complying with all applicable Nepalese tax laws.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">13. Limitation of Liability</h2>
            <p>
              Inventory Lite is provided &quot;as is&quot; without warranties of any kind. We are not liable for business losses, data errors caused by invalid user inputs, or external network outages. Our total liability shall not exceed the subscription fees paid by you during the twelve months preceding the claim.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">14. Suspension and Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access if you violate these Terms, engage in fraudulent activity, or if required by law. We will make reasonable efforts to notify you before taking such action.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">15. Changes to the Service</h2>
            <p>
              We may add, modify, or discontinue features of Inventory Lite at any time. We will make reasonable efforts to notify users of significant changes that may affect your use of the service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">16. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Changes will be posted on this page with an updated effective date. Continued use of the service after changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">17. Contact Information</h2>
            <p>
              For questions about these Terms or for account support, please visit our{' '}
              <Link href="/contact" className="text-indigo-600 font-semibold underline">
                Contact Page
              </Link>{' '}
              or reach us at:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Email: <a href="mailto:support@inventorylite.app" className="text-indigo-600 font-semibold underline">support@inventorylite.app</a></li>
              <li>WhatsApp: +977 9805330808</li>
            </ul>
          </section>
        </article>
      </main>
    </div>
  )
}
