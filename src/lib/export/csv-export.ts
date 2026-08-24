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

export function exportToCSV(data: ExportDataPayload, type: 'sales' | 'invoices' | 'expenses' | 'inventory' | 'receivables') {
  let csv = ''
  
  if (type === 'sales') {
    csv += 'Date,Sale Number,Invoice #,Method,Status,Total\n'
    data.sales.forEach(s => {
      const date = escapeCSV(new Date(s.createdAt).toLocaleDateString())
      const saleNum = escapeCSV(s.saleNumber || `SALE-${s.$id.substring(0, 6)}`)
      const invoice = escapeCSV(s.invoiceId || '')
      const method = escapeCSV(s.paymentMethod || '')
      const status = escapeCSV(s.status || '')
      const total = escapeCSV(s.total)
      csv += `${date},${saleNum},${invoice},${method},${status},${total}\n`
    })
    downloadCSV(csv, `${data.businessName}_Sales_${data.yearLabel.replace('/', '_')}.csv`)
  } 
  
  else if (type === 'invoices') {
    csv += 'Date,Invoice Number,Sale ID,Status\n'
    data.invoices.forEach(i => {
      const date = escapeCSV(new Date(i.createdAt).toLocaleDateString())
      const num = escapeCSV(i.invoiceNumber)
      const saleId = escapeCSV(i.saleId)
      const status = escapeCSV(i.status)
      csv += `${date},${num},${saleId},${status}\n`
    })
    downloadCSV(csv, `${data.businessName}_Invoices_${data.yearLabel.replace('/', '_')}.csv`)
  }

  else if (type === 'expenses') {
    csv += 'Date,Category,Title,Amount\n'
    data.expenses.forEach(e => {
      const date = escapeCSV(new Date(e.date || e.createdAt).toLocaleDateString())
      const cat = escapeCSV(e.category)
      const title = escapeCSV(e.title || e.description || '')
      const amount = escapeCSV(e.amount)
      csv += `${date},${cat},${title},${amount}\n`
    })
    downloadCSV(csv, `${data.businessName}_Expenses_${data.yearLabel.replace('/', '_')}.csv`)
  }
}
