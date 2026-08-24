"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { WidgetDataResponse } from '@/app/api/widget/data/route'
import { syncWidgetData, getWidgetCache, clearWidgetCache } from '@/lib/widget-sync'
import { Smartphone, RefreshCw, Trash2, CheckCircle2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export function WidgetSettings() {
  const { activeBusiness } = useAuth()
  const [widgetData, setWidgetData] = useState<WidgetDataResponse | null>(null)
  const [activeSize, setActiveSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [loading, setLoading] = useState<boolean>(false)
  const [syncMessage, setSyncMessage] = useState<string>('')

  const handleSync = useCallback(async () => {
    if (!activeBusiness?.$id) return
    setLoading(true)
    setSyncMessage('')
    try {
      const data = await syncWidgetData(activeBusiness.$id)
      if (data) {
        setWidgetData(data)
        setSyncMessage('Widget metrics updated successfully!')
      } else {
        setSyncMessage('Failed to fetch widget metrics. Using cached data.')
      }
    } catch {
      setSyncMessage('Network error while refreshing widget.')
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.$id])

  useEffect(() => {
    if (activeBusiness?.$id) {
      const cached = getWidgetCache()
      if (cached?.data) {
        setWidgetData(cached.data)
      }
      handleSync()
    }
  }, [activeBusiness?.$id, handleSync])

  const handleClearCache = () => {
    clearWidgetCache()
    setWidgetData(null)
    setSyncMessage('Widget cache cleared.')
  }

  return (
    <Card className="border border-slate-200 shadow-xs rounded-xl overflow-hidden">
      <CardHeader className="bg-slate-50 border-b border-slate-200/80 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-extrabold text-slate-900">
                Android Home-Screen Widgets
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                View real-time sales, expenses, stock, and udhaar directly from your phone&apos;s home screen.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={loading}
              className="text-xs font-bold gap-1.5 bg-white border-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Now
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearCache}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Cache
            </Button>
          </div>
        </div>

        {syncMessage && (
          <div className="mt-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{syncMessage}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Size Selection Tabs */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Select Widget Size Preview:
          </label>
          <div className="flex gap-2">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setActiveSize(size)}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold capitalize transition-all ${
                  activeSize === size
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {size} Widget
              </button>
            ))}
          </div>
        </div>

        {/* Live Interactive Preview Box */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center min-h-[220px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
            Android Home Screen Live Preview
          </span>

          {/* 1. Small Widget Preview */}
          {activeSize === 'small' && (
            <Link
              href="/app/dashboard"
              className="w-full max-w-[200px] bg-white rounded-2xl p-4 shadow-xl border border-slate-200 hover:scale-[1.02] transition-transform block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-indigo-600">Inventory Lite</span>
                <span className="text-[9px] text-slate-400">PWA Widget</span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">Today&apos;s Sales</p>
              <p className="text-lg font-extrabold text-emerald-600 mt-1.5">
                {widgetData?.todaySalesFormatted || 'Rs. 0.00'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {widgetData?.todaySalesCount || 0} sales
              </p>
            </Link>
          )}

          {/* 2. Medium Widget Preview */}
          {activeSize === 'medium' && (
            <div className="w-full max-w-[420px] bg-white rounded-2xl p-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-indigo-600">Inventory Lite</span>
                  <span className="text-xs text-slate-400">• Today&apos;s Overview</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {widgetData?.updatedAtFormatted ? `Updated ${widgetData.updatedAtFormatted}` : 'Live'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/app/sales"
                  className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 hover:bg-emerald-50/50 transition-colors block"
                >
                  <span className="text-[11px] font-semibold text-slate-500 block">Sales</span>
                  <span className="text-sm font-extrabold text-emerald-600">
                    {widgetData?.todaySalesFormatted || 'Rs. 0.00'}
                  </span>
                </Link>

                <Link
                  href="/app/expenses"
                  className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-100 transition-colors block"
                >
                  <span className="text-[11px] font-semibold text-slate-500 block">Expenses</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {widgetData?.todayExpensesFormatted || 'Rs. 0.00'}
                  </span>
                </Link>

                <Link
                  href="/app/stock"
                  className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-100 transition-colors block"
                >
                  <span className="text-[11px] font-semibold text-slate-500 block">Stock</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {widgetData?.currentStockQty || 0} items
                  </span>
                </Link>

                <Link
                  href="/app/credit"
                  className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-100 transition-colors block"
                >
                  <span className="text-[11px] font-semibold text-slate-500 block">Udhaar</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {widgetData?.customerUdhaarFormatted || 'Rs. 0.00'}
                  </span>
                </Link>
              </div>
            </div>
          )}

          {/* 3. Large Widget Preview */}
          {activeSize === 'large' && (
            <div className="w-full max-w-[440px] bg-white rounded-2xl p-5 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-indigo-600">Inventory Lite</span>
                  <span className="text-xs text-slate-400">• Shop Overview</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {widgetData?.updatedAtFormatted ? `Updated ${widgetData.updatedAtFormatted}` : 'Live'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block">Today&apos;s Sales</span>
                  <span className="text-sm font-extrabold text-emerald-600">
                    {widgetData?.todaySalesFormatted || 'Rs. 0.00'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block">Today&apos;s Expenses</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {widgetData?.todayExpensesFormatted || 'Rs. 0.00'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block">Current Stock</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {widgetData?.currentStockQty || 0} items
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block">Customer Udhaar</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {widgetData?.customerUdhaarFormatted || 'Rs. 0.00'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block">Low Stock</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-extrabold text-slate-900">
                      {widgetData?.lowStockCount || 0} products
                    </span>
                    {(widgetData?.lowStockCount || 0) > 0 && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Warning
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block">Estimated Profit</span>
                  <span className={`text-sm font-extrabold ${widgetData?.hasCostDataError ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {widgetData?.estimatedProfitFormatted || 'Not available'}
                  </span>
                </div>
              </div>

              <Link
                href="/app/dashboard"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors block text-center"
              >
                <span>Open Inventory Lite</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Installation Instructions */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs space-y-2 text-slate-600">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
            <span>How to add widget on Android home screen</span>
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
            <li>Touch and hold an empty area on your Android home screen.</li>
            <li>Tap <strong>Widgets</strong> from the bottom menu.</li>
            <li>Scroll to <strong>Inventory Lite</strong>.</li>
            <li>Choose your preferred size (Small, Medium, or Large) and tap <strong>Add</strong>.</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
