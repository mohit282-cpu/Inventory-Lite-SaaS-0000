import { init, track, PlausibleEventOptions } from '@plausible-analytics/tracker'

let isInitialized = false

/**
 * Initialize Plausible Analytics Tracker
 */
export function initPlausible() {
  if (typeof window === 'undefined' || isInitialized) return
  try {
    init({
      domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || 'inventorylite.app',
      endpoint: process.env.NEXT_PUBLIC_PLAUSIBLE_ENDPOINT || 'https://plausible.io/api/event',
      autoCapturePageviews: true,
      captureOnLocalhost: false,
    })
    isInitialized = true
  } catch {
    // Non-blocking initialization
  }
}

/**
 * Track custom events with optional properties
 */
export function trackEvent(eventName: string, options?: PlausibleEventOptions) {
  if (typeof window === 'undefined') return
  try {
    if (!isInitialized) {
      initPlausible()
    }
    track(eventName, options || {})
  } catch {
    // Non-blocking tracking
  }
}
