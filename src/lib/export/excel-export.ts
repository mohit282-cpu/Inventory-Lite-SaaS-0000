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
  title?: string
  panNumber?: string
  fiscalYear?: string
  items?: any[]
}

export async function exportToExcel(data: ExportDataPayload | any): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Inventory Lite SaaS'
  workbook.created = new Date()

  const businessName = data.businessName || 'My Business'
  const yearLabel = data.yearLabel || data.fiscalYear || '2081/82'
  const title = data.title || 'Audit Report'

  // Handle Tabular Item Array (Generic Audit Report Export from Export Center)
  if (data.items && Array.isArray(data.items) && data.items.length > 0) {
    const sheet = workbook.addWorksheet(title.slice(0, 31))
    const firstItem = data.items[0]

    if (typeof firstItem === 'object' && firstItem !== null) {
      const keys = Object.keys(firstItem).filter((k) => !k.startsWith('$'))
      // Define number format for known financial columns
      const financialColumns = new Set(['total', 'amount', 'subtotal', 'discount', 'tax', 'vat', 'paidAmount', 'dueAmount', 'outstanding', 'balance', 'openingBalance', 'closingBalance', 'totalValue', 'lineTotal', 'totalPrice', 'costPrice', 'sellingPrice', 'price'])
      sheet.columns = keys.map((k) => ({
        header: k.replace(/([A-Z])/g, ' $1').toUpperCase(),
        key: k,
        width: 22,
        // Apply accounting number format to financial columns (case-insensitive)
        ...(financialColumns.has(k.toLowerCase()) ? { numFmt: 'Rs. #,##0.00' } : {}),
      }))
      data.items.forEach((item: any) => {
        const row = sheet.addRow(item)
        row.eachCell((cell, colIdx) => {
          const colKey = keys[colIdx - 1]
          if (colKey && financialColumns.has(colKey.toLowerCase())) {
            cell.numFmt = 'Rs. #,##0.00'
            if (cell.value instanceof Date) {
              cell.value = 0
            } else if (typeof cell.value === 'string') {
              const parsed = parseFloat(cell.value)
              cell.value = isNaN(parsed) ? 0 : parsed
            }
          }
        })
      })
    } else {
      sheet.columns = [{ header: 'Value', key: 'value', width: 40 }]
      data.items.forEach((item: any) => sheet.addRow({ value: String(item) }))
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${businessName}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
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
  const sales: Sale[] = data.sales || []
  const invoices: Invoice[] = data.invoices || []
  const expenses: Expense[] = data.expenses || []
  const products: Product[] = data.products || []
  const customers: Customer[] = data.customers || []
  const monthlyData: MonthlyData[] = data.monthlyData || []
  const paymentMethods: PaymentMethodPoint[] = data.paymentMethods || []

  // 01 Executive Summary
  const s1 = workbook.addWorksheet('01 Executive Summary')
  s1.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20, numFmt: 'Rs. #,##0.00' },
  ]
  const execSummary = [
    { metric: 'Total Revenue', value: profitReport.totalRevenue },
    { metric: 'Cost of Goods Sold (COGS)', value: profitReport.cogs },
    { metric: 'Gross Profit', value: profitReport.grossProfit },
    { metric: 'Total Expenses', value: profitReport.totalExpenses },
    { metric: 'Net Profit', value: profitReport.netProfit },
    { metric: 'Net Margin %', value: profitReport.netMarginPercent },
    { metric: 'Total Sales Count', value: profitReport.totalSalesCount },
    { metric: 'Total Customers', value: customers.length },
    { metric: 'Total Products', value: products.length },
  ]
  execSummary.forEach((row) => s1.addRow(row))

  // 02 Monthly Summary
  if (monthlyData.length > 0) {
    const s2 = workbook.addWorksheet('02 Monthly Summary')
    const keys = Object.keys(monthlyData[0])
    s2.columns = keys.map((k) => ({ header: k, key: k, width: 20 }))
    monthlyData.forEach((row) => s2.addRow(row as any))
  }

  // 03 Sales Register
  if (sales.length > 0) {
    const s3 = workbook.addWorksheet('03 Sales Register')
    s3.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Sale Number', key: 'saleNumber', width: 20 },
      { header: 'Invoice #', key: 'invoiceNumber', width: 20 },
      { header: 'Method', key: 'method', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total', key: 'total', width: 15, numFmt: 'Rs. #,##0.00' },
    ]
    sales
      .filter((s) => s.status !== 'cancelled')
      .forEach((s) => {
        s3.addRow({
          date: s.createdAt ? s.createdAt.slice(0, 10) : '',
          saleNumber: s.saleNumber || '-',
          invoiceNumber: invoices.find((i) => i.$id === s.invoiceId)?.invoiceNumber || '-',
          method: s.paymentMethod,
          status: s.status,
          total: Number(s.total) || 0,
        })
      })
  }

  // 04 Invoice Register
  if (invoices.length > 0) {
    const s4 = workbook.addWorksheet('04 Invoice Register')
    s4.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
      { header: 'Sale #', key: 'saleNumber', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ]
    invoices.forEach((i) => {
      s4.addRow({
        date: i.createdAt ? i.createdAt.slice(0, 10) : '',
        invoiceNumber: i.invoiceNumber,
        saleNumber: sales.find((s) => s.$id === i.saleId)?.saleNumber || '-',
        status: i.status,
      })
    })
  }

  // 05 Payment Reconciliation
  if (paymentMethods.length > 0) {
    const s5 = workbook.addWorksheet('05 Payment Reconciliation')
    s5.columns = [
      { header: 'Payment Method', key: 'name', width: 25 },
      { header: 'Transactions Count', key: 'count', width: 20 },
      { header: 'Total Collected', key: 'total', width: 20, numFmt: 'Rs. #,##0.00' },
    ]
    paymentMethods.forEach((p) => {
      s5.addRow({
        name: p.name,
        count: p.count,
        total: p.total,
      })
    })
  }

  // 06 Receivables
  if (customers.length > 0) {
    const s6 = workbook.addWorksheet('06 Receivables')
    s6.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Total Due', key: 'totalDue', width: 15, numFmt: 'Rs. #,##0.00' },
    ]
    customers
      .filter((c) => (c.totalDue || 0) > 0)
      .forEach((c) => {
        s6.addRow({
          name: c.name,
          phone: c.phone || '',
          totalDue: c.totalDue,
        })
      })
  }

  // 07 Inventory
  if (products.length > 0) {
    const s7 = workbook.addWorksheet('07 Inventory')
    s7.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Stock Qty', key: 'stockQuantity', width: 15 },
      { header: 'Cost Price', key: 'purchasePrice', width: 15, numFmt: 'Rs. #,##0.00' },
      { header: 'Selling Price', key: 'sellingPrice', width: 15, numFmt: 'Rs. #,##0.00' },
      { header: 'Total Value (Cost)', key: 'totalValue', width: 20, numFmt: 'Rs. #,##0.00' },
    ]
    products.forEach((p) => {
      s7.addRow({
        name: p.name,
        sku: p.sku || '',
        stockQuantity: p.stockQuantity || 0,
        purchasePrice: p.purchasePrice || 0,
        sellingPrice: p.sellingPrice || 0,
        totalValue: (p.stockQuantity || 0) * (p.purchasePrice || 0),
      })
    })
  }

  // 08 Expenses
  if (expenses.length > 0) {
    const s8 = workbook.addWorksheet('08 Expenses')
    s8.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Amount', key: 'amount', width: 15, numFmt: 'Rs. #,##0.00' },
    ]
    expenses.forEach((e) => {
      s8.addRow({
        date: e.date || e.createdAt ? new Date(e.date || e.createdAt).toLocaleDateString() : '',
        category: e.category,
        title: e.title || e.description || '',
        amount: e.amount,
      })
    })
  }

  // Trigger browser download via buffer
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${businessName}_Report_${yearLabel.replace('/', '_')}.xlsx`
  a.click()
  window.URL.revokeObjectURL(url)
}
