import {
  BS_CALENDAR_DATA,
  BS_MONTH_NAMES_EN,
  BS_MONTH_NAMES_NE,
  REF_AD_DATE,
  REF_BS_YEAR,
  BSDate,
} from '@/lib/nepali-calendar-data'
import { getCurrentFinancialYear, FinancialYearInfo } from '@/lib/financial-year'

export interface FormattedBSDateOptions {
  language?: 'en' | 'ne'
  includeAD?: boolean
  shortMonth?: boolean
}

/**
 * Centralized Bikram Sambat (B.S.) Calendar & Date Conversion Service
 * 
 * Provides 100% offline, exact BS <-> AD conversions, date formatting,
 * monthly day calculations, and Financial Year integration.
 */
export class CalendarService {
  /**
   * Get total days in a given BS month of a BS year
   */
  getBSMonthDays(bsYear: number, bsMonth: number): number {
    const yearData = BS_CALENDAR_DATA[bsYear]
    if (!yearData || bsMonth < 1 || bsMonth > 12) {
      // Default fallback
      return 30
    }
    return yearData[bsMonth - 1]
  }

  /**
   * Convert Gregorian (A.D.) date to Bikram Sambat (B.S.) date
   */
  adToBs(dateInput: string | Date | number): BSDate {
    const adDate = typeof dateInput === 'object' ? dateInput : new Date(dateInput)
    const validDate = isNaN(adDate.getTime()) ? new Date() : adDate

    // Calculate total days between validDate (UTC midnight) and reference AD date
    const utcDate = new Date(Date.UTC(validDate.getFullYear(), validDate.getMonth(), validDate.getDate()))
    const totalDaysDiff = Math.floor((utcDate.getTime() - REF_AD_DATE.getTime()) / (1000 * 60 * 60 * 24))

    if (totalDaysDiff < 0) {
      // Date before 2000 BS reference anchor
      return { year: 2000, month: 1, day: 1 }
    }

    let remainingDays = totalDaysDiff
    let bsYear = REF_BS_YEAR
    let bsMonth = 1
    let bsDay = 1

    while (remainingDays > 0) {
      const daysInCurrentMonth = this.getBSMonthDays(bsYear, bsMonth)
      if (remainingDays >= daysInCurrentMonth) {
        remainingDays -= daysInCurrentMonth
        bsMonth++
        if (bsMonth > 12) {
          bsMonth = 1
          bsYear++
        }
      } else {
        bsDay += remainingDays
        remainingDays = 0
      }
    }

    return { year: bsYear, month: bsMonth, day: bsDay }
  }

  /**
   * Convert Bikram Sambat (B.S.) date to Gregorian (A.D.) JavaScript Date object
   */
  bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
    let totalDays = 0

    // Sum days for full BS years from REF_BS_YEAR to bsYear - 1
    for (let y = REF_BS_YEAR; y < bsYear; y++) {
      const yearMonths = BS_CALENDAR_DATA[y] || [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 31]
      totalDays += yearMonths.reduce((a, b) => a + b, 0)
    }

    // Sum days for full months in current BS year
    const currentYearMonths = BS_CALENDAR_DATA[bsYear] || [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 31]
    for (let m = 1; m < bsMonth; m++) {
      totalDays += currentYearMonths[m - 1]
    }

    totalDays += (bsDay - 1)

    const resultAD = new Date(REF_AD_DATE.getTime() + totalDays * 24 * 60 * 60 * 1000)
    return resultAD
  }

  /**
   * Get current Bikram Sambat (B.S.) date
   */
  getCurrentBSDate(): BSDate {
    return this.adToBs(new Date())
  }

  /**
   * Get current Gregorian (A.D.) Date object
   */
  getCurrentADDate(): Date {
    return new Date()
  }

  /**
   * Get BS Month (1..12) for a given date
   */
  getBSMonth(dateInput: string | Date | number): number {
    return this.adToBs(dateInput).month
  }

  /**
   * Get BS Year (e.g. 2083) for a given date
   */
  getBSYear(dateInput: string | Date | number): number {
    return this.adToBs(dateInput).year
  }

  /**
   * Get Financial Year Info for a given date
   */
  getFinancialYear(dateInput?: string | Date): FinancialYearInfo {
    return getCurrentFinancialYear(dateInput)
  }

  /**
   * Get exact ISO date range for a specific financial year
   */
  getFinancialYearDateRange(bsStartYear: number): { isoFrom: string; isoTo: string } {
    const { getFinancialYearDateRange: getRange } = require('@/lib/financial-year')
    return getRange(bsStartYear, this.getBSMonthDays.bind(this), this.bsToAd.bind(this))
  }

  /**
   * Format BS Date into readable string
   * Example: "2083 Bhadra 6" or "2083 Bhadra 6 (August 22, 2026)"
   */
  formatBSDate(dateInput: string | Date | number | BSDate, options: FormattedBSDateOptions = {}): string {
    const { language = 'en', includeAD = false } = options

    let bs: BSDate
    let adDate: Date

    if (typeof dateInput === 'object' && 'year' in dateInput && 'month' in dateInput && 'day' in dateInput) {
      bs = dateInput as BSDate
      adDate = this.bsToAd(bs.year, bs.month, bs.day)
    } else {
      adDate = typeof dateInput === 'object' ? dateInput : new Date(dateInput)
      bs = this.adToBs(adDate)
    }

    const monthName = language === 'ne' ? BS_MONTH_NAMES_NE[bs.month - 1] : BS_MONTH_NAMES_EN[bs.month - 1]

    let formattedBS = `${bs.year} ${monthName} ${bs.day}`
    if (includeAD) {
      const adStr = this.formatADDate(adDate)
      formattedBS = `${formattedBS} (${adStr} AD)`
    }

    return formattedBS
  }

  /**
   * Format Gregorian AD Date into readable string
   * Example: "August 22, 2026"
   */
  formatADDate(dateInput: string | Date | number): string {
    const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput)
    if (isNaN(d.getTime())) return ''

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
  }

  /**
   * Get weekday index (0 = Sun, 6 = Sat) for a given BS date
   */
  getBSDayOfWeek(bsYear: number, bsMonth: number, bsDay: number): number {
    const adDate = this.bsToAd(bsYear, bsMonth, bsDay)
    return adDate.getUTCDay()
  }

  /**
   * Get full month structure for rendering monthly calendar grid
   */
  getBSMonthCalendarGrid(bsYear: number, bsMonth: number) {
    const daysInMonth = this.getBSMonthDays(bsYear, bsMonth)
    const firstDayOfWeek = this.getBSDayOfWeek(bsYear, bsMonth, 1) // 0=Sun..6=Sat

    const days: Array<{
      bsDay: number
      adDay: number
      adMonth: number
      adYear: number
      fullADDate: Date
      isCurrentMonth: boolean
    }> = []

    // Previous month padding days
    const prevMonth = bsMonth === 1 ? 12 : bsMonth - 1
    const prevYear = bsMonth === 1 ? bsYear - 1 : bsYear
    const prevMonthDays = this.getBSMonthDays(prevYear, prevMonth)

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i
      const adDate = this.bsToAd(prevYear, prevMonth, dayNum)
      days.push({
        bsDay: dayNum,
        adDay: adDate.getUTCDate(),
        adMonth: adDate.getUTCMonth() + 1,
        adYear: adDate.getUTCFullYear(),
        fullADDate: adDate,
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const adDate = this.bsToAd(bsYear, bsMonth, d)
      days.push({
        bsDay: d,
        adDay: adDate.getUTCDate(),
        adMonth: adDate.getUTCMonth() + 1,
        adYear: adDate.getUTCFullYear(),
        fullADDate: adDate,
        isCurrentMonth: true,
      })
    }

    // Next month padding days to complete 7-column grid (up to 35 or 42 cells)
    const totalCells = days.length <= 35 ? 35 : 42
    const nextMonth = bsMonth === 12 ? 1 : bsMonth + 1
    const nextYear = bsMonth === 12 ? bsYear + 1 : bsYear
    let nextDayNum = 1

    while (days.length < totalCells) {
      const adDate = this.bsToAd(nextYear, nextMonth, nextDayNum)
      days.push({
        bsDay: nextDayNum,
        adDay: adDate.getUTCDate(),
        adMonth: adDate.getUTCMonth() + 1,
        adYear: adDate.getUTCFullYear(),
        fullADDate: adDate,
        isCurrentMonth: false,
      })
      nextDayNum++
    }

    return {
      bsYear,
      bsMonth,
      monthNameEN: BS_MONTH_NAMES_EN[bsMonth - 1],
      monthNameNE: BS_MONTH_NAMES_NE[bsMonth - 1],
      daysInMonth,
      days,
    }
  }
}

export const calendarService = new CalendarService()
