import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/services/analytics.service'
import { businessService } from '@/services/business.service'
import { formatNPR } from '@/lib/localization'
import { formatBSDate } from '@/lib/date/bs-date'

export const dynamic = 'force-dynamic'

export interface WidgetDataResponse {
  businessId: string
  businessName: string
  currency: string
  currencySymbol: string
  todaySales: number
  todaySalesFormatted: string
  todaySalesCount: number
  todayExpenses: number
  todayExpensesFormatted: string
  currentStockQty: number
  customerUdhaar: number
  customerUdhaarFormatted: string
  lowStockCount: number
  estimatedProfit: number | null
  estimatedProfitFormatted: string
  hasCostDataError: boolean
  updatedAt: string
  updatedAtFormatted: string
  bsDateFormatted: string
  adDateFormatted: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId') || searchParams.get('business_id')

    if (!businessId || businessId.trim() === '') {
      return NextResponse.json(
        { error: 'Missing required businessId parameter', status: 'error' },
        { status: 400 }
      )
    }

    // Try fetching business details
    let businessName = 'Inventory Lite'
    const currencySymbol = 'Rs.'
    try {
      const biz = await businessService.getBusiness(businessId)
      if (biz) {
        businessName = biz.name || 'Inventory Lite'
      }
    } catch {
      // Fallback if business document not directly readable by guest or mock
    }

    // Load metrics from existing single-source analyticsService
    const metrics = await analyticsService.getDashboardMetrics(businessId)
    const profitReport = await analyticsService.getProfitEstimateReport(businessId)

    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kathmandu',
    })

    const adStr = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kathmandu',
    })

    const bsStr = formatBSDate(now, { format: 'YYYY/MM/DD' })

    const responseData: WidgetDataResponse = {
      businessId,
      businessName,
      currency: 'NPR',
      currencySymbol,
      todaySales: metrics.todaySales,
      todaySalesFormatted: formatNPR(metrics.todaySales, true),
      todaySalesCount: profitReport.totalSalesCount || 0,
      todayExpenses: metrics.todayExpenses,
      todayExpensesFormatted: formatNPR(metrics.todayExpenses, true),
      currentStockQty: metrics.totalProducts,
      customerUdhaar: metrics.totalDue,
      customerUdhaarFormatted: formatNPR(metrics.totalDue, true),
      lowStockCount: metrics.lowStockProducts,
      estimatedProfit: profitReport.hasCostDataError ? null : profitReport.netProfit,
      estimatedProfitFormatted: profitReport.hasCostDataError
        ? 'Not available'
        : formatNPR(profitReport.netProfit, true),
      hasCostDataError: !!profitReport.hasCostDataError,
      updatedAt: now.toISOString(),
      updatedAtFormatted: timeStr,
      bsDateFormatted: `${bsStr} BS`,
      adDateFormatted: `${adStr} AD`,
    }

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Widget Data API Error:', error)
    return NextResponse.json(
      {
        error: 'Unable to refresh widget data',
        message: 'Showing last saved data if offline',
        status: 'error',
      },
      { status: 500 }
    )
  }
}
