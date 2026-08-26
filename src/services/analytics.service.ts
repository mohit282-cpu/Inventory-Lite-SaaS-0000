import { productService } from './product.service'
import { customerService } from './customer.service'
import { saleService } from './sale.service'
import { saleItemService } from './sale-item.service'
import { expenseService } from './expense.service'
import { categoryService } from './category.service'

export interface DashboardMetrics {
  todaySales: number
  thisMonthSales: number
  todayExpenses: number
  thisMonthExpenses: number
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  totalCustomers: number
  totalDue: number
}

export interface SalesChartPoint {
  date: string
  revenue: number
  count: number
}

export interface TopProductPoint {
  name: string
  quantity: number
  revenue: number
}

export interface PaymentMethodPoint {
  method: string
  name: string
  count: number
  total: number
}

export interface ProfitEstimateReport {
  totalRevenue: number
  cogs: number
  grossProfit: number
  totalExpenses: number
  netProfit: number
  netMarginPercent: number
  totalSalesCount: number
  hasCostDataError?: boolean
}

export interface ProductProfitBreakdown {
  productId: string
  productName: string
  categoryName: string
  unitsSold: number
  unitsReturned: number
  netUnitsSold: number
  revenue: number
  cogs: number
  grossProfit: number
  marginPercent: number
}

export interface CategoryProfitBreakdown {
  categoryId: string
  categoryName: string
  revenue: number
  cogs: number
  grossProfit: number
  marginPercent: number
}

export interface DetailedProfitReport extends ProfitEstimateReport {
  grossSales: number
  salesReturns: number
  netSales: number
  cogs: number
  grossProfit: number
  totalExpenses: number
  netProfit: number
  netMarginPercent: number
  productBreakdown: ProductProfitBreakdown[]
  categoryBreakdown: CategoryProfitBreakdown[]
}

export class AnalyticsService {
  /**
   * Get core real-time dashboard KPIs for a business (P2 completeness: query full dataset)
   */
  async getDashboardMetrics(businessId: string): Promise<DashboardMetrics> {
    const [products, customers, sales, expenseSum] = await Promise.all([
      productService.listAllProducts(businessId),
      customerService.listAllCustomers(businessId),
      saleService.listAllSales(businessId),
      expenseService.getExpenseSummary(businessId),
    ])

    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const monthStr = now.toISOString().slice(0, 7)

    let todaySales = 0
    let thisMonthSales = 0

    for (const sale of sales) {
      if (sale.status === 'cancelled') continue
      const saleDate = (sale.createdAt || '').slice(0, 10)
      const saleMonth = (sale.createdAt || '').slice(0, 7)

      if (saleDate === todayStr) {
        todaySales += sale.total || 0
      }
      if (saleMonth === monthStr) {
        thisMonthSales += sale.total || 0
      }
    }

    let lowStockProducts = 0
    let outOfStockProducts = 0

    for (const prod of products) {
      const qty = prod.stockQuantity || 0
      const threshold = prod.lowStockThreshold ?? 5
      if (qty === 0) {
        outOfStockProducts++
      } else if (qty <= threshold) {
        lowStockProducts++
      }
    }

    const totalDue = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0)

    return {
      todaySales: Math.round(todaySales * 100) / 100,
      thisMonthSales: Math.round(thisMonthSales * 100) / 100,
      todayExpenses: expenseSum.todayExpenses,
      thisMonthExpenses: expenseSum.thisMonthExpenses,
      totalProducts: products.length,
      lowStockProducts,
      outOfStockProducts,
      totalCustomers: customers.length,
      totalDue: Math.round(totalDue * 100) / 100,
    }
  }

  /**
   * Get sales trend over time grouped by date
   */
  async getSalesChartData(businessId: string, days = 7): Promise<SalesChartPoint[]> {
    const now = new Date()
    const dFrom = new Date()
    dFrom.setDate(now.getDate() - days)
    const sales = await saleService.listAllSales(businessId, { dateFrom: dFrom.toISOString() })

    // Build map for the last `days` days
    const dateMap = new Map<string, { revenue: number; count: number }>()

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dateMap.set(key, { revenue: 0, count: 0 })
    }

    for (const sale of sales) {
      if (sale.status === 'cancelled') continue
      const key = (sale.createdAt || '').slice(0, 10)
      if (dateMap.has(key)) {
        const curr = dateMap.get(key)!
        curr.revenue += sale.total || 0
        curr.count += 1
      }
    }

    const points: SalesChartPoint[] = []
    for (const [date, val] of dateMap.entries()) {
      const d = new Date(date)
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      points.push({
        date: label,
        revenue: Math.round(val.revenue * 100) / 100,
        count: val.count,
      })
    }

    return points
  }

  /**
   * Get top selling products aggregated from sale item snapshots
   */
  async getTopSellingProducts(businessId: string, limit = 5): Promise<TopProductPoint[]> {
    const sales = await saleService.listAllSales(businessId)
    const productAggMap = new Map<string, { name: string; quantity: number; revenue: number }>()

    for (const sale of sales) {
      if (sale.status === 'cancelled') continue
      try {
        const items = await saleItemService.listSaleItems(sale.$id, businessId)
        for (const item of items) {
          const key = item.productNameSnapshot || item.productId
          const existing = productAggMap.get(key) || {
            name: item.productNameSnapshot || 'Unknown Product',
            quantity: 0,
            revenue: 0,
          }
          existing.quantity += item.quantity || 0
          existing.revenue += item.total || 0
          productAggMap.set(key, existing)
        }
      } catch (err) {
        console.warn(`Could not load sale items for sale ${sale.$id}:`, err)
      }
    }

    const sorted = Array.from(productAggMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)

    return sorted
  }

  /**
   * Get sales distribution by payment method
   */
  async getSalesByPaymentMethod(businessId: string): Promise<PaymentMethodPoint[]> {
    const sales = await saleService.listAllSales(businessId)

    const methodLabels: Record<string, string> = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer / Fonepay',
      card: 'Card Payment',
      digital_wallet: 'Digital Wallet',
      eSewa: 'eSewa',
      Khalti: 'Khalti',
      credit: 'Credit / Udhaar',
      other: 'Other Method',
    }

    const map = new Map<string, { count: number; total: number }>()
    Object.keys(methodLabels).forEach((k) => map.set(k, { count: 0, total: 0 }))

    for (const sale of sales) {
      if (sale.status === 'cancelled') continue
      const method = sale.paymentMethod || 'cash'
      const curr = map.get(method) || { count: 0, total: 0 }
      curr.count += 1
      curr.total += sale.total || 0
      map.set(method, curr)
    }

    const points: PaymentMethodPoint[] = []
    for (const [method, val] of map.entries()) {
      if (val.count > 0 || sales.length === 0) {
        points.push({
          method,
          name: methodLabels[method] || method,
          count: val.count,
          total: Math.round(val.total * 100) / 100,
        })
      }
    }

    return points
  }

  /**
   * Get Net Profit Estimate Report with Sales Return & Product/Category breakdowns
   */
  async getProfitEstimateReport(
    businessId: string,
    startDate?: string,
    endDate?: string
  ): Promise<DetailedProfitReport> {
    let returns: any[] = []
    try {
      const { salesReturnService } = await import('./sales-return.service')
      returns = await salesReturnService.listAllSalesReturns(businessId, { dateFrom: startDate, dateTo: endDate })
    } catch {}

    const [sales, expenses, products, categories] = await Promise.all([
      saleService.listAllSales(businessId, { dateFrom: startDate, dateTo: endDate }),
      expenseService.listAllExpenses(businessId, { dateFrom: startDate, dateTo: endDate }),
      productService.listAllProducts(businessId),
      categoryService.listCategories(businessId),
    ])

    const categoryMap = new Map(categories.map((c) => [c.$id, c.name]))

    let filteredSales = sales.filter((s) => s.status !== 'cancelled')
    let filteredExpenses = expenses

    if (startDate) {
      filteredSales = filteredSales.filter((s) => (s.createdAt || '') >= startDate)
      filteredExpenses = filteredExpenses.filter((e) => (e.date || e.createdAt || '') >= startDate)
    }
    if (endDate) {
      filteredSales = filteredSales.filter((s) => (s.createdAt || '') <= endDate)
      filteredExpenses = filteredExpenses.filter((e) => (e.date || e.createdAt || '') <= endDate)
    }

    let grossSales = 0
    let grossCogs = 0
    let hasCostDataError = false

    const productMap = new Map(products.map((p) => [p.$id, p]))
    const productAgg = new Map<
      string,
      {
        productId: string
        productName: string
        categoryId: string
        unitsSold: number
        unitsReturned: number
        revenue: number
        cogs: number
      }
    >()

    for (const sale of filteredSales) {
      grossSales += sale.total || 0

      try {
        const items = await saleItemService.listSaleItems(sale.$id, businessId)
        for (const item of items) {
          const prod = productMap.get(item.productId)
          const cost = prod ? (prod.costPrice || prod.purchasePrice || 0) : 0
          if (!prod || cost === undefined || cost === null || cost <= 0) {
            hasCostDataError = true
          }
          const itemCogs = (cost || 0) * (item.quantity || 0)
          grossCogs += itemCogs

          const existing = productAgg.get(item.productId) || {
            productId: item.productId,
            productName: item.productNameSnapshot || prod?.name || 'Unknown Product',
            categoryId: prod?.categoryId || 'uncategorized',
            unitsSold: 0,
            unitsReturned: 0,
            revenue: 0,
            cogs: 0,
          }

          existing.unitsSold += item.quantity || 0
          existing.revenue += item.total || 0
          existing.cogs += itemCogs
          productAgg.set(item.productId, existing)
        }
      } catch (err) {
        console.warn(`Could not load sale items for sale ${sale.$id} to calculate COGS`, err)
        hasCostDataError = true
      }
    }

    // Process Sales Returns to reduce Gross Sales & COGS
    let totalSalesReturns = 0
    let returnedCogs = 0

    for (const ret of returns) {
      totalSalesReturns += ret.totalAmount || 0

      try {
        const { salesReturnItemService } = await import('./sales-return.service')
        const retItems = await salesReturnItemService.listReturnItems(ret.$id, businessId)
        for (const ri of retItems) {
          const prod = productMap.get(ri.productId)
          const cost = prod ? (prod.costPrice || prod.purchasePrice || 0) : 0
          const lineRetCogs = (cost || 0) * (ri.quantity || 0)
          returnedCogs += lineRetCogs

          const existing = productAgg.get(ri.productId)
          if (existing) {
            existing.unitsReturned += ri.quantity || 0
            existing.revenue -= ri.total || 0
            existing.cogs -= lineRetCogs
          }
        }
      } catch {}
    }

    const netSales = Math.max(0, grossSales - totalSalesReturns)
    const netCogs = Math.max(0, grossCogs - returnedCogs)
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const grossProfit = netSales - netCogs
    const netProfit = grossProfit - totalExpenses
    const netMarginPercent = netSales > 0 ? (netProfit / netSales) * 100 : 0

    // Build Product & Category profit breakdowns
    const productBreakdown: ProductProfitBreakdown[] = []
    const categoryAgg = new Map<string, { revenue: number; cogs: number; grossProfit: number }>()

    for (const p of productAgg.values()) {
      const netUnits = Math.max(0, p.unitsSold - p.unitsReturned)
      const gp = p.revenue - p.cogs
      const margin = p.revenue > 0 ? (gp / p.revenue) * 100 : 0

      productBreakdown.push({
        productId: p.productId,
        productName: p.productName,
        categoryName: categoryMap.get(p.categoryId) || 'General',
        unitsSold: p.unitsSold,
        unitsReturned: p.unitsReturned,
        netUnitsSold: netUnits,
        revenue: Math.round(p.revenue * 100) / 100,
        cogs: Math.round(p.cogs * 100) / 100,
        grossProfit: Math.round(gp * 100) / 100,
        marginPercent: Math.round(margin * 10) / 10,
      })

      const catKey = p.categoryId || 'uncategorized'
      const catCurr = categoryAgg.get(catKey) || { revenue: 0, cogs: 0, grossProfit: 0 }
      catCurr.revenue += p.revenue
      catCurr.cogs += p.cogs
      catCurr.grossProfit += gp
      categoryAgg.set(catKey, catCurr)
    }

    const categoryBreakdown: CategoryProfitBreakdown[] = []
    for (const [catId, cVal] of categoryAgg.entries()) {
      const margin = cVal.revenue > 0 ? (cVal.grossProfit / cVal.revenue) * 100 : 0
      categoryBreakdown.push({
        categoryId: catId,
        categoryName: categoryMap.get(catId) || 'General / Uncategorized',
        revenue: Math.round(cVal.revenue * 100) / 100,
        cogs: Math.round(cVal.cogs * 100) / 100,
        grossProfit: Math.round(cVal.grossProfit * 100) / 100,
        marginPercent: Math.round(margin * 10) / 10,
      })
    }

    return {
      grossSales: Math.round(grossSales * 100) / 100,
      salesReturns: Math.round(totalSalesReturns * 100) / 100,
      netSales: Math.round(netSales * 100) / 100,
      totalRevenue: Math.round(netSales * 100) / 100,
      cogs: Math.round(netCogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      netMarginPercent: Math.round(netMarginPercent * 10) / 10,
      totalSalesCount: filteredSales.length,
      hasCostDataError,
      productBreakdown,
      categoryBreakdown,
    }
  }
}

export const analyticsService = new AnalyticsService()
