import { redirect } from 'next/navigation'

export default function InvoicesPage() {
  redirect('/app/sales?tab=invoices')
}
