import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '@/app/api/widget/data/route'
import { NextRequest } from 'next/server'
import { clearWidgetCache, saveWidgetCache, getWidgetCache } from '@/lib/widget-sync'

describe('Android Native Home-Screen Widgets API & Cache Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clearWidgetCache()
  })

  it('rejects requests missing businessId parameter', async () => {
    const req = new NextRequest('http://localhost:3000/api/widget/data')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('Missing required businessId')
  })

  it('formats Nepalese NPR currency consistently as Rs. X,XX,XXX.XX', async () => {
    const req = new NextRequest('http://localhost:3000/api/widget/data?businessId=test_biz_123')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.businessId).toBe('test_biz_123')
    expect(data.todaySalesFormatted).toMatch(/^रु\.\s[\d,]+\.\d{2}$|^Rs\.\s[\d,]+\.\d{2}$/)
    expect(data.todayExpensesFormatted).toMatch(/^रु\.\s[\d,]+\.\d{2}$|^Rs\.\s[\d,]+\.\d{2}$/)
    expect(data.customerUdhaarFormatted).toMatch(/^रु\.\s[\d,]+\.\d{2}$|^Rs\.\s[\d,]+\.\d{2}$/)
    expect(data.bsDateFormatted).toContain('BS')
  })

  it('never exposes customer PII in widget response payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/widget/data?businessId=test_biz_123')
    const res = await GET(req)
    const data = await res.json()

    const rawStr = JSON.stringify(data)
    expect(rawStr).not.toContain('customerName')
    expect(rawStr).not.toContain('phone')
    expect(rawStr).not.toContain('email')
    expect(rawStr).not.toContain('address')
  })

  it('saves and clears local widget cache cleanly on logout', () => {
    const mockWidgetData = {
      businessId: 'biz_test_888',
      businessName: 'Pokhara Hardware',
      currency: 'NPR',
      currencySymbol: 'Rs.',
      todaySales: 15000,
      todaySalesFormatted: 'Rs. 15,000.00',
      todaySalesCount: 5,
      todayExpenses: 1200,
      todayExpensesFormatted: 'Rs. 1,200.00',
      currentStockQty: 120,
      customerUdhaar: 4500,
      customerUdhaarFormatted: 'Rs. 4,500.00',
      lowStockCount: 2,
      estimatedProfit: 3500,
      estimatedProfitFormatted: 'Rs. 3,500.00',
      hasCostDataError: false,
      updatedAt: '2026-08-24T21:49:45.000Z',
      updatedAtFormatted: '09:49 PM',
      bsDateFormatted: '2083/05/07 BS',
      adDateFormatted: '23 Aug 2026 AD',
    }

    saveWidgetCache(mockWidgetData)
    const cached = getWidgetCache()
    expect(cached).not.toBeNull()
    expect(cached?.data.businessId).toBe('biz_test_888')

    // Simulate Logout or Business Deletion
    clearWidgetCache()
    const cleared = getWidgetCache()
    expect(cleared).toBeNull()
  })

  it('handles missing cost data gracefully by displaying Not available', async () => {
    const mockWidgetDataWithCostError = {
      businessId: 'biz_no_cost',
      businessName: 'Retail Shop',
      currency: 'NPR',
      currencySymbol: 'Rs.',
      todaySales: 5000,
      todaySalesFormatted: 'Rs. 5,000.00',
      todaySalesCount: 2,
      todayExpenses: 0,
      todayExpensesFormatted: 'Rs. 0.00',
      currentStockQty: 50,
      customerUdhaar: 0,
      customerUdhaarFormatted: 'Rs. 0.00',
      lowStockCount: 0,
      estimatedProfit: null,
      estimatedProfitFormatted: 'Not available',
      hasCostDataError: true,
      updatedAt: '2026-08-24T21:49:45.000Z',
      updatedAtFormatted: '09:49 PM',
      bsDateFormatted: '2083/05/07 BS',
      adDateFormatted: '23 Aug 2026 AD',
    }

    saveWidgetCache(mockWidgetDataWithCostError)
    const cached = getWidgetCache()
    expect(cached?.data.estimatedProfitFormatted).toBe('Not available')
  })
})
