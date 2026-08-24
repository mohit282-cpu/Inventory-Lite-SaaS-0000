import * as XLSX from 'xlsx'
import { Sale, Invoice, Expense, Product, Customer } from '@/types'
import { MonthlyData } from '@/components/features/reports/MonthlyFinancialSummary'
import { ProfitEstimateReport, PaymentMethodPoint } from '@/services/analytics.service'

export interface ExportDataPayload {
  businessName: string
  yearLabel: string
  dateFrom: string
  dateTo: string
  sales: Sale[]
  invoices: Invoice[]
  expenses: Expense[]
  products: Product[]
  customers: Customer[]
  profitReport: ProfitEstimateReport
  monthlyData: MonthlyData[]
  paymentMethods: PaymentMethodPoint[]
}

export function exportToExcel(data: ExportDataPayload) {
  const wb = XLSX.utils.book_new()
  const { sales, invoices, expenses, products, customers, profitReport, monthlyData, paymentMethods } = data

  // 01 Executive Summary
  const execSummary = [
    ['Metric', 'Value'],
    ['Total Revenue', profitReport.totalRevenue],
    ['Cost of Goods Sold (COGS)', profitReport.cogs],
    ['Gross Profit', profitReport.grossProfit],
    ['Total Expenses', profitReport.totalExpenses],
    ['Net Profit', profitReport.netProfit],
    ['Net Margin %', profitReport.netMarginPercent],
    ['Total Sales Count', profitReport.totalSalesCount],
    ['Total Customers', customers.length],
    ['Total Products', products.length]
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(execSummary), '01 Executive Summary')

  // 02 Monthly Summary
  const monthlySheet = XLSX.utils.json_to_sheet(monthlyData)
  XLSX.utils.book_append_sheet(wb, monthlySheet, '02 Monthly Summary')

  // 03 Sales Register
  const salesData = sales
    .filter(s => s.status !== 'cancelled')
    .map(s => ({
      Date: new Date(s.createdAt).toLocaleDateString(),
      'Sale Number': s.saleNumber || '-',
      'Invoice #': invoices.find(i => i.$id === s.invoiceId)?.invoiceNumber || '-',
      Method: s.paymentMethod,
      Status: s.status,
      Total: s.total
    }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), '03 Sales Register')

  // 04 Invoice Register
  const invoiceData = invoices.map(i => ({
    Date: new Date(i.createdAt).toLocaleDateString(),
    'Invoice Number': i.invoiceNumber,
    'Sale #': sales.find(s => s.$id === i.saleId)?.saleNumber || '-',
    Status: i.status
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceData), '04 Invoice Register')

  // 05 Payment Reconciliation
  const paymentData = paymentMethods.map(p => ({
    'Payment Method': p.name,
    'Transactions Count': p.count,
    'Total Collected': p.total
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentData), '05 Payment Reconciliation')

  // 06 Receivables
  const receivablesData = customers
    .filter(c => (c.totalDue || 0) > 0)
    .map(c => ({
      Name: c.name,
      Phone: c.phone || '',
      'Total Due': c.totalDue
    }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(receivablesData), '06 Receivables')

  // 07 Inventory
  const inventoryData = products.map(p => ({
    Name: p.name,
    SKU: p.sku || '',
    'Stock Qty': p.stockQuantity || 0,
    'Cost Price': p.purchasePrice || 0,
    'Selling Price': p.sellingPrice || 0,
    'Total Value (Cost)': (p.stockQuantity || 0) * (p.purchasePrice || 0)
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryData), '07 Inventory')

  // 08 Expenses
  const expensesData = expenses.map(e => ({
    Date: new Date(e.date || e.createdAt).toLocaleDateString(),
    Category: e.category,
    Title: e.title || e.description || '',
    Amount: e.amount
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesData), '08 Expenses')

  // 09 Cancelled Transactions
  const cancelledSales = sales
    .filter(s => s.status === 'cancelled')
    .map(s => ({
      Date: new Date(s.createdAt).toLocaleDateString(),
      'Sale Number': s.saleNumber || `SALE-${s.$id.substring(0, 6)}`,
      Total: s.total
    }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cancelledSales), '09 Cancelled Transactions')

  // Save the workbook
  XLSX.writeFile(wb, `${data.businessName}_Report_${data.yearLabel.replace('/', '_')}.xlsx`)
}
