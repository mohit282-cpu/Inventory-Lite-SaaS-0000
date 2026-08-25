import type { Metadata } from 'next'
import { DemoSandbox } from '@/components/demo/demo-sandbox'

export const metadata: Metadata = {
  title: 'Interactive POS & Stock Demo Sandbox — Inventory Lite',
  description: 'Try the full interactive POS counter, stock management, Udhaar credit ledger, and 58mm/80mm thermal receipt generator live in your browser.',
}

export default function DemoPage() {
  return <DemoSandbox />
}
