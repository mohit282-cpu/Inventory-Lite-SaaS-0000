/**
 * Mega Business Report — Analytics computation engine.
 *
 * Builds the MegaAnalyticsData object ONCE from MegaReportData.
 * Both the PDF and Excel generators consume this same object so numbers never diverge.
 *
 * All values are plain finite numbers — no NaN / Infinity / undefined / null.
 * All insights are generated strictly from computed data, never fabricated.
 */

import type {
  MegaReportData,
  MegaAnalyticsData,
  AnalyticsKpiCard,
  AnalyticsTrendPoint,
  AnalyticsCustomerRanking,
  AnalyticsSupplierRanking,
  AnalyticsProductRanking,
  AnalyticsCategoryStock,
  AnalyticsPaymentMetrics,
  AnalyticsVatMetrics,
  AnalyticsProfitability,
  AnalyticsBusinessHealth,
  AnalyticsReconciliationHealth,
  AnalyticsInsights,
  AnalyticsInventoryHealth,
} from '@/types/mega-report'

function fin(v: unknown, fb = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fb
}

function fmtNpr(v: number): string {
  const n = fin(v)
  return `Rs. ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(v: number): string {
  return `${fin(v).toFixed(1)}%`
}

function fmtInt(v: number): string {
  return fin(v).toLocaleString('en-US')
}

/** Build the complete analytics object from report data. */
export function buildMegaAnalytics(data: MegaReportData): MegaAnalyticsData {
  return {
    kpiCards: buildKpiCards(data),
    salesTrend: buildSalesTrend(data),
    dailySales: buildDailySales(data),
    customerRanking: buildCustomerRanking(data),
    supplierRanking: buildSupplierRanking(data),
    productRanking: buildProductRanking(data),
    categoryStock: buildCategoryStock(data),
    purchaseBySupplier: buildPurchaseBySupplier(data),
    paymentMetrics: buildPaymentMetrics(data),
    vatMetrics: buildVatMetrics(data),
    profitability: buildProfitabilityMetrics(data),
    businessHealth: buildBusinessHealth(data),
    reconciliationHealth: buildReconciliationHealth(data),
    inventoryHealth: buildInventoryHealth(data),
    insights: buildInsights(data),
  }
}

function buildKpiCards(data: MegaReportData): AnalyticsKpiCard[] {
  const k = data.kpis
  const p = data.profitability
  return [
    { label: 'TOTAL SALES', value: k.totalSales, formattedValue: fmtNpr(k.totalSales), caption: `${fmtInt(k.totalSalesCount)} invoices` },
    { label: 'NET SALES', value: p.netSales, formattedValue: fmtNpr(p.netSales) },
    { label: 'TOTAL PURCHASES', value: k.totalPurchases, formattedValue: fmtNpr(k.totalPurchases), caption: `${fmtInt(k.totalPurchaseCount)} purchases` },
    { label: 'COGS', value: k.cogs, formattedValue: fmtNpr(k.cogs) },
    { label: 'GROSS PROFIT', value: k.grossProfit, formattedValue: fmtNpr(k.grossProfit), caption: `Margin: ${fmtPct(p.grossMarginPercent)}` },
    { label: 'NET PROFIT', value: k.netProfit, formattedValue: fmtNpr(k.netProfit), caption: `Margin: ${fmtPct(p.netMarginPercent)}` },
    { label: 'GROSS MARGIN', value: p.grossMarginPercent, formattedValue: fmtPct(p.grossMarginPercent) },
    { label: 'NET MARGIN', value: p.netMarginPercent, formattedValue: fmtPct(p.netMarginPercent) },
    { label: 'TOTAL EXPENSES', value: k.expenses, formattedValue: fmtNpr(k.expenses) },
    { label: 'STOCK VALUE', value: k.stockValue, formattedValue: fmtNpr(k.stockValue) },
    { label: 'RECEIVABLES', value: k.outstandingCustomerCredit, formattedValue: fmtNpr(k.outstandingCustomerCredit) },
    { label: 'PAYABLES', value: k.supplierPayables, formattedValue: fmtNpr(k.supplierPayables) },
    { label: 'OUTPUT VAT', value: k.outputVat, formattedValue: fmtNpr(k.outputVat) },
    { label: 'INPUT VAT', value: k.inputVat, formattedValue: fmtNpr(k.inputVat) },
  ]
}

function buildSalesTrend(data: MegaReportData): AnalyticsTrendPoint[] {
  const map = new Map<string, { sales: number; purchases: number }>()
  const keyOf = (dateStr: string): string => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const labelOf = (key: string): string => {
    const parts = key.split('-')
    return `${parts[0].slice(2)}-${parts[1]}`
  }

  data.salesRegister.rows.forEach((r) => {
    const key = keyOf(r.date)
    if (!key) return
    const e = map.get(key) || { sales: 0, purchases: 0 }
    e.sales += fin(r.total)
    map.set(key, e)
  })
  data.purchaseRegister.rows.forEach((r) => {
    const key = keyOf(r.date)
    if (!key) return
    const e = map.get(key) || { sales: 0, purchases: 0 }
    e.purchases += fin(r.taxableAmount)
    map.set(key, e)
  })

  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, 12)
    .map(([key, v]) => ({ label: labelOf(key), sales: v.sales, purchases: v.purchases }))
}

function buildDailySales(data: MegaReportData): Array<{ label: string; value: number }> {
  const map = new Map<string, number>()
  data.salesRegister.rows.forEach((r) => {
    const key = r.date.slice(0, 10)
    if (!key) return
    map.set(key, (map.get(key) || 0) + fin(r.total))
  })
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([label, value]) => ({ label, value }))
}

function buildCustomerRanking(data: MegaReportData): AnalyticsCustomerRanking[] {
  const ranking = new Map<string, AnalyticsCustomerRanking>()
  data.salesRegister.rows.forEach((r) => {
    const name = r.customerName || 'Walk-in Customer'
    const e = ranking.get(name) || { name, invoiceCount: 0, revenue: 0, paid: 0, outstanding: 0, contribution: 0 }
    e.invoiceCount++
    e.revenue += fin(r.total)
    e.paid += fin(r.paidAmount)
    e.outstanding += fin(r.outstanding)
    ranking.set(name, e)
  })

  const totalSales = data.kpis.totalSales || 1
  return [...ranking.values()]
    .map((r) => ({ ...r, contribution: (r.revenue / totalSales) * 100 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20)
}

function buildSupplierRanking(data: MegaReportData): AnalyticsSupplierRanking[] {
  const ranking = new Map<string, AnalyticsSupplierRanking>()
  data.purchaseRegister.rows.forEach((r) => {
    const name = r.supplierName || 'Unknown'
    const e = ranking.get(name) || { name, purchaseCount: 0, totalPurchases: 0, paid: 0, outstanding: 0 }
    e.purchaseCount++
    e.totalPurchases += fin(r.total)
    e.paid += fin(r.paidAmount)
    e.outstanding += fin(r.outstanding)
    ranking.set(name, e)
  })
  return [...ranking.values()].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 20)
}

function buildProductRanking(data: MegaReportData): AnalyticsProductRanking[] {
  return data.inventory.products
    .map((p) => ({
      name: p.name,
      sku: p.sku,
      categoryName: p.categoryName || 'Uncategorized',
      stockQuantity: fin(p.stockQuantity),
      unitCost: fin(p.unitCost),
      sellingPrice: fin(p.sellingPrice),
      closingValue: fin(p.closingInventoryValue),
      retailValue: fin(p.retailValue),
      potentialMargin: fin(p.potentialGrossMargin),
    }))
    .sort((a, b) => b.closingValue - a.closingValue)
}

function buildCategoryStock(data: MegaReportData): AnalyticsCategoryStock[] {
  const map = new Map<string, AnalyticsCategoryStock>()
  data.inventory.products.forEach((p) => {
    const cat = p.categoryName || 'Uncategorized'
    const e = map.get(cat) || { name: cat, productCount: 0, totalQuantity: 0, totalCostValue: 0, totalRetailValue: 0 }
    e.productCount++
    e.totalQuantity += fin(p.stockQuantity)
    e.totalCostValue += fin(p.closingInventoryValue)
    e.totalRetailValue += fin(p.retailValue)
    map.set(cat, e)
  })
  return [...map.values()].sort((a, b) => b.totalCostValue - a.totalCostValue)
}

function buildPurchaseBySupplier(data: MegaReportData): Array<{ label: string; value: number }> {
  const map = new Map<string, number>()
  data.purchaseRegister.rows.forEach((r) => {
    const name = r.supplierName || 'Unknown'
    map.set(name, (map.get(name) || 0) + fin(r.total))
  })
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function buildPaymentMetrics(data: MegaReportData): AnalyticsPaymentMetrics {
  const custPayments = data.paymentsDetail.filter((p) => p.entityType === 'customer')
  const supPayments = data.paymentsDetail.filter((p) => p.entityType === 'supplier')
  const totalCollected = custPayments.reduce((a, p) => a + fin(p.amount), 0)
  const totalPaidToSuppliers = supPayments.reduce((a, p) => a + fin(p.amount), 0)
  const customerReceivables = data.kpis.outstandingCustomerCredit
  const supplierPayables = data.kpis.supplierPayables

  const totalSales = data.kpis.totalSales || 1
  const totalPurchases = data.kpis.totalPurchases || 1
  const collectionRate = ((totalSales - customerReceivables) / totalSales) * 100
  const paymentRate = ((totalPurchases - supplierPayables) / totalPurchases) * 100

  return {
    totalCollected,
    totalPaidToSuppliers,
    customerReceivables,
    supplierPayables,
    collectionRate: fin(collectionRate),
    paymentRate: fin(paymentRate),
  }
}

function buildVatMetrics(data: MegaReportData): AnalyticsVatMetrics {
  const v = data.vatSummary
  return {
    taxableSales: fin(v.taxableSales),
    outputVat: fin(v.outputVat),
    taxablePurchases: fin(v.taxablePurchases),
    inputVat: fin(v.inputVat),
    netVatPosition: fin(v.netVatPosition),
    vatRate: fin(v.vatRate),
    status: v.status,
    isPayable: v.status === 'PAYABLE',
  }
}

function buildProfitabilityMetrics(data: MegaReportData): AnalyticsProfitability {
  const p = data.profitability
  const netSales = fin(p.netSales) || 1
  return {
    grossSales: fin(p.grossSales),
    discounts: fin(p.discounts),
    salesReturns: fin(p.salesReturns),
    netSales: fin(p.netSales),
    cogs: fin(p.cogs),
    grossProfit: fin(p.grossProfit),
    grossMarginPercent: fin(p.grossMarginPercent),
    expenses: fin(p.expenses),
    netProfit: fin(p.netProfit),
    netMarginPercent: fin(p.netMarginPercent),
    cogsPercent: (fin(p.cogs) / netSales) * 100,
    expenseRatio: (fin(p.expenses) / netSales) * 100,
  }
}

function buildBusinessHealth(data: MegaReportData): AnalyticsBusinessHealth {
  const p = data.profitability
  const k = data.kpis
  const inv = data.inventory

  const profitability: AnalyticsBusinessHealth['profitability'] =
    p.grossMarginPercent >= 30 ? 'Strong' : p.grossMarginPercent >= 15 ? 'Normal' : 'Attention'
  const profitabilityDetail = `Gross margin ${fmtPct(p.grossMarginPercent)}, Net margin ${fmtPct(p.netMarginPercent)}`

  const netPosition = k.outstandingCustomerCredit - k.supplierPayables
  const liquidity: AnalyticsBusinessHealth['liquidity'] = netPosition >= 0 ? 'Strong' : netPosition > -10000 ? 'Normal' : 'Attention'
  const liquidityDetail = `Receivables ${fmtNpr(k.outstandingCustomerCredit)} vs Payables ${fmtNpr(k.supplierPayables)}`

  const totalStockValue = inv.summary.closingStockValue
  const lowStock = inv.summary.lowStockCount
  const outOfStock = inv.summary.outOfStockCount
  const inventoryStatus: AnalyticsBusinessHealth['inventory'] = outOfStock > 0 ? 'Attention' : lowStock > 0 ? 'Normal' : 'Strong'
  const inventoryDetail = outOfStock > 0
    ? `${outOfStock} item(s) out of stock, ${fmtNpr(totalStockValue)} value`
    : lowStock > 0
      ? `${lowStock} item(s) below minimum stock`
      : `Healthy: ${fmtInt(inv.products.length)} products`

  const receivables: AnalyticsBusinessHealth['receivables'] = k.outstandingCustomerCredit > 0 ? 'Normal' : 'Strong'
  const receivablesDetail = k.outstandingCustomerCredit > 0
    ? `Outstanding receivables: ${fmtNpr(k.outstandingCustomerCredit)}`
    : 'No outstanding customer receivables'

  const payables: AnalyticsBusinessHealth['payables'] = k.supplierPayables > 0 ? 'Normal' : 'Strong'
  const payablesDetail = k.supplierPayables > 0
    ? `Outstanding payables: ${fmtNpr(k.supplierPayables)}`
    : 'No outstanding supplier payables'

  const warnings = data.reconciliation.filter((r) => r.status !== 'BALANCED').length
  const dataIntegrity: AnalyticsBusinessHealth['dataIntegrity'] = warnings === 0 ? 'Healthy' : warnings <= 1 ? 'Warning' : 'Critical'
  const dataIntegrityDetail = warnings === 0
    ? 'All reconciliation checks passed'
    : `${warnings} reconciliation check(s) require attention`

  return {
    profitability,
    profitabilityDetail,
    liquidity,
    liquidityDetail,
    inventory: inventoryStatus,
    inventoryDetail,
    receivables,
    receivablesDetail,
    payables,
    payablesDetail,
    dataIntegrity,
    dataIntegrityDetail,
  }
}

function buildReconciliationHealth(data: MegaReportData): AnalyticsReconciliationHealth {
  const checks = data.reconciliation
  const warningDetails = checks
    .filter((r) => r.status !== 'BALANCED')
    .map((r) => `${r.checkName}: Expected ${fmtNpr(r.expected)}, Actual ${fmtNpr(r.actual)}, Diff ${fmtNpr(r.difference)}`)

  return {
    totalChecks: checks.length,
    passed: checks.filter((r) => r.status === 'BALANCED').length,
    warnings: checks.filter((r) => r.status === 'WARNING').length,
    mismatches: checks.filter((r) => r.status === 'MISMATCH').length,
    warningDetails,
  }
}

function buildInventoryHealth(data: MegaReportData): AnalyticsInventoryHealth {
  const products = data.inventory.products
  const movements = data.inventory.movements

  // Low-stock thresholds come from the product master, matched by SKU/name.
  const thresholdByKey = new Map<string, number>()
  data.products.forEach((p) => {
    let key = p.sku || ''
    if (!key && p.name) key = p.name
    if (!key) return
    if (typeof p.lowStockThreshold === 'number' && p.lowStockThreshold > 0) {
      thresholdByKey.set(key, p.lowStockThreshold)
    }
  })

  const movementCounts = new Map<string, number>()
  movements.forEach((m) => {
    const key = m.sku || m.productName
    movementCounts.set(key, (movementCounts.get(key) || 0) + 1)
  })

  const fastMoving: AnalyticsInventoryHealth['fastMoving'] = []
  const slowMoving: AnalyticsInventoryHealth['slowMoving'] = []
  const noMovement: AnalyticsInventoryHealth['noMovement'] = []
  const lowStock: AnalyticsInventoryHealth['lowStock'] = []
  const outOfStock: AnalyticsInventoryHealth['outOfStock'] = []

  products.forEach((p) => {
    const mvmts = movementCounts.get(p.sku) || 0
    const item = { name: p.name, sku: p.sku, quantity: fin(p.stockQuantity) }
    const threshold = thresholdByKey.get(p.sku) ?? thresholdByKey.get(p.name)

    if (fin(p.stockQuantity) <= 0) {
      outOfStock.push({ name: p.name, sku: p.sku })
    } else if (threshold !== undefined && fin(p.stockQuantity) <= threshold) {
      lowStock.push({ ...item, threshold })
    }

    if (mvmts >= 3) fastMoving.push({ ...item, movements: mvmts })
    else if (mvmts >= 1) slowMoving.push({ ...item, movements: mvmts })
    else noMovement.push(item)
  })

  return { fastMoving, slowMoving, noMovement, lowStock, outOfStock }
}

function buildInsights(data: MegaReportData): AnalyticsInsights {
  const k = data.kpis
  const p = data.profitability
  const inv = data.inventory
  const v = data.vatSummary
  const custLedgers = data.customerLedgers
  const supLedgers = data.supplierLedgers

  const performanceOverview: string[] = []
  const salesInsights: string[] = []
  const profitabilityInsights: string[] = []
  const inventoryInsights: string[] = []
  const customerInsights: string[] = []
  const supplierInsights: string[] = []
  const financialHealth: string[] = []
  const dataQuality: string[] = []

  // Performance Overview
  performanceOverview.push(
    `Sales totaled ${fmtNpr(k.totalSales)} across ${fmtInt(k.totalSalesCount)} invoice(s) for the selected period.`
  )
  if (k.totalPurchaseCount > 0) {
    performanceOverview.push(
      `Purchases totaled ${fmtNpr(k.totalPurchases)} across ${fmtInt(k.totalPurchaseCount)} purchase(s).`
    )
  }
  performanceOverview.push(
    `Net profit was ${fmtNpr(k.netProfit)} with a net margin of ${fmtPct(p.netMarginPercent)}.`
  )

  // Sales Insights
  salesInsights.push(`Total sales: ${fmtNpr(k.totalSales)}.`)
  if (k.salesReturns > 0) {
    salesInsights.push(`Sales returns: ${fmtNpr(k.salesReturns)}.`)
  }
  if (k.totalSalesCount > 0) {
    salesInsights.push(`Average invoice value: ${fmtNpr(k.totalSales / k.totalSalesCount)}.`)
  }

  // Profitability Insights
  profitabilityInsights.push(`Gross profit was ${fmtNpr(k.grossProfit)} (gross margin ${fmtPct(p.grossMarginPercent)}).`)
  profitabilityInsights.push(`Operating expenses: ${fmtNpr(k.expenses)}.`)
  const marginDiff = inv.summary.totalRetailValue - inv.summary.closingStockValue
  if (marginDiff > 0) {
    profitabilityInsights.push(`Inventory retail value exceeds cost value by ${fmtNpr(marginDiff)}.`)
  }

  // Inventory Insights
  inventoryInsights.push(`Closing inventory value: ${fmtNpr(inv.summary.closingStockValue)}.`)
  inventoryInsights.push(`Total retail value: ${fmtNpr(inv.summary.totalRetailValue)}.`)
  if (inv.summary.lowStockCount > 0) {
    inventoryInsights.push(`${inv.summary.lowStockCount} product(s) are below minimum stock level.`)
  }
  if (inv.summary.outOfStockCount > 0) {
    inventoryInsights.push(`${inv.summary.outOfStockCount} product(s) are out of stock.`)
  }

  // Customer Insights
  const customersWithBalance = custLedgers.filter((c) => c.outstandingAmount > 0.005)
  customerInsights.push(`${custLedgers.length} customer(s) in the ledger.`)
  if (customersWithBalance.length > 0) {
    customerInsights.push(`${customersWithBalance.length} customer(s) have outstanding balances totaling ${fmtNpr(k.outstandingCustomerCredit)}.`)
  } else {
    customerInsights.push('All customer accounts are fully settled.')
  }

  // Supplier Insights
  const suppliersWithBalance = supLedgers.filter((s) => s.closingPayable > 0.005)
  supplierInsights.push(`${supLedgers.length} supplier(s) in the ledger.`)
  if (suppliersWithBalance.length > 0) {
    supplierInsights.push(`${suppliersWithBalance.length} supplier(s) have outstanding payables totaling ${fmtNpr(k.supplierPayables)}.`)
  } else {
    supplierInsights.push('All supplier accounts are fully settled.')
  }

  // Financial Health
  financialHealth.push(`Receivables: ${fmtNpr(k.outstandingCustomerCredit)}.`)
  financialHealth.push(`Payables: ${fmtNpr(k.supplierPayables)}.`)
  if (v.status === 'PAYABLE') {
    financialHealth.push(`VAT payable: ${fmtNpr(v.netVatPosition)}.`)
  } else {
    financialHealth.push(`VAT credit: ${fmtNpr(Math.abs(v.netVatPosition))}.`)
  }

  // Data Quality
  const warnings = data.reconciliation.filter((r) => r.status !== 'BALANCED').length
  dataQuality.push(`${data.reconciliation.length} reconciliation check(s) performed.`)
  if (warnings > 0) {
    dataQuality.push(`${warnings} check(s) require attention.`)
  } else {
    dataQuality.push('All checks passed.')
  }
  if (k.costDataMissingCount > 0) {
    dataQuality.push(`${k.costDataMissingCount} product(s) missing cost data.`)
  }

  return {
    performanceOverview,
    salesInsights,
    profitabilityInsights,
    inventoryInsights,
    customerInsights,
    supplierInsights,
    financialHealth,
    dataQuality,
  }
}
