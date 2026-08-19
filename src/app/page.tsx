import type { Metadata } from 'next'
import { LandingPageView } from '@/components/landing/landing-page'

export const metadata: Metadata = {
  title: 'Inventory Lite — Simple Inventory & Billing for Small Businesses',
  description:
    'Manage products, stock, sales, customers, and invoices with simple inventory software built for small businesses in Nepal.',
  keywords: [
    'Inventory Management Nepal',
    'Billing Software Nepal',
    'POS Nepal',
    'Small Business Inventory',
    'Tax Invoice Nepal',
    'PAN VAT Invoicing',
    'Udharo Tracking',
    'Inventory Lite',
  ],
  openGraph: {
    title: 'Inventory Lite — Simple Inventory & Billing for Small Businesses',
    description:
      'Manage products, stock, sales, customers, and invoices with simple inventory software built for small businesses in Nepal.',
    url: 'https://inventorylite.app',
    siteName: 'Inventory Lite',
    locale: 'en_US',
    type: 'website',
  },
}

export default function HomePage() {
  return <LandingPageView />
}
