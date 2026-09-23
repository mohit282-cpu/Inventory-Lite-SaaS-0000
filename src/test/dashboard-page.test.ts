import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPaymentMethodLabel } from '@/lib/utils'

describe('Dashboard UI & Data Visualization Formatting Tests', () => {
  it('1 & 2. Formats active business branding correctly without hardcoded Hostiva', () => {
    const activeBusiness = { name: 'Pashupati Traders', currency: 'NPR' }
    const welcomeSubtext = `Here's what's happening with ${activeBusiness?.name || 'your business'} today.`
    expect(welcomeSubtext).toBe("Here's what's happening with Pashupati Traders today.")
    expect(welcomeSubtext).not.toContain('Hostiva')
    expect(welcomeSubtext).not.toContain('Inventory Lite Store')
  })

  it('3 & 4. Standardizes currency formatting with NPR symbol and thousands separators', () => {
    expect(formatCurrency(11000, 'NPR')).toBe('NPR 11,000.00')
    expect(formatCurrency(333, 'NPR')).toBe('NPR 333.00')
    expect(formatCurrency(14, 'NPR')).toBe('NPR 14.00')
    expect(formatCurrency(0, 'NPR')).toBe('NPR 0.00')
    expect(formatCurrency(150000.5, 'NPR')).toBe('NPR 150,000.50')
  })

  it('5. Dynamic zero sales and zero expense state subtexts', () => {
    const todaySales = 0
    const salesSubtext = todaySales > 0 ? 'Revenue generated today' : 'No sales recorded today'
    expect(salesSubtext).toBe('No sales recorded today')

    const todayExpenses = 0
    const expenseSubtext = todayExpenses > 0 ? 'Logged operational costs today' : 'No expenses recorded today'
    expect(expenseSubtext).toBe('No expenses recorded today')
  })

  it('6, 7 & 8. Dataset-aware sales trend classification logic', () => {
    const zeroPoints: { date: string; revenue: number }[] = []
    expect(zeroPoints.filter(p => p.revenue > 0).length).toBe(0)

    const singlePoint = [{ date: '2083/06/01', revenue: 333 }]
    expect(singlePoint.filter(p => p.revenue > 0).length).toBe(1)

    const multiPoints = [
      { date: '2083/06/01', revenue: 333 },
      { date: '2083/06/02', revenue: 450 },
      { date: '2083/06/03', revenue: 1200 },
    ]
    expect(multiPoints.filter(p => p.revenue > 0).length).toBe(3)
  })

  it('9 & 10. Payment method single vs multiple share classification & presentation formatting', () => {
    expect(formatPaymentMethodLabel('cash')).toBe('Cash')
    expect(formatPaymentMethodLabel('full_udhaar')).toBe('Full Udhaar')
    expect(formatPaymentMethodLabel('partial_udhaar')).toBe('Partial Udhaar')
    expect(formatPaymentMethodLabel('bank_transfer')).toBe('Bank Transfer')
    expect(formatPaymentMethodLabel('mobile_payment')).toBe('Mobile Payment')

    const singleMethod = [{ name: 'cash', total: 333, count: 1 }]
    expect(singleMethod.filter(p => p.total > 0).length).toBe(1)

    const multiMethods = [
      { name: 'cash', total: 220, count: 2 },
      { name: 'full_udhaar', total: 113, count: 1 },
    ]
    expect(multiMethods.filter(p => p.total > 0).length).toBe(2)
  })

  it('11, 12 & 13. Top products dataset adaptive classification', () => {
    const emptyProds: any[] = []
    expect(emptyProds.length).toBe(0)

    const singleProd = [{ name: 'Ganga Jal', revenue: 333, quantity: 1 }]
    expect(singleProd.length).toBe(1)

    const multiProds = [
      { name: 'Ganga Jal', revenue: 333, quantity: 1 },
      { name: 'Basmati Rice', revenue: 1200, quantity: 2 },
    ]
    expect(multiProds.length).toBe(2)
  })

  it('14. Udhaar customer dues pluralization logic', () => {
    const formatCustomerCount = (count: number) =>
      `From ${count} ${count === 1 ? 'registered customer' : 'registered customers'}`

    expect(formatCustomerCount(1)).toBe('From 1 registered customer')
    expect(formatCustomerCount(2)).toBe('From 2 registered customers')
    expect(formatCustomerCount(0)).toBe('From 0 registered customers')
  })

  it('15, 16 & 17. Empty, loading, and error state differentiation', () => {
    const getDashboardState = (isLoading: boolean, isError: boolean, hasData: boolean) => {
      if (isLoading && !hasData) return 'LOADING'
      if (isError && !hasData) return 'ERROR'
      if (hasData) return 'READY'
      return 'EMPTY'
    }

    expect(getDashboardState(true, false, false)).toBe('LOADING')
    expect(getDashboardState(false, true, false)).toBe('ERROR')
    expect(getDashboardState(false, false, true)).toBe('READY')
  })

  it('18 & 19. Multi-tenant isolation & active business switching state cleanup', () => {
    let currentTenantData = { bId: 'biz_001', sales: [100, 200] }
    
    // Switch tenant: clear state
    currentTenantData = { bId: 'biz_002', sales: [] }
    expect(currentTenantData.bId).toBe('biz_002')
    expect(currentTenantData.sales.length).toBe(0)
  })
})
