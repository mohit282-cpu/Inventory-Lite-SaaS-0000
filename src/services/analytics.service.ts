import { productService } from './product.service'
import { customerService } from './customer.service'
import { saleService } from './sale.service'
import { saleItemService } from './sale-item.service'
import { expenseService } from './expense.service'

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
}

export class AnalyticsService {
  /**
   * Get core real-time dashboard KPIs for a business (P2 completeness: query full dataset)
   */
  async getDashboardMetrics(businessId: string): Promise<DashboardMetrics> {
    const [products, customers, sales, expenseSum] = await Promise.all([
      productService.listProducts(businessId, { limit: 500 }),
      customerService.listCustomers(businessId, { limit: 500 }),
      saleService.listSales(businessId, { limit: 500 }),
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
    const sales = await saleService.listSales(businessId, { limit: 500 })

    // Build map for the last `days` days
    const dateMap = new Map<string, { revenue: number; count: number }>()
    const now = new Date()

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
    const sales = await saleService.listSales(businessId, { limit: 100 })
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
    const sales = await saleService.listSales(businessId, { limit: 500 })

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
   * Get Net Profit Estimate Report
   */
  async getProfitEstimateReport(
    businessId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ProfitEstimateReport> {
    const [sales, products, expenses] = await Promise.all([
      saleService.listSales(businessId, { limit: 500 }),
      productService.listProducts(businessId, { limit: 500 }),
      expenseService.listExpenses(businessId, { limit: 500 }),
    ])

    const productPurchaseMap = new Map<string, number>()
    for (const p of products) {
      productPurchaseMap.set(p.$id, p.purchasePrice || 0)
    }

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

    let totalRevenue = 0
    let cogs = 0

    for (const sale of filteredSales) {
      totalRevenue += sale.total || 0
      try {
        const items = await saleItemService.listSaleItems(sale.$id, businessId)
        for (const item of items) {
          const unitCost = productPurchaseMap.get(item.productId) || 0
          cogs += (item.quantity || 0) * unitCost
        }
      } catch (err) {
        console.warn(`Could not calculate COGS for sale ${sale.$id}:`, err)
      }
    }

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const grossProfit = totalRevenue - cogs
    const netProfit = grossProfit - totalExpenses
    const netMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      netMarginPercent: Math.round(netMarginPercent * 10) / 10,
      totalSalesCount: filteredSales.length,
    }
  }
}

export const analyticsService = new AnalyticsService()
