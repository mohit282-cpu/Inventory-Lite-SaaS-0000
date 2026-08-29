/**
 * Centralized Nepal Localization Utilities
 * 
 * Provides Nepalese currency formatting (Lakhs & Crores system),
 * Bikram Sambat (B.S.) date conversion, Nepal phone formatting,
 * PAN/VAT validation, and address helpers.
 */

// ==================== NPR Currency Formatting ====================

/**
 * Format a number according to the Nepalese Numbering System (Lakhs & Crores)
 * Example: 150000 -> "रु. 1,50,000.00"
 */
export function formatNPR(amount: number, showSymbol: boolean = true): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return showSymbol ? 'रु. 0.00' : '0.00'
  }

  const isNegative = amount < 0
  const absAmount = Math.abs(amount)
  const fixed = absAmount.toFixed(2)
  const [integerPart, decimalPart] = fixed.split('.')

  // Apply Nepalese Lakhs & Crores grouping (last 3 digits, then groups of 2)
  let formattedInteger = integerPart
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3)
    const otherDigits = integerPart.substring(0, integerPart.length - 3)
    const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
    formattedInteger = `${formattedOther},${lastThree}`
  }

  const formattedStr = `${isNegative ? '-' : ''}${formattedInteger}.${decimalPart}`
  return showSymbol ? `रु. ${formattedStr}` : formattedStr
}

// ==================== Nepal Phone Number Formatting ====================

/**
 * Format and validate Nepal phone numbers (Mobile: 98xxxxxxxx / 97xxxxxxxx, Landline: 01-xxxxxxx)
 */
export function formatNepalPhone(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')

  if (cleaned.length === 10 && (cleaned.startsWith('98') || cleaned.startsWith('97'))) {
    return `+977 ${cleaned.slice(0, 5)}-${cleaned.slice(5)}`
  }

  if ((cleaned.length === 8 || cleaned.length === 9) && cleaned.startsWith('01')) {
    return `+977 01-${cleaned.slice(2)}`
  }

  if (cleaned.startsWith('977') && (cleaned.length === 12 || cleaned.length === 13)) {
    return `+977 ${cleaned.slice(3, 8)}-${cleaned.slice(8)}`
  }

  return phone
}

/**
 * Validate Nepal phone number syntax
 */
export function isValidNepalPhone(phone: string): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/\D/g, '')
  // Mobile: 10 digits starting with 98 or 97, or with +977 prefix (12/13 digits)
  if (/^(977)?(98|97)\d{8}$/.test(cleaned)) return true
  // Landline: 8 or 9 digits starting with 01
  if (/^(977)?01\d{6,7}$/.test(cleaned)) return true
  return false
}

// ==================== PAN / VAT Validation ====================

/**
 * Validate 9-digit Nepalese Permanent Account Number (PAN / VAT)
 */
export function validatePAN(pan: string): boolean {
  if (!pan) return false
  const cleaned = pan.trim().replace(/\D/g, '')
  return /^[0-9]{9}$/.test(cleaned)
}

// ==================== Bikram Sambat (B.S.) Date Conversion ====================

import { calendarService } from '@/services/calendar.service'

const NEPALI_NUMERALS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

/**
 * Convert ASCII numbers to Nepali Devnagari numerals (e.g. 2083 -> २०८३)
 */
export function toNepaliNumerals(str: string | number): string {
  return String(str).replace(/[0-9]/g, (w) => NEPALI_NUMERALS[parseInt(w, 10)])
}

/**
 * Exact Gregorian (A.D.) to Bikram Sambat (B.S.) date conversion helper
 */
export function convertADToBS(dateInput: string | Date): { year: number; month: number; day: number } {
  return calendarService.adToBs(dateInput)
}

import { formatBSDate as formatBSDateCentral } from '@/lib/date/bs-date'

/**
 * Format a date string into displayable Bikram Sambat (B.S.) representation
 * Example: "2026-08-22" -> "2083/05/06" or "2083 Bhadra 6"
 */
export function formatBSDate(
  dateInput: string | Date,
  language: 'en' | 'ne' = 'en'
): string {
  if (language === 'ne') {
    return formatBSDateCentral(dateInput, { format: 'MEDIUM', language: 'ne' })
  }
  const formattedStr = formatBSDateCentral(dateInput, { format: 'YYYY/MM/DD', language: 'en' })
  return `${formattedStr} B.S.`
}

// ==================== Structured Nepal Address Helper ====================

export interface NepalAddress {
  ward?: string
  municipality?: string
  district?: string
  province?: string
}

/**
 * Format a structured Nepal business address
 * Example: "Ward 4, Kathmandu Metropolitan City, Kathmandu, Bagmati Province"
 */
export function formatAddressNepal(addr: NepalAddress): string {
  const parts: string[] = []
  if (addr.ward) parts.push(`Ward No. ${addr.ward}`)
  if (addr.municipality) parts.push(addr.municipality)
  if (addr.district) parts.push(addr.district)
  if (addr.province) parts.push(`${addr.province} Province`)
  return parts.length > 0 ? parts.join(', ') : 'Nepal'
}

/**
 * Calculate the Nepalese Fiscal Year (BS) code for any given date.
 * Nepal fiscal year starts Shrawan 1st (mid-July AD ~ July 16).
 * Example: 2026-08-22 (August 2026) -> "83/84" (Fiscal Year 2083/84)
 * Example: 2024-05-10 (May 2024) -> "80/81" (Fiscal Year 2080/81)
 */
export function getFiscalYearCode(dateInput?: string | Date): string {
  const d = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date()
  const validDate = isNaN(d.getTime()) ? new Date() : d

  const year = validDate.getFullYear()
  const month = validDate.getMonth() // 0-indexed (0 = Jan, 6 = July)
  const day = validDate.getDate()

  // Shrawan 1st in Nepal is approx July 16 in Gregorian calendar
  const isAfterShrawan1 = month > 6 || (month === 6 && day >= 16)

  let bsYear = year + 57
  if (!isAfterShrawan1) {
    bsYear -= 1
  }

  const startYearShort = bsYear.toString().slice(-2)
  const endYearShort = (bsYear + 1).toString().slice(-2)

  return `${startYearShort}/${endYearShort}`
}

import type { TaxRegistrationType } from '@/types'
export type { TaxRegistrationType }

export const DEFAULT_VAT_RATE = 13

/**
 * Derives effective tax registration type and number from business configuration with backward compatibility.
 */
export function getEffectiveTaxRegistration(business?: {
  taxRegistrationType?: TaxRegistrationType | string
  taxRegistrationNumber?: string
  vatNumber?: string
  panNumber?: string
} | null): {
  type: TaxRegistrationType
  number: string
} {
  if (!business) {
    return { type: 'NONE', number: '' }
  }

  if (
    business.taxRegistrationType === 'VAT' ||
    business.taxRegistrationType === 'PAN' ||
    business.taxRegistrationType === 'NONE'
  ) {
    const type = business.taxRegistrationType as TaxRegistrationType
    const number =
      business.taxRegistrationNumber ||
      (type === 'VAT' ? business.vatNumber : type === 'PAN' ? business.panNumber : '') ||
      ''
    return { type, number: number.trim() }
  }

  // Legacy fallback if taxRegistrationType is not explicitly set
  const vat = business.vatNumber?.trim()
  const pan = business.panNumber?.trim()

  if (vat) {
    return { type: 'VAT', number: vat }
  }
  if (pan) {
    return { type: 'PAN', number: pan }
  }
  return { type: 'NONE', number: '' }
}

/**
 * Determines default invoice VAT state based on business tax registration configuration.
 * VAT Business -> Default ON (13%)
 * PAN / NONE Business -> Default OFF
 */
export function getDefaultVatState(business?: {
  taxRegistrationType?: TaxRegistrationType | string
  taxRegistrationNumber?: string
  vatNumber?: string
  panNumber?: string
} | null): { vatEnabled: boolean; vatRate: number } {
  const { type } = getEffectiveTaxRegistration(business)
  if (type === 'VAT') {
    return { vatEnabled: true, vatRate: DEFAULT_VAT_RATE }
  }
  return { vatEnabled: false, vatRate: DEFAULT_VAT_RATE }
}

/**
 * Format seller Tax Registration label according to Nepal IRD bill requirements.
 */
export function getSellerTaxLabel(business?: {
  taxRegistrationType?: TaxRegistrationType | string
  taxRegistrationNumber?: string
  panNumber?: string
  vatNumber?: string
} | null): {
  pan?: string
  vat?: string
  formattedText: string
} {
  const pan = business?.panNumber?.trim()
  const vat = business?.vatNumber?.trim()

  if (pan && vat && !business?.taxRegistrationType) {
    return {
      pan,
      vat,
      formattedText: `PAN of the seller: ${pan} | VAT of the seller: ${vat}`,
    }
  }

  const { type, number } = getEffectiveTaxRegistration(business)

  if (type === 'VAT') {
    return {
      vat: number,
      pan: pan || undefined,
      formattedText: `VAT of the seller: ${number}`,
    }
  }

  if (type === 'PAN') {
    return {
      pan: number,
      vat: vat || undefined,
      formattedText: `PAN of the seller: ${number}`,
    }
  }

  return {
    formattedText: 'PAN/VAT of the seller: N/A',
  }
}

export interface BillSummaryDetails {
  subtotal: number
  showDiscount: boolean
  discountType: 'percentage' | 'fixed' | 'amount'
  discountValue: number
  discountAmount: number
  discountLabel: string
  discountFormatted: string
  showTaxableAmount: boolean
  taxableAmount: number
  showVat: boolean
  vatRate: number
  vatAmount: number
  vatLabel: string
  vatFormatted: string
  grandTotal: number
  paidAmount: number
  dueAmount: number
  changeAmount: number
  invoiceTitleEn: string
  invoiceTitleNe: string
}

/**
 * Calculate consistent Bill Summary Details according to actual transaction settings.
 * Ensures Discount and VAT are displayed cleanly and accurately across all bill formats.
 */
export function getBillSummaryDetails(sale: {
  subtotal: number
  discount?: number
  discountType?: string
  discountValue?: number
  taxableAmount?: number
  tax?: number
  vatAmount?: number
  vatEnabled?: boolean
  vatRate?: number
  taxRate?: number
  total: number
  paidAmount?: number
  dueAmount?: number
  changeAmount?: number
  businessTaxType?: TaxRegistrationType | string
}): BillSummaryDetails {
  const subtotal = sale.subtotal || 0
  const discountAmount = sale.discount || 0
  const showDiscount = discountAmount > 0

  let discountType: 'percentage' | 'fixed' | 'amount' = 'fixed'
  let discountValue = sale.discountValue || 0

  if (sale.discountType === 'percentage' || sale.discountType === 'percent') {
    discountType = 'percentage'
    if (!discountValue && subtotal > 0) {
      discountValue = Math.round((discountAmount / subtotal) * 100)
    }
  } else if (sale.discountType === 'fixed' || sale.discountType === 'amount') {
    discountType = 'fixed'
    discountValue = discountAmount
  } else if (discountValue > 0 && subtotal > 0 && Math.abs((subtotal * discountValue / 100) - discountAmount) < 0.05) {
    discountType = 'percentage'
  } else if (subtotal > 0 && discountAmount > 0) {
    const calcPct = (discountAmount / subtotal) * 100
    if (Number.isInteger(calcPct) && Math.abs((subtotal * calcPct / 100) - discountAmount) < 0.01) {
      discountType = 'percentage'
      discountValue = calcPct
    } else {
      discountType = 'fixed'
      discountValue = discountAmount
    }
  } else {
    discountType = 'fixed'
    discountValue = discountAmount
  }

  const discountLabel = discountType === 'percentage' ? `Discount (${discountValue}%):` : 'Discount Amount:'
  const discountFormatted = `- Rs. ${formatNPR(discountAmount, false)}`

  // Determine VAT status
  const vatAmount = sale.vatAmount ?? sale.tax ?? 0

  let showVat = false
  if (sale.vatEnabled !== undefined) {
    showVat = Boolean(sale.vatEnabled)
  } else {
    showVat = vatAmount > 0
  }

  const taxableAmount = sale.taxableAmount ?? Math.max(0, subtotal - discountAmount)
  let vatRate = sale.vatRate ?? sale.taxRate ?? 13
  if (showVat && vatAmount > 0 && taxableAmount > 0) {
    const derivedRate = Math.round((vatAmount / taxableAmount) * 100)
    if (derivedRate > 0) {
      vatRate = derivedRate
    }
  }

  const showTaxableAmount = showVat && showDiscount

  const vatLabel = `VAT (${vatRate}%):`
  const vatFormatted = `+ Rs. ${formatNPR(vatAmount, false)}`

  const grandTotal = sale.total || 0
  const paidAmount = sale.paidAmount || 0
  const dueAmount = sale.dueAmount || 0
  const changeAmount = sale.changeAmount ?? Math.max(0, paidAmount - grandTotal)

  const isVatBusiness = sale.businessTaxType === 'VAT'
  const invoiceTitleEn = isVatBusiness ? 'TAX INVOICE' : 'INVOICE'
  const invoiceTitleNe = isVatBusiness ? 'कर बिजक' : 'बिजक'

  return {
    subtotal,
    showDiscount,
    discountType,
    discountValue,
    discountAmount,
    discountLabel,
    discountFormatted,
    showTaxableAmount,
    taxableAmount,
    showVat,
    vatRate,
    vatAmount,
    vatLabel,
    vatFormatted,
    grandTotal,
    paidAmount,
    dueAmount,
    changeAmount,
    invoiceTitleEn,
    invoiceTitleNe,
  }
}
