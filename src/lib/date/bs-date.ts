import { calendarService } from '@/services/calendar.service'
import { BS_MONTH_NAMES_EN, BS_MONTH_NAMES_NE, BSDate } from '@/lib/nepali-calendar-data'
import { getCurrentFinancialYear, FinancialYearInfo } from '@/lib/financial-year'
import { toNepaliNumerals } from '@/lib/localization'

export type BSDateFormat = 'YYYY/MM/DD' | 'YYYY-MM-DD' | 'MEDIUM' | 'LONG' | 'SHORT'

export interface FormatBSDateOptions {
  format?: BSDateFormat
  language?: 'en' | 'ne'
  includeAD?: boolean
}

/**
 * Single Source of Truth for Bikram Sambat (B.S.) Date Operations
 * Business Timezone: Asia/Kathmandu (+05:45)
 */

/**
 * Convert AD date/timestamp to BSDate object { year, month, day }
 */
export function adToBS(dateInput?: string | Date | number | null): BSDate {
  if (!dateInput) {
    return calendarService.getCurrentBSDate()
  }
  return calendarService.adToBs(dateInput)
}

/**
 * Convert BSDate (year, month, day) to Gregorian (A.D.) JavaScript Date object
 */
export function bsToAD(bsYear: number, bsMonth: number, bsDay: number): Date {
  return calendarService.bsToAd(bsYear, bsMonth, bsDay)
}

/**
 * Format any date input into a primary Bikram Sambat (B.S.) date string.
 * Examples:
 *   formatBSDate('2026-08-23T14:30:00.000Z') -> "2083/05/07"
 *   formatBSDate('2026-08-23', { format: 'MEDIUM' }) -> "2083 Bhadra 7"
 *   formatBSDate('2026-08-23', { includeAD: true }) -> "2083/05/07 BS (2026/08/23 AD)"
 */
export function formatBSDate(
  dateInput?: string | Date | number | BSDate | null,
  options: FormatBSDateOptions = {}
): string {
  if (!dateInput) return 'N/A'

  const { format = 'YYYY/MM/DD', language = 'en', includeAD = false } = options

  let bs: BSDate
  let adDate: Date

  if (typeof dateInput === 'object' && dateInput !== null && 'year' in dateInput && 'month' in dateInput && 'day' in dateInput) {
    bs = dateInput as BSDate
    adDate = bsToAD(bs.year, bs.month, bs.day)
  } else {
    adDate = typeof dateInput === 'object' && dateInput !== null ? (dateInput as Date) : new Date(dateInput as string | number)
    if (isNaN(adDate.getTime())) return 'N/A'
    bs = adToBS(adDate)
  }

  const mm = String(bs.month).padStart(2, '0')
  const dd = String(bs.day).padStart(2, '0')
  const monthName = language === 'ne' ? BS_MONTH_NAMES_NE[bs.month - 1] : BS_MONTH_NAMES_EN[bs.month - 1]

  let result = ''

  if (format === 'YYYY/MM/DD') {
    result = `${bs.year}/${mm}/${dd}`
  } else if (format === 'YYYY-MM-DD') {
    result = `${bs.year}-${mm}-${dd}`
  } else if (format === 'MEDIUM') {
    result = language === 'ne'
      ? `${toNepaliNumerals(bs.year)} ${monthName} ${toNepaliNumerals(bs.day)}`
      : `${bs.year} ${monthName} ${bs.day}`
  } else if (format === 'LONG') {
    result = language === 'ne'
      ? `${toNepaliNumerals(bs.year)} ${monthName} ${toNepaliNumerals(bs.day)} गते`
      : `${bs.year} ${monthName} ${bs.day} BS`
  } else if (format === 'SHORT') {
    result = `${bs.year}/${mm}/${dd}`
  } else {
    result = `${bs.year}/${mm}/${dd}`
  }

  if (includeAD) {
    const adYr = adDate.getFullYear()
    const adMm = String(adDate.getMonth() + 1).padStart(2, '0')
    const adDd = String(adDate.getDate()).padStart(2, '0')
    result = `${result} BS (${adYr}/${adMm}/${adDd} AD)`
  }

  return result
}

/**
 * Format any date input into a primary Bikram Sambat (B.S.) Date + Time string.
 * Time is displayed in 12-hour format by default (e.g. "2083/05/07 02:30 PM").
 * Pass use12Hour=false explicitly for 24-hour output ("2083/05/07 14:30").
 */
export function formatBSDateTime(
  dateInput?: string | Date | number | null,
  includeSeconds: boolean = false,
  use12Hour: boolean = true
): string {
  if (!dateInput) return 'N/A'

  const adDate = typeof dateInput === 'object' && dateInput !== null ? dateInput : new Date(dateInput)
  if (isNaN(adDate.getTime())) return 'N/A'

  const bsStr = formatBSDate(adDate, { format: 'YYYY/MM/DD' })

  // Interpret in Asia/Kathmandu timezone (+05:45)
  let hours = adDate.getHours()
  const minutes = String(adDate.getMinutes()).padStart(2, '0')
  const seconds = String(adDate.getSeconds()).padStart(2, '0')

  if (use12Hour) {
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    const hrsStr = String(hours).padStart(2, '0')
    const secStr = includeSeconds ? `:${seconds}` : ''
    return `${bsStr} ${hrsStr}:${minutes}${secStr} ${ampm}`
  }

  const hrsStr = String(hours).padStart(2, '0')
  const secStr = includeSeconds ? `:${seconds}` : ''
  return `${bsStr} ${hrsStr}:${minutes}${secStr}`
}

/**
 * Get formatted Month Name for a BS Month number (1..12)
 */
export function formatBSMonth(monthNumber: number, language: 'en' | 'ne' = 'en'): string {
  if (monthNumber < 1 || monthNumber > 12) return ''
  return language === 'ne' ? BS_MONTH_NAMES_NE[monthNumber - 1] : BS_MONTH_NAMES_EN[monthNumber - 1]
}

/**
 * Get BS Year string (e.g. "2083")
 */
export function formatBSYear(dateInput?: string | Date | number | null): number {
  return adToBS(dateInput).year
}

/**
 * Get Financial Year Info for a given date in BS (e.g. "2083/84" / "83/84")
 */
export function getBSFinancialYear(dateInput?: string | Date): FinancialYearInfo {
  return getCurrentFinancialYear(dateInput)
}

/**
 * Convert a BS Date range (e.g. "2083/05/01" to "2083/05/30") into Asia/Kathmandu
 * ISO range strings suitable for querying Appwrite database timestamps.
 */
export function getBSDateRangeQuery(bsDateFrom?: string, bsDateTo?: string): {
  isoFrom?: string
  isoTo?: string
} {
  let isoFrom: string | undefined = undefined
  let isoTo: string | undefined = undefined

  if (bsDateFrom) {
    const cleanFrom = bsDateFrom.replace(/-/g, '/')
    const parts = cleanFrom.split('/')
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10)
      const d = parseInt(parts[2], 10)
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const adFrom = bsToAD(y, m, d)
        adFrom.setHours(0, 0, 0, 0)
        isoFrom = adFrom.toISOString()
      }
    }
  }

  if (bsDateTo) {
    const cleanTo = bsDateTo.replace(/-/g, '/')
    const parts = cleanTo.split('/')
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10)
      const d = parseInt(parts[2], 10)
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        const adTo = bsToAD(y, m, d)
        adTo.setHours(23, 59, 59, 999)
        isoTo = adTo.toISOString()
      }
    }
  }

  return { isoFrom, isoTo }
}

/**
 * Get current business date in Nepal timezone (Asia/Kathmandu +05:45)
 */
export function getNepalBusinessDate(): {
  bsDate: BSDate
  formattedDate: string
  formattedDateTime: string
  financialYear: FinancialYearInfo
} {
  const now = new Date()
  const bsDate = adToBS(now)
  return {
    bsDate,
    formattedDate: formatBSDate(now, { format: 'YYYY/MM/DD' }),
    formattedDateTime: formatBSDateTime(now),
    financialYear: getBSFinancialYear(now),
  }
}
