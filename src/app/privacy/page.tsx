import type { Metadata } from 'next'
import Link from 'next/link'
import { AppLogo } from '@/components/ui/app-logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Lock, Play } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — Inventory Lite',
  description: 'Privacy Policy explaining how Inventory Lite collects, uses, and protects your business data.',
}

export default function PrivacyPage() {
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
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-100">
            <Lock className="h-4 w-4 text-emerald-600" />
            Data Protection Policy
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500">
            Last Updated: August 2026
          </p>
        </div>

        <article className="prose prose-slate max-w-none text-slate-700 space-y-6 text-sm sm:text-base leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">1. Information We Collect</h2>
            <p>
              When you use Inventory Lite, we collect the following information to provide and operate the service:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Account Information:</strong> Name, email address, and phone number provided during account creation.</li>
              <li><strong>Business Profile:</strong> Business name, PAN/VAT number, address, and store details entered during onboarding.</li>
              <li><strong>Business Data:</strong> Product catalogs, inventory records, sales transactions, customer credit (Udhaar) ledgers, supplier records, expenses, and invoices created while using the application.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">2. How We Use Your Information</h2>
            <p>
              Your data is used solely to operate your Inventory Lite workspace. Specifically, we use it to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Provide POS billing, stock management, and financial reporting features.</li>
              <li>Generate invoices, receipts, and tax documents.</li>
              <li>Track customer credit and supplier payments.</li>
              <li>Send account-related notifications (login credentials, support responses).</li>
            </ul>
            <p className="mt-2">
              We do not sell, rent, or share your business data with third-party advertisers or data brokers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">3. Business and Transaction Data</h2>
            <p>
              All business data you enter — including products, sales, purchases, customer records, and financial information — is stored in your isolated business workspace. Each business account has its own separate data namespace, and application queries are filtered to return only data belonging to your business.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">4. Account Information</h2>
            <p>
              Your account is created by the Inventory Lite administration team upon your request. You are responsible for keeping your login credentials confidential. If you believe your account has been compromised, contact us immediately at support@inventorylite.app.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">5. Local Storage and Browser Data</h2>
            <p>
              Inventory Lite uses browser localStorage to store non-sensitive preferences such as your language selection, calendar settings, and onboarding progress. This data stays on your device and is not transmitted to our servers.
            </p>
            <p className="mt-2">
              Inventory Lite does not use IndexedDB or offline data synchronization. An active internet connection is required to use the application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">6. Third-Party Services</h2>
            <p>
              Inventory Lite uses the following third-party services to operate:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Appwrite</strong> — Cloud database and authentication provider for account management and data storage.</li>
            </ul>
            <p className="mt-2">
              These services process data on our behalf according to their respective privacy policies. We do not integrate with any advertising, analytics, or tracking third-party services on the customer-facing application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">7. Data Security</h2>
            <p>
              We take reasonable measures to protect your data, including:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Encrypted data transmission (HTTPS) between your browser and our servers.</li>
              <li>Appwrite provides encrypted storage for data at rest.</li>
              <li>Role-based access control ensuring only authorized users can access business data.</li>
              <li>Business data isolation preventing cross-account access.</li>
            </ul>
            <p className="mt-2">
              While we implement industry-standard security practices, no method of electronic storage is completely secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">8. Data Retention</h2>
            <p>
              We retain your business data for as long as your account is active. If you close your account, we will retain data for a limited period to allow for account recovery, after which it will be permanently deleted from our servers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">9. Data Deletion</h2>
            <p>
              Account owners can request deletion of their business workspace. This action is irreversible and will permanently remove all associated products, transactions, customer records, and configuration data. To request deletion, contact us at support@inventorylite.app or via WhatsApp at +977 9805330808.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">10. User Data Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Export your business data in standard formats.</li>
              <li>Request correction of inaccurate account information.</li>
              <li>Request deletion of your account and associated data.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. Continued use of Inventory Lite after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">12. Contact Us</h2>
            <p>
              For questions about this Privacy Policy or your data, contact us at:
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
