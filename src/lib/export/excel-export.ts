import ExcelJS from 'exceljs'
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

export async function exportToExcel(data: ExportDataPayload): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Inventory Lite SaaS'
  workbook.created = new Date()

  // 01 Executive Summary
  const s1 = workbook.addWorksheet('01 Executive Summary')
  s1.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ]
  const execSummary = [
    { metric: 'Total Revenue', value: data.profitReport.totalRevenue },
    { metric: 'Cost of Goods Sold (COGS)', value: data.profitReport.cogs },
    { metric: 'Gross Profit', value: data.profitReport.grossProfit },
    { metric: 'Total Expenses', value: data.profitReport.totalExpenses },
    { metric: 'Net Profit', value: data.profitReport.netProfit },
    { metric: 'Net Margin %', value: data.profitReport.netMarginPercent },
    { metric: 'Total Sales Count', value: data.profitReport.totalSalesCount },
    { metric: 'Total Customers', value: data.customers.length },
    { metric: 'Total Products', value: data.products.length },
  ]
  execSummary.forEach((row) => s1.addRow(row))

  // 02 Monthly Summary
  const s2 = workbook.addWorksheet('02 Monthly Summary')
  if (data.monthlyData && data.monthlyData.length > 0) {
    const keys = Object.keys(data.monthlyData[0])
    s2.columns = keys.map((k) => ({ header: k, key: k, width: 20 }))
    data.monthlyData.forEach((row) => s2.addRow(row as any))
  }

  // 03 Sales Register
  const s3 = workbook.addWorksheet('03 Sales Register')
  s3.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Sale Number', key: 'saleNumber', width: 20 },
    { header: 'Invoice #', key: 'invoiceNumber', width: 20 },
    { header: 'Method', key: 'method', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Total', key: 'total', width: 15 },
  ]
  data.sales
    .filter((s) => s.status !== 'cancelled')
    .forEach((s) => {
      s3.addRow({
        date: new Date(s.createdAt).toLocaleDateString(),
        saleNumber: s.saleNumber || '-',
        invoiceNumber: data.invoices.find((i) => i.$id === s.invoiceId)?.invoiceNumber || '-',
        method: s.paymentMethod,
        status: s.status,
        total: s.total,
      })
    })

  // 04 Invoice Register
  const s4 = workbook.addWorksheet('04 Invoice Register')
  s4.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
    { header: 'Sale #', key: 'saleNumber', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
  ]
  data.invoices.forEach((i) => {
    s4.addRow({
      date: new Date(i.createdAt).toLocaleDateString(),
      invoiceNumber: i.invoiceNumber,
      saleNumber: data.sales.find((s) => s.$id === i.saleId)?.saleNumber || '-',
      status: i.status,
    })
  })

  // 05 Payment Reconciliation
  const s5 = workbook.addWorksheet('05 Payment Reconciliation')
  s5.columns = [
    { header: 'Payment Method', key: 'name', width: 25 },
    { header: 'Transactions Count', key: 'count', width: 20 },
    { header: 'Total Collected', key: 'total', width: 20 },
  ]
  data.paymentMethods.forEach((p) => {
    s5.addRow({
      name: p.name,
      count: p.count,
      total: p.total,
    })
  })

  // 06 Receivables
  const s6 = workbook.addWorksheet('06 Receivables')
  s6.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Phone', key: 'phone', width: 20 },
    { header: 'Total Due', key: 'totalDue', width: 15 },
  ]
  data.customers
    .filter((c) => (c.totalDue || 0) > 0)
    .forEach((c) => {
      s6.addRow({
        name: c.name,
        phone: c.phone || '',
        totalDue: c.totalDue,
      })
    })

  // 07 Inventory
  const s7 = workbook.addWorksheet('07 Inventory')
  s7.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'SKU', key: 'sku', width: 15 },
    { header: 'Stock Qty', key: 'stockQuantity', width: 15 },
    { header: 'Cost Price', key: 'purchasePrice', width: 15 },
    { header: 'Selling Price', key: 'sellingPrice', width: 15 },
    { header: 'Total Value (Cost)', key: 'totalValue', width: 20 },
  ]
  data.products.forEach((p) => {
    s7.addRow({
      name: p.name,
      sku: p.sku || '',
      stockQuantity: p.stockQuantity || 0,
      purchasePrice: p.purchasePrice || 0,
      sellingPrice: p.sellingPrice || 0,
      totalValue: (p.stockQuantity || 0) * (p.purchasePrice || 0),
    })
  })

  // 08 Expenses
  const s8 = workbook.addWorksheet('08 Expenses')
  s8.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Amount', key: 'amount', width: 15 },
  ]
  data.expenses.forEach((e) => {
    s8.addRow({
      date: new Date(e.date || e.createdAt).toLocaleDateString(),
      category: e.category,
      title: e.title || e.description || '',
      amount: e.amount,
    })
  })

  // 09 Cancelled Transactions
  const s9 = workbook.addWorksheet('09 Cancelled Transactions')
  s9.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Sale Number', key: 'saleNumber', width: 20 },
    { header: 'Total', key: 'total', width: 15 },
  ]
  data.sales
    .filter((s) => s.status === 'cancelled')
    .forEach((s) => {
      s9.addRow({
        date: new Date(s.createdAt).toLocaleDateString(),
        saleNumber: s.saleNumber || `SALE-${s.$id.substring(0, 6)}`,
        total: s.total,
      })
    })

  // Trigger browser download via buffer
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.businessName}_Report_${data.yearLabel.replace('/', '_')}.xlsx`
  a.click()
  window.URL.revokeObjectURL(url)
}

