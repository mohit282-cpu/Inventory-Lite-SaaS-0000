import { convertADToBS } from './localization'

export interface FinancialYearInfo {
  bsStartYear: number
  bsEndYear: number
  label: string // e.g. "2083/84"
  shortLabel: string // e.g. "83/84"
  isoStartDate?: string // ISO string of Shrawan 1
  isoEndDate?: string   // ISO string of Ashadh end
}

/**
 * Centralized Financial Year Service / Utility for Nepal (Bikram Sambat Calendar)
 * 
 * Nepal's financial year strictly starts on Shrawan 1st (BS Month 4) and ends on Ashadh end (BS Month 3).
 * Example:
 *   Date in Shrawan 2083 -> FY 2083/84 ("83/84")
 *   Date in Asar 2084    -> FY 2083/84 ("83/84")
 *   Date in Shrawan 2084 -> FY 2084/85 ("84/85")
 */
export function getCurrentFinancialYear(dateInput?: string | Date): FinancialYearInfo {
  const date = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date()
  const validDate = isNaN(date.getTime()) ? new Date() : date

  const { year: bsYear, month: bsMonth } = convertADToBS(validDate)

  let bsStartYear: number
  let bsEndYear: number

  // BS Month 4 (Shrawan) is the start of Nepal Fiscal Year
  if (bsMonth >= 4) {
    bsStartYear = bsYear
    bsEndYear = bsYear + 1
  } else {
    bsStartYear = bsYear - 1
    bsEndYear = bsYear
  }

  const startShort = bsStartYear.toString().slice(-2)
  const endShort = bsEndYear.toString().slice(-2)

  const label = `${bsStartYear}/${endShort}`
  const shortLabel = `${startShort}/${endShort}`

  return {
    bsStartYear,
    bsEndYear,
    label,
    shortLabel,
  }
}

/**
 * Convenience helper to get short FY label e.g. "83/84"
 */
export function getFYShortLabel(dateInput?: string | Date): string {
  return getCurrentFinancialYear(dateInput).shortLabel
}

/**
 * Convenience helper to get full FY label e.g. "2083/84"
 */
export function getFYFullLabel(dateInput?: string | Date): string {
  return getCurrentFinancialYear(dateInput).label
}

/**
 * Get exact ISO bounds for a financial year (e.g. 2083)
 * Financial year starts on Shrawan 1 of the given year, and ends on Ashadh end of the next year.
 * Needs calendarService which has bsToAd. But calendarService imports this file.
 * To avoid circular dependency, we return ISO strings directly from bs-date or just AD Date logic.
 */
export function getFinancialYearDateRange(bsStartYear: number, getMonthDays: (y: number, m: number) => number, bsToAd: (y: number, m: number, d: number) => Date): { isoFrom: string; isoTo: string } {
  // Start: Shrawan 1st of bsStartYear
  const adStart = bsToAd(bsStartYear, 4, 1)
  adStart.setHours(0, 0, 0, 0)
  
  // End: Ashadh end of bsStartYear + 1
  const ashadhDays = getMonthDays(bsStartYear + 1, 3)
  const adEnd = bsToAd(bsStartYear + 1, 3, ashadhDays)
  adEnd.setHours(23, 59, 59, 999)

  return {
    isoFrom: adStart.toISOString(),
    isoTo: adEnd.toISOString()
  }
}
