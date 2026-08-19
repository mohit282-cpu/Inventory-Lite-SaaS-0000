import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyticsService } from '@/services/analytics.service'
import { productService } from '@/services/product.service'
import { customerService } from '@/services/customer.service'
import { saleService } from '@/services/sale.service'
import { saleItemService } from '@/services/sale-item.service'
import { expenseService } from '@/services/expense.service'

vi.mock('@/services/product.service', () => ({
  productService: {
    listProducts: vi.fn(),
  },
}))

vi.mock('@/services/customer.service', () => ({
  customerService: {
    listCustomers: vi.fn(),
  },
}))

vi.mock('@/services/sale.service', () => ({
  saleService: {
    listSales: vi.fn(),
  },
}))

vi.mock('@/services/sale-item.service', () => ({
  saleItemService: {
    listSaleItems: vi.fn(),
  },
}))

vi.mock('@/services/expense.service', () => ({
  expenseService: {
    listExpenses: vi.fn(),
    getExpenseSummary: vi.fn().mockResolvedValue({ todayExpenses: 0, thisMonthExpenses: 0, totalExpenses: 0 }),
  },
}))

describe('Analytics & Reports System', () => {
  const businessId = 'bus_report_test_001'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dashboard Metrics Computation', () => {
    it('should accurately aggregate product stock statuses and customer dues', async () => {
      const todayISO = new Date().toISOString()

      vi.mocked(productService.listProducts).mockResolvedValueOnce([
        { $id: 'p1', name: 'Prod 1', stockQuantity: 10, lowStockThreshold: 5 } as any,
        { $id: 'p2', name: 'Prod 2', stockQuantity: 3, lowStockThreshold: 5 } as any,
        { $id: 'p3', name: 'Prod 3', stockQuantity: 0, lowStockThreshold: 5 } as any,
      ])

      vi.mocked(customerService.listCustomers).mockResolvedValueOnce([
        { $id: 'c1', name: 'Cust 1', totalDue: 1500 } as any,
        { $id: 'c2', name: 'Cust 2', totalDue: 2500 } as any,
      ])

      vi.mocked(saleService.listSales).mockResolvedValueOnce([
        { $id: 's1', total: 5000, createdAt: todayISO } as any,
      ])

      const metrics = await analyticsService.getDashboardMetrics(businessId)

      expect(metrics.totalProducts).toBe(3)
      expect(metrics.lowStockProducts).toBe(1)
      expect(metrics.outOfStockProducts).toBe(1)
      expect(metrics.totalCustomers).toBe(2)
      expect(metrics.totalDue).toBe(4000)
      expect(metrics.todaySales).toBe(5000)
    })
  })

  describe('Executive Net Profit Statement', () => {
    it('should compute Net Profit = Revenue - COGS - Expenses', async () => {
      vi.mocked(saleService.listSales).mockResolvedValueOnce([
        { $id: 'sale_1', total: 10000, createdAt: '2026-08-19T10:00:00.000Z' } as any,
      ])

      vi.mocked(productService.listProducts).mockResolvedValueOnce([
        { $id: 'prod_keyboard', purchasePrice: 2000 } as any,
      ])

      vi.mocked(expenseService.listExpenses).mockResolvedValueOnce([
        { $id: 'exp_1', amount: 1500 } as any,
      ])

      vi.mocked(saleItemService.listSaleItems).mockResolvedValueOnce([
        { $id: 'item_1', productId: 'prod_keyboard', quantity: 2 } as any,
      ])

      const profit = await analyticsService.getProfitEstimateReport(businessId)

      // Total Revenue = 10000
      // COGS = 2 * 2000 = 4000
      // Gross Profit = 10000 - 4000 = 6000
      // Expenses = 1500
      // Net Profit = 6000 - 1500 = 4500
      expect(profit.totalRevenue).toBe(10000)
      expect(profit.cogs).toBe(4000)
      expect(profit.grossProfit).toBe(6000)
      expect(profit.totalExpenses).toBe(1500)
      expect(profit.netProfit).toBe(4500)
      expect(profit.netMarginPercent).toBe(45)
    })
  })
})
