import type { Metadata } from 'next'
import { LandingPageView } from '@/components/landing/landing-page'

export const metadata: Metadata = {
  title: 'Inventory Lite — Simple Stock, Sales & Udhaar Management for Nepal',
  description:
    'Inventory Lite helps small businesses in Nepal manage stock, sales, customer Udhaar, expenses, invoices and business records in one simple system.',
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
    type: 'website',
  },
}

export default function HomePage() {
  return <LandingPageView />
}
