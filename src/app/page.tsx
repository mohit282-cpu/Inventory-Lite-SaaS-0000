import type { Metadata } from 'next'
import { LandingPageView } from '@/components/landing/landing-page'

export const metadata: Metadata = {
  metadataBase: new URL('https://inventorylite.app'),
  title: 'Inventory Lite — Simple Stock, Sales & Udhaar Management for Nepal',
  description:
    'Inventory Lite helps small businesses in Nepal manage stock, sales, customer Udhaar, expenses, invoices and business records in one simple system. Plans from NPR 699/month.',
  keywords: [
    'inventory software Nepal',
    'billing software Nepal',
    'POS software Nepal',
    'shop management software Nepal',
    'inventory management Nepal',
    'Udhaar management',
    'small business software Nepal',
    'Inventory Lite',
  ],
  openGraph: {
    title: 'Inventory Lite — Simple Stock, Sales & Udhaar Management for Nepal',
    description:
      'Inventory Lite helps small businesses in Nepal manage stock, sales, customer Udhaar, expenses, invoices and business records in one simple system.',
    url: 'https://inventorylite.app',
    siteName: 'Inventory Lite',
    locale: 'en_US',
    alternateLocale: 'ne_NP',
    type: 'website',
    images: [
      {
        url: '/screenshots/hero-dashboard.png',
        width: 1280,
        height: 800,
        alt: 'Inventory Lite Dashboard — Stock, sales, Udhaar and business overview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inventory Lite — Simple Stock, Sales & Udhaar Management for Nepal',
    description:
      'Inventory Lite helps small businesses in Nepal manage stock, sales, customer Udhaar, expenses, invoices and business records in one simple system.',
    images: ['/screenshots/hero-dashboard.png'],
  },
  alternates: {
    canonical: 'https://inventorylite.app',
    languages: {
      'en': 'https://inventorylite.app?lang=en',
      'ne': 'https://inventorylite.app?lang=ne',
    },
  },
}

export default function HomePage() {
  return <LandingPageView />
}
