import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportToPDF(data: any) {
  const doc = new jsPDF()
  const businessName = data.businessName || 'My Business'
  const yearLabel = data.yearLabel || data.fiscalYear || '2081/82'
  const dateFrom = data.dateFrom ? new Date(data.dateFrom).toLocaleDateString() : 'All Time'
  const dateTo = data.dateTo ? new Date(data.dateTo).toLocaleDateString() : 'Present'

  let currentY = 15

  // Header
  doc.setFontSize(16)
  doc.text(data.title || 'BUSINESS INTELLIGENCE & AUDIT REPORT', 14, currentY)
  currentY += 8

  doc.setFontSize(10)
  doc.text(`Business: ${businessName}`, 14, currentY)
  currentY += 5
  if (data.panNumber) {
    doc.text(`PAN/VAT: ${data.panNumber}`, 14, currentY)
    currentY += 5
  }
  doc.text(`Financial Year: ${yearLabel}`, 14, currentY)
  currentY += 5
  doc.text(`Report Period: ${dateFrom} to ${dateTo}`, 14, currentY)
  currentY += 5
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, currentY)
  currentY += 12

  // Handle Tabular Item Array (Generic Audit Report Export)
  if (data.items && Array.isArray(data.items) && data.items.length > 0) {
    const firstItem = data.items[0]
    if (typeof firstItem === 'object' && firstItem !== null) {
      const keys = Object.keys(firstItem).filter((k) => !k.startsWith('$'))
      const head = [keys.map((k) => k.replace(/([A-Z])/g, ' $1').toUpperCase())]
      const body = data.items.slice(0, 500).map((item: any) =>
        keys.map((k) => {
          const val = item[k]
          if (typeof val === 'number') return val.toLocaleString()
          return val !== undefined && val !== null ? String(val) : '-'
        })
      )

      autoTable(doc, {
        startY: currentY,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
      })
    } else {
      const body = data.items.map((item: any) => [String(item)])
      autoTable(doc, {
        startY: currentY,
        head: [['Details']],
        body,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59] },
      })
    }

    const filename = `${businessName}_${(data.title || 'Report').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    doc.save(filename)
    return
  }

  // Handle Full Business Intelligence Payload
  const profitReport = data.profitReport || {
    totalRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    netMarginPercent: 0,
    totalSalesCount: 0,
  }
  const sales = data.sales || []
  const products = data.products || []
  const customers = data.customers || []
  const paymentMethods = data.paymentMethods || []

  // 1. Executive Summary
  doc.setFontSize(12)
  doc.text('1. Executive Summary', 14, currentY)
  currentY += 5

  const execData = [
    ['Total Revenue', `Rs. ${(profitReport.totalRevenue || 0).toFixed(2)}`],
    ['Cost of Goods Sold (COGS)', `Rs. ${(profitReport.cogs || 0).toFixed(2)}`],
    ['Gross Profit', `Rs. ${(profitReport.grossProfit || 0).toFixed(2)}`],
    ['Total Expenses', `Rs. ${(profitReport.totalExpenses || 0).toFixed(2)}`],
    ['Net Profit', `Rs. ${(profitReport.netProfit || 0).toFixed(2)}`],
    ['Net Margin %', `${profitReport.netMarginPercent || 0}%`],
    ['Total Sales Count', `${profitReport.totalSalesCount || 0}`],
    ['Total Customers', `${customers.length}`],
    ['Total Products', `${products.length}`],
  ]
  autoTable(doc, {
    startY: currentY,
    head: [['Metric', 'Value']],
    body: execData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] },
  })
  currentY = (doc as any).lastAutoTable.finalY + 12

  // 2. Sales Register Summary
  if (sales.length > 0) {
    doc.setFontSize(12)
    doc.text('2. Sales Register', 14, currentY)
    currentY += 5

    const salesData = sales
      .filter((s: any) => s.status !== 'cancelled')
      .slice(0, 500)
      .map((s: any) => [
        s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
        s.saleNumber || `SALE-${(s.$id || '').substring(0, 6)}`,
        s.paymentMethod || '-',
        s.status || 'completed',
        `Rs. ${(s.total || 0).toFixed(2)}`,
      ])

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Sale #', 'Method', 'Status', 'Total']],
      body: salesData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    })
    currentY = (doc as any).lastAutoTable.finalY + 12
  }

  // 3. Payment Reconciliation
  if (paymentMethods.length > 0) {
    doc.setFontSize(12)
    doc.text('3. Payment Reconciliation', 14, currentY)
    currentY += 5

    const paymentData = paymentMethods.map((p: any) => [
      p.name,
      (p.count || 0).toString(),
      `Rs. ${(p.total || 0).toFixed(2)}`,
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['Method', 'Transactions Count', 'Total Collected']],
      body: paymentData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    })
  }

  const filename = `${businessName}_Audit_Report_${yearLabel.replace('/', '_')}.pdf`
  doc.save(filename)
}
