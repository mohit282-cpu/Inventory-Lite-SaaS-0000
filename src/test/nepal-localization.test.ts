import { describe, it, expect } from 'vitest'
import {
  formatNPR,
  formatNepalPhone,
  isValidNepalPhone,
  validatePAN,
  formatBSDate,
  toNepaliNumerals,
  convertADToBS,
} from '@/lib/localization'
import { getTranslation } from '@/config/i18n'

describe('Nepal Localization System', () => {
  describe('Nepalese Numbering System Currency Formatting (formatNPR)', () => {
    it('should format numbers according to Nepalese Lakhs & Crores grouping', () => {
      expect(formatNPR(150000)).toBe('रु. 1,50,000.00')
      expect(formatNPR(1234567.5)).toBe('रु. 12,34,567.50')
      expect(formatNPR(10000000)).toBe('रु. 1,00,00,000.00')
    })

    it('should handle zero and negative values gracefully', () => {
      expect(formatNPR(0)).toBe('रु. 0.00')
      expect(formatNPR(-2500)).toBe('रु. -2,500.00')
    })

    it('should support toggling currency symbol', () => {
      expect(formatNPR(50000, false)).toBe('50,000.00')
    })
  })

  describe('Nepal Phone Formatting & Validation', () => {
    it('should format 10-digit mobile numbers with +977 prefix', () => {
      expect(formatNepalPhone('9801234567')).toBe('+977 98012-34567')
    })

    it('should format landline numbers starting with 01', () => {
      expect(formatNepalPhone('014455667')).toBe('+977 01-4455667')
    })

    it('should validate valid Nepal mobile and landline numbers', () => {
      expect(isValidNepalPhone('9801234567')).toBe(true)
      expect(isValidNepalPhone('9741234567')).toBe(true)
      expect(isValidNepalPhone('014455667')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(isValidNepalPhone('12345')).toBe(false)
      expect(isValidNepalPhone('1234567890')).toBe(false)
    })
  })

  describe('PAN / VAT Validation', () => {
    it('should validate 9-digit PAN/VAT numbers', () => {
      expect(validatePAN('600112233')).toBe(true)
      expect(validatePAN(' 100223344 ')).toBe(true)
    })

    it('should reject invalid PAN numbers', () => {
      expect(validatePAN('12345')).toBe(false)
      expect(validatePAN('ABC123456')).toBe(false)
    })
  })

  describe('Bikram Sambat (B.S.) Date Converter', () => {
    it('should convert Gregorian AD years to Bikram Sambat BS', () => {
      const bs = convertADToBS('2026-08-19')
      expect(bs.year).toBe(2083)
    })

    it('should format displayable BS date string in English', () => {
      const formatted = formatBSDate('2026-08-19', 'en')
      expect(formatted).toContain('2083')
      expect(formatted).toContain('B.S.')
    })

    it('should format displayable BS date string in Nepali Devnagari numerals', () => {
      const formatted = formatBSDate('2026-08-19', 'ne')
      expect(formatted).toContain('२०८३')
    })

    it('should convert numbers to Nepali numerals', () => {
      expect(toNepaliNumerals('1234567890')).toBe('१२३४५६७८९०')
    })
  })

  describe('Centralized i18n Translation Dictionary', () => {
    it('should resolve English and Nepali translation keys', () => {
      expect(getTranslation('en', 'nav.dashboard')).toBe('Dashboard')
      expect(getTranslation('ne', 'nav.dashboard')).toBe('ड्यासबोर्ड')
      expect(getTranslation('ne', 'common.vat')).toBe('मू.अ.कर (१३%)')
    })
  })
})
