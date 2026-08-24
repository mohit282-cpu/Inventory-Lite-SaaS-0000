/**
 * Inventory Lite - Widget Sync & Cache Manager
 *
 * Handles client-side widget state, localStorage caching,
 * and immediate wiping on logout/account deletion.
 */

import { WidgetDataResponse } from '@/app/api/widget/data/route'

const WIDGET_CACHE_KEY = 'inventory_lite_widget_cache'
const WIDGET_ACTIVE_BIZ_KEY = 'inventory_lite_widget_active_biz'

export interface CachedWidgetState {
  data: WidgetDataResponse
  cachedAt: string
  cachedAtFormatted: string
}

/**
 * Save widget metrics to local storage
 */
export function saveWidgetCache(data: WidgetDataResponse): void {
  if (typeof window === 'undefined') return
  try {
    const state: CachedWidgetState = {
      data,
      cachedAt: new Date().toISOString(),
      cachedAtFormatted: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    }
    localStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(state))
    localStorage.setItem(WIDGET_ACTIVE_BIZ_KEY, data.businessId)
  } catch (err) {
    console.warn('Failed to save widget cache:', err)
  }
}

/**
 * Get cached widget metrics for offline fallback
 */
export function getWidgetCache(): CachedWidgetState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(WIDGET_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedWidgetState
  } catch (err) {
    console.warn('Failed to read widget cache:', err)
    return null
  }
}

/**
 * Wipe all cached widget data immediately on logout, business switch, or account deletion
 */
export function clearWidgetCache(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(WIDGET_CACHE_KEY)
    localStorage.removeItem(WIDGET_ACTIVE_BIZ_KEY)
  } catch (err) {
    console.warn('Failed to clear widget cache:', err)
  }
}

/**
 * Synchronize widget data for an active business
 */
export async function syncWidgetData(businessId: string): Promise<WidgetDataResponse | null> {
  if (!businessId) return null
  try {
    const res = await fetch(`/api/widget/data?businessId=${encodeURIComponent(businessId)}`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
    if (!res.ok) {
      throw new Error(`Widget API returned ${res.status}`)
    }
    const data: WidgetDataResponse = await res.json()
    saveWidgetCache(data)
    return data
  } catch (err) {
    console.warn('Widget sync error:', err)
    return null
  }
}
