/**
 * Value formatters shared by every PDF report.
 *
 * Centralizes NPR currency, number, BS/AD date and filename formatting so the
 * whole suite reports consistently and never emits raw NaN / Infinity.
 */

import { formatBSDate, formatBSDateTime } from '@/lib/date/bs-date'
import { safeText } from './fonts'

/** Format a number with thousands separators. Guards non-finite values. */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '0'
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Format a monetary amount for Nepali Rupees (NPR). */
export function formatNpr(value: number | null | undefined, decimals = 2): string {
  const num = value === undefined || value === null || !Number.isFinite(value) ? 0 : Number(value)
  return `Rs. ${formatNumber(num, decimals)}`
}

/** Format a signed monetary amount (for +/- adjustments). */
export function formatSignedNpr(value: number | null | undefined, decimals = 2): string {
  const num = value === undefined || value === null || !Number.isFinite(value) ? 0 : Number(value)
  const sign = num < 0 ? '-' : '+'
  return `${sign} Rs. ${formatNumber(Math.abs(num), decimals)}`
}

/** Format a quantity with ± for stock columns. */
export function formatSignedQuantity(value: number | null | undefined): string {
  const num = value === undefined || value === null || !Number.isFinite(value) ? 0 : Number(value)
  if (num === 0) return '0'
  return num > 0 ? `+${formatNumber(num)}` : `-${formatNumber(Math.abs(num))}`
}

/** Percentage with fallback. */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  const num = value === undefined || value === null || !Number.isFinite(value) ? 0 : Number(value)
  return `${formatNumber(num, decimals)}%`
}

/** BS date in YYYY/MM/DD. Falls back to a safe token. */
export function formatBsDate(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  try {
    return formatBSDate(dateStr, { format: 'YYYY/MM/DD' })
  } catch {
    return dateStr.slice(0, 10)
  }
}

/** BS date-time in YYYY/MM/DD hh:mm AM/PM. */
export function formatBsDateTime(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  try {
    return formatBSDateTime(dateStr)
  } catch {
    return dateStr
  }
}

/** AD date in a compact local format. */
export function formatAdDate(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? safeText(dateStr.slice(0, 10)) : d.toLocaleDateString('en-GB')
}

/** Build a normalized date range label for report periods. */
export function formatPeriodLabel(dateFrom?: string, dateTo?: string): string {
  return `${dateFrom ? formatBsDate(dateFrom) : 'All History'} → ${dateTo ? formatBsDate(dateTo) : 'Present'}`
}

/**
 * Sanitize a string into a safe filesystem/browser-download filename.
 * Strips illegal characters and caps length.
 */
export function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
}

/**
 * Compute equal-width horizontal layout positions for N columns inside a
 * page region, with a small gap between each. Returns [start...] per column.
 */
export function distributeColumns(
  startX: number,
  endX: number,
  count: number,
  gap = 6,
): number[] {
  if (count <= 1) return [startX]
  const usable = endX - startX - gap * (count - 1)
  const colWidth = usable / count
  return Array.from({ length: count }, (_, i) => startX + i * (colWidth + gap))
}
