import { describe, it, expect } from 'vitest'
import { calendarService } from '@/services/calendar.service'
import { BS_MONTH_NAMES_EN, BS_MONTH_NAMES_NE } from '@/lib/nepali-calendar-data'
import { getCurrentFinancialYear } from '@/lib/financial-year'

describe('Comprehensive Nepal Dual Calendar & BS Conversion Tests', () => {
  // 1. Test all 12 BS Month Names and Order
  it('should support all 12 Bikram Sambat months in standard Nepali spelling', () => {
    expect(BS_MONTH_NAMES_EN).toHaveLength(12)
    expect(BS_MONTH_NAMES_EN[0]).toBe('Baisakh')
    expect(BS_MONTH_NAMES_EN[1]).toBe('Jestha')
    expect(BS_MONTH_NAMES_EN[2]).toBe('Ashadh')
    expect(BS_MONTH_NAMES_EN[3]).toBe('Shrawan')
    expect(BS_MONTH_NAMES_EN[4]).toBe('Bhadra')
    expect(BS_MONTH_NAMES_EN[5]).toBe('Ashwin')
    expect(BS_MONTH_NAMES_EN[6]).toBe('Kartik')
    expect(BS_MONTH_NAMES_EN[7]).toBe('Mangsir')
    expect(BS_MONTH_NAMES_EN[8]).toBe('Poush')
    expect(BS_MONTH_NAMES_EN[9]).toBe('Magh')
    expect(BS_MONTH_NAMES_EN[10]).toBe('Falgun')
    expect(BS_MONTH_NAMES_EN[11]).toBe('Chaitra')

    expect(BS_MONTH_NAMES_NE).toHaveLength(12)
    expect(BS_MONTH_NAMES_NE[0]).toBe('वैशाख')
    expect(BS_MONTH_NAMES_NE[4]).toBe('भदौ')
  })

  // 2. Test exact BS <-> AD conversions
  it('should accurately convert AD date to BS date (2026-08-22 -> 2083 Bhadra 6)', () => {
    const adDate = new Date('2026-08-22T00:00:00.000Z')
    const bs = calendarService.adToBs(adDate)

    expect(bs.year).toBe(2083)
    expect(bs.month).toBe(5) // Bhadra (5th BS Month)
    expect(bs.day).toBe(6)

    const formatted = calendarService.formatBSDate(adDate)
    expect(formatted).toBe('2083 Bhadra 6')
  })

  // 3. Test roundtrip conversion (BS -> AD -> BS)
  it('should preserve exact dates on BS -> AD -> BS roundtrip conversion', () => {
    const originalBs = { year: 2083, month: 5, day: 6 } // 2083 Bhadra 6
    const adDate = calendarService.bsToAd(originalBs.year, originalBs.month, originalBs.day)
    const reconvertedBs = calendarService.adToBs(adDate)

    expect(reconvertedBs.year).toBe(originalBs.year)
    expect(reconvertedBs.month).toBe(originalBs.month)
    expect(reconvertedBs.day).toBe(originalBs.day)
  })

  // 4. Test month days query
  it('should return valid day counts for BS months', () => {
    const daysInBhadra2083 = calendarService.getBSMonthDays(2083, 5)
    expect(daysInBhadra2083).toBeGreaterThanOrEqual(29)
    expect(daysInBhadra2083).toBeLessThanOrEqual(32)
  })

  // 5. Test Financial Year boundaries (Shrawan 1 vs Ashadh final day)
  it('should correctly calculate Nepal Financial Year across Shrawan 1st boundary', () => {
    // 2083 Bhadra 6 (Aug 2026) -> FY 2083/84
    const adBhadra = calendarService.bsToAd(2083, 5, 6)
    const fyBhadra = getCurrentFinancialYear(adBhadra)
    expect(fyBhadra.label).toBe('2083/84')
    expect(fyBhadra.shortLabel).toBe('83/84')

    // 2083 Shrawan 1 (Mid July 2026) -> FY 2083/84
    const adShrawan = calendarService.bsToAd(2083, 4, 1)
    const fyShrawan = getCurrentFinancialYear(adShrawan)
    expect(fyShrawan.label).toBe('2083/84')

    // 2083 Ashadh 31 (Before Shrawan 1) -> FY 2082/83
    const adAshadh = calendarService.bsToAd(2083, 3, 31)
    const fyAshadh = getCurrentFinancialYear(adAshadh)
    expect(fyAshadh.label).toBe('2082/83')
    expect(fyAshadh.shortLabel).toBe('82/83')
  })

  // 6. Test calendar grid layout structure
  it('should generate valid 7-column monthly calendar grid structure', () => {
    const grid = calendarService.getBSMonthCalendarGrid(2083, 5) // 2083 Bhadra

    expect(grid.bsYear).toBe(2083)
    expect(grid.bsMonth).toBe(5)
    expect(grid.monthNameEN).toBe('Bhadra')
    expect(grid.days.length).toBeGreaterThanOrEqual(35)
    expect(grid.days.length % 7).toBe(0) // Full 7-column alignment

    // Current month days count
    const currentMonthDays = grid.days.filter((d) => d.isCurrentMonth)
    expect(currentMonthDays.length).toBe(grid.daysInMonth)
  })

  // 7. Test offline capability (No HTTP calls required)
  it('should perform BS conversions completely offline without network dependency', () => {
    // Simulate offline status
    const originalOnline = window.navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })

    try {
      const bs = calendarService.getCurrentBSDate()
      expect(bs.year).toBeGreaterThanOrEqual(2080)

      const formatted = calendarService.formatBSDate(new Date(), { includeAD: true })
      expect(formatted).toContain('AD')
    } finally {
      Object.defineProperty(window.navigator, 'onLine', { value: originalOnline, configurable: true })
    }
  })
})
