import type { Metadata } from 'next'
import Link from 'next/link'
import { AppLogo } from '@/components/ui/app-logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, ShoppingCart, Boxes, Users, FileText, Play } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Documentation & Guide — Inventory Lite',
  description: 'Learn how to use Inventory Lite for stock management, POS billing, Udhaar tracking, and thermal invoice printing in Nepal.',
}

export default function DocsPage() {
  const guideSections = [
    {
      icon: ShoppingCart,
      title: '1. Point of Sale (POS) & Quick Billing',
      desc: 'Use F2 hotkey or scan barcodes to instantly add items. Toggle 0% PAN or 13% VAT tax billing, process split payments (Cash, Fonepay QR, Udhaar), and print 58mm/80mm receipts.',
    },
    {
      icon: Boxes,
      title: '2. Inventory & Stock Receiving',
      desc: 'Manage stock quantities, cost prices, selling prices, categories, batch/expiry dates, and receive stock intakes with automatic supplier payable balance tracking.',
    },
    {
      icon: Users,
      title: '3. Customer Credit (Khata / Udharo)',
      desc: 'Track customer dues, credit limits, transaction histories, and record partial or full cash/QR payments directly against customer ledger profiles.',
    },
    {
      icon: FileText,
      title: '4. Financial Reports & Sales Returns',
      desc: 'Generate profit estimates, COGS reports, net sales metrics, process sales returns with inventory restoration, and audit non-destructive bill cancellations.',
    },
  ]

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
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Launch Interactive Demo
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="space-y-3 border-b border-slate-200 pb-6">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            User Guide & Documentation
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How to Use Inventory Lite
          </h1>
          <p className="text-base text-slate-600">
            Step-by-step documentation for shop owners and cashiers in Nepal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {guideSections.map((sec, idx) => {
            const Icon = sec.icon
            return (
              <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{sec.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{sec.desc}</p>
              </div>
            )
          })}
        </div>

        <div className="p-6 rounded-2xl bg-indigo-900 text-white space-y-4 shadow-lg">
          <h3 className="text-xl font-bold">Try All Features in the Interactive Sandbox</h3>
          <p className="text-indigo-200 text-sm leading-relaxed">
            Test real POS checkout billing, barcode scanning, thermal printing, and Khata credit management directly in your browser without logging in.
          </p>
          <Button size="lg" className="bg-white text-indigo-950 hover:bg-slate-100 font-bold" asChild>
            <Link href="/demo">
              Open Demo Workspace <Play className="ml-2 h-4 w-4 fill-current" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
