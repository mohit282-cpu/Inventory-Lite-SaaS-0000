"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CookieCategory, CookieConfig, CookieCategoryValue } from "./cookie-types"

const CookieCategories: Record<CookieCategoryValue, string> = {
  [CookieCategory.Essential]: "Essential",
  [CookieCategory.Analytics]: "Analytics",
  [CookieCategory.Preferences]: "Preferences",
}

export interface CookieConsentProps {
  autoShow?: boolean
}

const STORAGE_KEY = "inventory_lite_cookie_preferences"

type PreferenceState = "accepted" | "rejected" | "managed"

function getStoredPreference(): PreferenceState {
  if (typeof window === "undefined") return "accepted"
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return "accepted"
  const parsed = JSON.parse(stored)
  if (parsed.accepted) return "accepted"
  if (parsed.rejected) return "rejected"
  return "managed"
}

function savePreference(state: PreferenceState) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function CookieConsent({ autoShow = true }: CookieConsentProps) {
  const [show, setShow] = React.useState<boolean>(shouldShow(autoShow))
  const [preferences, setPreferences] = React.useState<{
    essential: boolean
    analytics: boolean
    preferences: boolean
  }>(() => {
    const stored = getStoredPreference()
    switch (stored) {
      case "accepted":
        return { essential: true, analytics: true, preferences: true }
      case "rejected":
        return { essential: true, analytics: false, preferences: false }
      case "managed":
        return { essential: true, analytics: false, preferences: false }
      default:
        return { essential: true, analytics: true, preferences: true }
    }
  })
  const [focusTrapRef, setFocusTrapRef] = React.useRef<HTMLDivElement>(null)

  const handleAcceptAll = () => {
    setPreferences({ essential: true, analytics: true, preferences: true })
    savePreference("accepted")
    setShow(false)
  }

  const handleRejectAll = () => {
    setPreferences({ essential: true, analytics: false, preferences: false })
    savePreference("rejected")
    setShow(false)
  }

  const handleManagePreferences = () => {
    setPreferences({ essential: true, analytics: false, preferences: false })
    savePreference("managed")
    setShow(false)
  }

  function shouldShow(autoShow: boolean): boolean {
    if (!autoShow) return true
    const stored = getStoredPreference()
    return stored !== "accepted" && stored !== "rejected"
  }

  // focusTrapRef is stable (created once in component scope), not added to deps to avoid
  // exhaustive-deps noise; the ref.current is always current since it's set on the
  // banner div via the fixed ref attribute below.
  React.useEffect(() => {
    const element = focusTrapRef.current
    if (element) {
      element.focus()
    }
  }, [focusTrapRef])

  if (!show) return null

  return (
    <div
      ref={focusTrapRef}
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-200"
      aria-label="Cookie consent banner"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-sm text-white sm:mt-0 sm:me-4">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8" cy="8" r="2" />
              <circle cx="16" cy="16" r="2" />
              <line x1="10" y1="13" x2="10" y2="19" />
              <line x1="14" y1="13" x2="14" y2="19" />
            </svg>
          </div>
          <div className="flex-1 text-sm text-slate-300">
            <p className="font-medium text-slate-100">Cookie Consent</p>
            <p className="line-clamp-2 text-slate-400">
              Inventory Lite uses cookies to enhance your browsing experience. We use essential cookies for core functionality, analytics cookies to understand how you interact with our site, and preferences cookies to remember your settings.
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 grid sm:grid-cols-3 gap-3">
          <div
            className={cn(
              "border rounded-lg p-3 border-slate-600 bg-slate-950 text-slate-400",
              { "border-indigo-600": preferences.analytics }
            )}
          >
            <input
              type="checkbox"
              checked={preferences.analytics}
              onChange={() => {
                setPreferences((p) => ({ ...p, analytics: !p.analytics }))
              }}
              className="hidden"
              id="analytics-cookie"
            />
            <label htmlFor="analytics-cookie" className="cursor-pointer select-none">
              <span className="font-medium text-slate-100">Analytics</span>
              <span className="text-xs text-slate-500">Performance and analytics cookies</span>
            </label>
          </div>
          <div
            className={cn(
              "border rounded-lg p-3 border-slate-600 bg-slate-950 text-slate-400",
              { "border-indigo-600": preferences.preferences }
            )}
          >
            <input
              type="checkbox"
              checked={preferences.preferences}
              onChange={() => {
                setPreferences((p) => ({ ...p, preferences: !p.preferences }))
              }}
              className="hidden"
              id="preferences-cookie"
            />
            <label htmlFor="preferences-cookie" className="cursor-pointer select-none">
              <span className="font-medium text-slate-100">Preferences</span>
              <span className="text-xs text-slate-500">Remember language and theme settings</span>
            </label>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={handleRejectAll}
            className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            aria-disabled="false"
          >
            Reject All
          </button>
          <button
            onClick={handleManagePreferences}
            className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            aria-disabled="false"
          >
            Manage Preferences
          </button>
          <button
            onClick={handleAcceptAll}
            className="flex-1 py-2 px-4 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            aria-disabled="false"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  )
}