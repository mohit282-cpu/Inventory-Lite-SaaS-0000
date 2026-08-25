import { ExportDataPayload } from './excel-export'

function escapeCSV(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToCSV(
  data: ExportDataPayload | any,
  type: 'sales' | 'invoices' | 'expenses' | 'inventory' | 'receivables' = 'sales'
) {
  let csv = ''
  const businessName = data.businessName || 'My Business'
  const yearLabel = (data.yearLabel || data.fiscalYear || '2081/82').replace('/', '_')

  // Handle Tabular Item Array (Generic Audit Report Export from Export Center)
  if (data.items && Array.isArray(data.items) && data.items.length > 0) {
    const firstItem = data.items[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      const keys = Object.keys(firstItem).filter((k) => !k.startsWith('$'))
      csv += keys.map((k) => escapeCSV(k.replace(/([A-Z])/g, ' $1').toUpperCase())).join(',') + '\n'
      data.items.forEach((item: any) => {
        csv += keys.map((k) => escapeCSV(item[k])).join(',') + '\n'
      })
    } else {
      csv += 'Value\n'
      data.items.forEach((item: any) => {
        csv += `${escapeCSV(item)}\n`
      })
    }

    const title = data.title || 'Audit_Report'
    downloadCSV(csv, `${businessName}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`)
    return
  }

  const sales = data.sales || []
  const invoices = data.invoices || []
  const expenses = data.expenses || []

  if (type === 'sales') {
    csv += 'Date,Sale Number,Invoice #,Method,Status,Total\n'
    sales.forEach((s: any) => {
      const date = escapeCSV(s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '')
      const saleNum = escapeCSV(s.saleNumber || '-')
      const invoice = escapeCSV(invoices.find((i: any) => i.$id === s.invoiceId)?.invoiceNumber || '-')
      const method = escapeCSV(s.paymentMethod || '')
      const status = escapeCSV(s.status || '')
      const total = escapeCSV(s.total)
      csv += `${date},${saleNum},${invoice},${method},${status},${total}\n`
    })
    downloadCSV(csv, `${businessName}_Sales_${yearLabel}.csv`)
  } else if (type === 'invoices') {
    csv += 'Date,Invoice Number,Sale #,Status\n'
    invoices.forEach((i: any) => {
      const date = escapeCSV(i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '')
      const num = escapeCSV(i.invoiceNumber)
      const saleNum = escapeCSV(sales.find((s: any) => s.$id === i.saleId)?.saleNumber || '-')
      const status = escapeCSV(i.status)
      csv += `${date},${num},${saleNum},${status}\n`
    })
    downloadCSV(csv, `${businessName}_Invoices_${yearLabel}.csv`)
  } else if (type === 'expenses') {
    csv += 'Date,Category,Title,Amount\n'
    expenses.forEach((e: any) => {
      const date = escapeCSV(e.date || e.createdAt ? new Date(e.date || e.createdAt).toLocaleDateString() : '')
      const cat = escapeCSV(e.category)
      const title = escapeCSV(e.title || e.description || '')
      const amount = escapeCSV(e.amount)
      csv += `${date},${cat},${title},${amount}\n`
    })
    downloadCSV(csv, `${businessName}_Expenses_${yearLabel}.csv`)
  }
}
