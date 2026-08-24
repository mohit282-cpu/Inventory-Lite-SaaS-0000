import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ExportDataPayload } from './excel-export'

export function exportToPDF(data: ExportDataPayload) {
  const doc = new jsPDF()
  const { businessName, yearLabel, dateFrom, dateTo, sales, products, customers, profitReport, paymentMethods } = data

  let currentY = 15

  // Header
  doc.setFontSize(18)
  doc.text('BUSINESS INTELLIGENCE & AUDIT CENTER', 14, currentY)
  currentY += 8

  doc.setFontSize(12)
  doc.text(`Business: ${businessName}`, 14, currentY)
  currentY += 6
  doc.text(`Financial Year: ${yearLabel}`, 14, currentY)
  currentY += 6
  doc.text(`Report Period: ${new Date(dateFrom).toLocaleDateString()} to ${new Date(dateTo).toLocaleDateString()}`, 14, currentY)
  currentY += 6
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, currentY)
  currentY += 15

  // 1. Executive Summary
  doc.setFontSize(14)
  doc.text('1. Executive Summary', 14, currentY)
  currentY += 5
  
  const execData = [
    ['Total Revenue', `Rs. ${profitReport.totalRevenue.toFixed(2)}`],
    ['Cost of Goods Sold (COGS)', `Rs. ${profitReport.cogs.toFixed(2)}`],
    ['Gross Profit', `Rs. ${profitReport.grossProfit.toFixed(2)}`],
    ['Total Expenses', `Rs. ${profitReport.totalExpenses.toFixed(2)}`],
    ['Net Profit', `Rs. ${profitReport.netProfit.toFixed(2)}`],
    ['Net Margin %', `${profitReport.netMarginPercent}%`],
    ['Total Sales Count', `${profitReport.totalSalesCount}`],
    ['Total Customers', `${customers.length}`],
    ['Total Products', `${products.length}`]
  ]
  autoTable(doc, {
    startY: currentY,
    head: [['Metric', 'Value']],
    body: execData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] }
  })
  currentY = (doc as any).lastAutoTable.finalY + 15

  // 2. Sales Summary
  doc.setFontSize(14)
  doc.text('2. Sales Register', 14, currentY)
  currentY += 5
  
  const salesData = sales
    .filter(s => s.status !== 'cancelled')
    .slice(0, 500) // limit for PDF
    .map(s => [
      new Date(s.createdAt).toLocaleDateString(),
      s.saleNumber || `SALE-${s.$id.substring(0, 6)}`,
      s.paymentMethod || '-',
      s.status,
      `Rs. ${(s.total || 0).toFixed(2)}`
    ])
  
  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Sale #', 'Method', 'Status', 'Total']],
    body: salesData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] }
  })
  currentY = (doc as any).lastAutoTable.finalY + 15

  // 3. Payment Reconciliation
  doc.setFontSize(14)
  doc.text('3. Payment Reconciliation', 14, currentY)
  currentY += 5
  
  const paymentData = paymentMethods.map(p => [
    p.name,
    p.count.toString(),
    `Rs. ${p.total.toFixed(2)}`
  ])
  
  autoTable(doc, {
    startY: currentY,
    head: [['Method', 'Transactions Count', 'Total Collected']],
    body: paymentData,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] }
  })
  currentY = (doc as any).lastAutoTable.finalY + 15

  // Save PDF
  doc.save(`${businessName}_Report_${yearLabel.replace('/', '_')}.pdf`)
}
