/**
 * Audit & Compliance Value & Date Formatting Helpers
 *
 * Ensures safe, human-readable formatting across Audit Center tables and drill-down views.
 * Prevents any unhandled '[object Object]', raw dates, or unformatted IDs.
 */

import { formatCurrency } from '@/lib/utils'

/**
 * Formats timestamps for audit logs and drawers.
 * Displays clean Nepal/local time (e.g. "Sep 27, 2026, 3:43:30 PM NPT")
 */
export function formatAuditTimestamp(ts: string | Date | number | undefined | null): string {
  if (!ts) return 'Not available'
  try {
    const d = typeof ts === 'object' ? ts : new Date(ts)
    if (isNaN(d.getTime())) return String(ts)
    const formatted = d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
    return `${formatted} NPT`
  } catch {
    return String(ts)
  }
}

/**
 * Returns exact ISO 8601 string for technical precision in tooltips/expanders
 */
export function formatIsoTimestamp(ts: string | Date | number | undefined | null): string {
  if (!ts) return 'Not available'
  try {
    const d = typeof ts === 'object' ? ts : new Date(ts)
    if (isNaN(d.getTime())) return String(ts)
    return d.toISOString()
  } catch {
    return String(ts)
  }
}

/**
 * Safely truncates Appwrite/System user IDs for compact UI display
 */
export function formatAuditUserId(userId?: string | null): string {
  if (!userId || userId.trim() === '') return 'System'
  const str = userId.trim()
  if (str.length <= 12) return str
  return `${str.slice(0, 8)}...`
}

/**
 * Configures semantic event badge colors based on audit action
 */
export function getEventBadgeConfig(action?: string): {
  label: string
  badgeClass: string
  dotClass: string
} {
  const act = (action || '').toUpperCase().trim()
  if (!act) {
    return {
      label: 'SYSTEM_EVENT',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      dotClass: 'bg-slate-400',
    }
  }

  if (act.includes('CANCEL') || act.includes('DELETE') || act.includes('VOID')) {
    return {
      label: act,
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      dotClass: 'bg-red-500',
    }
  }
  if (act.includes('PAYMENT') || act.includes('SETTLE')) {
    return {
      label: act,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
    }
  }
  if (act.includes('SALE') || act.includes('INVOICE')) {
    return {
      label: act,
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dotClass: 'bg-indigo-500',
    }
  }
  if (act.includes('PURCHASE')) {
    return {
      label: act,
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      dotClass: 'bg-purple-500',
    }
  }
  if (act.includes('STOCK') || act.includes('MOVEMENT')) {
    return {
      label: act,
      badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      dotClass: 'bg-cyan-500',
    }
  }
  if (act.includes('EXPENSE')) {
    return {
      label: act,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
    }
  }

  return {
    label: act,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-500',
  }
}

/**
 * Universal safe audit value formatter.
 * Handles strings, numbers, booleans, dates, arrays, and objects cleanly.
 * ABSOLUTELY GUARANTEES '[object Object]' IS NEVER RETURNED.
 */
export function formatAuditValue(val: unknown, keyHint?: string): string {
  if (val === null || val === undefined) {
    return 'Not provided'
  }

  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No'
  }

  if (typeof val === 'number') {
    if (isNaN(val)) return 'N/A'
    if (keyHint && (keyHint.toLowerCase().includes('amount') || keyHint.toLowerCase().includes('total') || keyHint.toLowerCase().includes('price') || keyHint.toLowerCase().includes('cost') || keyHint.toLowerCase().includes('refund') || keyHint.toLowerCase().includes('tax') || keyHint.toLowerCase().includes('vat'))) {
      return formatCurrency(val)
    }
    return val.toLocaleString('en-US')
  }

  if (typeof val === 'string') {
    if (val.trim() === '') return 'Not provided'
    return val
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return 'Empty list'
    return val.map((v) => formatAuditValue(v, keyHint)).join(', ')
  }

  if (typeof val === 'object') {
    try {
      return JSON.stringify(val)
    } catch {
      return 'Complex Object'
    }
  }

  return String(val)
}
