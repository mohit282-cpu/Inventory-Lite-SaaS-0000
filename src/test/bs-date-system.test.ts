import { describe, it, expect } from 'vitest'
import {
  adToBS,
  bsToAD,
  formatBSDate,
  formatBSDateTime,
  formatBSMonth,
  formatBSYear,
  getBSFinancialYear,
  getBSDateRangeQuery,
  getNepalBusinessDate,
} from '@/lib/date/bs-date'
import { getCurrentFinancialYear, getFYFullLabel, getFYShortLabel } from '@/lib/financial-year'
import { generateStockLedgerPdf } from '@/lib/pdf/stock-ledger-pdf'
import { Business } from '@/types'

describe('Bikram Sambat (B.S.) Date System & Nepal Business Calendar', () => {
  describe('AD <-> BS Conversions', () => {
    it('converts known Gregorian AD dates to accurate BS dates', () => {
      // 2026-08-23 AD -> 2083-05-07 BS (Bhadra 7, 2083)
      const bs = adToBS('2026-08-23T10:00:00.000Z')
      expect(bs.year).toBe(2083)
      expect(bs.month).toBe(5)
      expect(bs.day).toBe(7)
    })

    it('converts BS dates back to Gregorian AD JavaScript Date objects', () => {
      const adDate = bsToAD(2083, 5, 7)
      expect(adDate.getFullYear()).toBe(2026)
      expect(adDate.getMonth()).toBe(7) // 7 = August (0-indexed)
      expect(adDate.getDate()).toBe(23)
    })

    it('handles BS year boundaries correctly (e.g. 2080 Chaitra end -> 2081 Baisakh 1)', () => {
      const lastDay2080BS = bsToAD(2080, 12, 31)
      const nextDayBS = adToBS(new Date(lastDay2080BS.getTime() + 24 * 60 * 60 * 1000))
      expect(nextDayBS.year).toBe(2081)
      expect(nextDayBS.month).toBe(1)
      expect(nextDayBS.day).toBe(1)
    })
  })

  describe('BS Date Formatting (formatBSDate & formatBSDateTime)', () => {
    it('formats AD timestamp into primary BS date format (YYYY/MM/DD)', () => {
      const formatted = formatBSDate('2026-08-23T14:30:00.000Z')
      expect(formatted).toBe('2083/05/07')
    })

    it('formats date into MEDIUM format with English month name', () => {
      const formatted = formatBSDate('2026-08-23T14:30:00.000Z', { format: 'MEDIUM' })
      expect(formatted).toBe('2083 Bhadra 7')
    })

    it('formats date into Devnagari Nepali representation when language is "ne"', () => {
      const formatted = formatBSDate('2026-08-23T14:30:00.000Z', { format: 'MEDIUM', language: 'ne' })
      expect(formatted).toBe('२०८३ भदौ ७')
    })

    it('supports subtle secondary AD display when requested', () => {
      const formatted = formatBSDate('2026-08-23T14:30:00.000Z', { includeAD: true })
      expect(formatted).toContain('2083/05/07 BS')
      expect(formatted).toContain('2026/08/23 AD')
    })

    it('formats date and time in Asia/Kathmandu business timezone', () => {
      const formatted = formatBSDateTime('2026-08-23T14:30:00.000Z')
      expect(formatted).toContain('2083/05/07')
    })

    it('formats time in 12-hour format with AM/PM by default', () => {
      const afternoon = formatBSDateTime(new Date(2026, 7, 23, 14, 30))
      expect(afternoon).toContain('02:30 PM')

      const midnight = formatBSDateTime(new Date(2026, 7, 23, 0, 15))
      expect(midnight).toContain('12:15 AM')

      const noon = formatBSDateTime(new Date(2026, 7, 23, 12, 45))
      expect(noon).toContain('12:45 PM')
    })

    it('supports explicit 24-hour format when requested', () => {
      const formatted = formatBSDateTime(new Date(2026, 7, 23, 14, 30), false, false)
      expect(formatted).toContain('14:30')
      expect(formatted).not.toMatch(/(AM|PM)/)
    })

    it('returns month names correctly for BS month numbers', () => {
      expect(formatBSMonth(1, 'en')).toBe('Baisakh')
      expect(formatBSMonth(5, 'en')).toBe('Bhadra')
      expect(formatBSMonth(5, 'ne')).toBe('भदौ')
    })

    it('returns BS Year number', () => {
      expect(formatBSYear('2026-08-23')).toBe(2083)
    })
  })

  describe('Bikram Sambat (B.S.) Financial Year Logic', () => {
    it('calculates BS Financial Year starting Shrawan 1st (BS Month 4)', () => {
      // 2026-08-23 (Bhadra 7, 2083 BS) -> FY 2083/84
      const fy = getBSFinancialYear('2026-08-23')
      expect(fy.label).toBe('2083/84')
      expect(fy.shortLabel).toBe('83/84')
      expect(fy.bsStartYear).toBe(2083)
      expect(fy.bsEndYear).toBe(2084)
    })

    it('handles FY transition from Ashadh 2083 (Month 3) to Shrawan 2083 (Month 4)', () => {
      // Ashadh 2083 (approx July 10, 2026 AD) -> FY 2082/83
      const fyAshadh = getCurrentFinancialYear('2026-07-10')
      expect(fyAshadh.label).toBe('2082/83')

      // Shrawan 2083 (approx July 20, 2026 AD) -> FY 2083/84
      const fyShrawan = getCurrentFinancialYear('2026-07-20')
      expect(fyShrawan.label).toBe('2083/84')
    })

    it('provides short and full labels for document prefixes', () => {
      expect(getFYFullLabel('2026-08-23')).toBe('2083/84')
      expect(getFYShortLabel('2026-08-23')).toBe('83/84')
    })
  })

  describe('BS Date Range Query Conversion', () => {
    it('converts BS date range strings (2083/05/01 to 2083/05/30) to ISO timestamps', () => {
      const range = getBSDateRangeQuery('2083/05/01', '2083/05/30')
      expect(range.isoFrom).toBeDefined()
      expect(range.isoTo).toBeDefined()

      const fromDate = new Date(range.isoFrom!)
      const toDate = new Date(range.isoTo!)

      expect(fromDate.getTime()).toBeLessThan(toDate.getTime())
    })
  })

  describe('Nepal Business Timezone Today Helper', () => {
    it('returns Nepal business date in Asia/Kathmandu timezone (+05:45)', () => {
      const today = getNepalBusinessDate()
      expect(today.bsDate.year).toBeGreaterThanOrEqual(2080)
      expect(today.formattedDate).toMatch(/^\d{4}\/\d{2}\/\d{2}$/)
      expect(today.financialYear.label).toMatch(/^\d{4}\/\d{2}$/)
    })
  })

  describe('Read-Only PDF Export Date Formatting', () => {
    it('generates stock ledger vector PDF with BS dates and BS financial year', () => {
      const dummyBusiness: Business = {
        $id: 'biz_001',
        $collectionId: 'businesses',
        $databaseId: 'main',
        $createdAt: '2026-01-01T00:00:00.000Z',
        $updatedAt: '2026-01-01T00:00:00.000Z',
        $permissions: [],
        name: 'Himalayan Traders',
        ownerId: 'usr_001',
        currency: 'NPR',
        timezone: 'Asia/Kathmandu',
        taxRegistrationType: 'VAT',
        taxRegistrationNumber: '123456789',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }

      const pdf = generateStockLedgerPdf({
        business: dummyBusiness,
        movements: [],
        products: [],
        dateFrom: '2083/05/01',
        dateTo: '2083/05/07',
      })

      expect(pdf).toBeDefined()
      const output = pdf.output('arraybuffer')
      expect(output.byteLength).toBeGreaterThan(1000)
    })
  })
})
