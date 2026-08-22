import { describe, it, expect } from 'vitest'
import {
  formatNPR,
  formatNepalPhone,
  isValidNepalPhone,
  validatePAN,
  formatBSDate,
  toNepaliNumerals,
  convertADToBS,
  getSellerTaxLabel,
  getBillSummaryDetails,
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

  describe('Bill Summary & Seller Tax Display Rules', () => {
    it('should display PAN of seller when PAN is provided', () => {
      const res = getSellerTaxLabel({ panNumber: '600112233' })
      expect(res.formattedText).toBe('PAN of the seller: 600112233')
    })

    it('should display VAT of seller when VAT is provided', () => {
      const res = getSellerTaxLabel({ vatNumber: '100223344' })
      expect(res.formattedText).toBe('VAT of the seller: 100223344')
    })

    it('should display both PAN and VAT of seller when both are provided', () => {
      const res = getSellerTaxLabel({ panNumber: '600112233', vatNumber: '100223344' })
      expect(res.formattedText).toBe('PAN of the seller: 600112233 | VAT of the seller: 100223344')
    })

    it('CASE A: VAT OFF + Percentage Discount ON -> Hide VAT row completely', () => {
      const summary = getBillSummaryDetails({
        subtotal: 10000,
        discount: 1000,
        discountType: 'percentage',
        discountValue: 10,
        vatEnabled: false,
        tax: 0,
        total: 9000,
      })
      expect(summary.showDiscount).toBe(true)
      expect(summary.discountLabel).toBe('Discount (10%):')
      expect(summary.discountFormatted).toBe('- Rs. 1,000.00')
      expect(summary.showVat).toBe(false)
      expect(summary.showTaxableAmount).toBe(false)
      expect(summary.grandTotal).toBe(9000)
    })

    it('CASE B: VAT ON + Discount OFF -> Display Subtotal, VAT, Grand Total', () => {
      const summary = getBillSummaryDetails({
        subtotal: 10000,
        discount: 0,
        vatEnabled: true,
        vatRate: 13,
        tax: 1300,
        total: 11300,
      })
      expect(summary.showDiscount).toBe(false)
      expect(summary.showVat).toBe(true)
      expect(summary.vatLabel).toBe('VAT (13%):')
      expect(summary.vatFormatted).toBe('+ Rs. 1,300.00')
      expect(summary.grandTotal).toBe(11300)
    })

    it('CASE C: VAT ON + Percentage Discount ON -> Subtotal, Discount (10%), Taxable Amount, VAT (13%), Grand Total', () => {
      const summary = getBillSummaryDetails({
        subtotal: 10000,
        discount: 1000,
        discountType: 'percentage',
        discountValue: 10,
        vatEnabled: true,
        vatRate: 13,
        tax: 1170,
        total: 10170,
      })
      expect(summary.showDiscount).toBe(true)
      expect(summary.discountLabel).toBe('Discount (10%):')
      expect(summary.discountFormatted).toBe('- Rs. 1,000.00')
      expect(summary.showTaxableAmount).toBe(true)
      expect(summary.taxableAmount).toBe(9000)
      expect(summary.showVat).toBe(true)
      expect(summary.vatLabel).toBe('VAT (13%):')
      expect(summary.vatFormatted).toBe('+ Rs. 1,170.00')
      expect(summary.grandTotal).toBe(10170)
    })

    it('CASE D: VAT ON + Fixed Amount Discount ON -> Subtotal, Discount Amount: - Rs. 500.00, Taxable Amount, VAT (13%), Grand Total', () => {
      const summary = getBillSummaryDetails({
        subtotal: 10000,
        discount: 500,
        discountType: 'fixed',
        discountValue: 500,
        vatEnabled: true,
        vatRate: 13,
        tax: 1235,
        total: 10735,
      })
      expect(summary.showDiscount).toBe(true)
      expect(summary.discountLabel).toBe('Discount Amount:')
      expect(summary.discountFormatted).toBe('- Rs. 500.00')
      expect(summary.showTaxableAmount).toBe(true)
      expect(summary.taxableAmount).toBe(9500)
      expect(summary.showVat).toBe(true)
      expect(summary.vatFormatted).toBe('+ Rs. 1,235.00')
      expect(summary.grandTotal).toBe(10735)
    })

    it('CASE E: VAT OFF + Discount OFF -> Subtotal and Grand Total only', () => {
      const summary = getBillSummaryDetails({
        subtotal: 10000,
        discount: 0,
        vatEnabled: false,
        tax: 0,
        total: 10000,
      })
      expect(summary.showDiscount).toBe(false)
      expect(summary.showVat).toBe(false)
      expect(summary.showTaxableAmount).toBe(false)
      expect(summary.grandTotal).toBe(10000)
    })
  })
})
