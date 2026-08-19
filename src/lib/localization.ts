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

const NEPALI_MONTHS_EN = [
  'Baisakh',
  'Jeth',
  'Asar',
  'Shrawan',
  'Bhadra',
  'Asoj',
  'Kattik',
  'Mangsir',
  'Poush',
  'Magh',
  'Fagun',
  'Chait',
]

const NEPALI_MONTHS_NE = [
  'वैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कात्तिक',
  'मंसिर',
  'पुस',
  'माघ',
  'फागुन',
  'चैत',
]

const NEPALI_NUMERALS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

/**
 * Convert ASCII numbers to Nepali Devnagari numerals (e.g. 2083 -> २०८३)
 */
export function toNepaliNumerals(str: string | number): string {
  return String(str).replace(/[0-9]/g, (w) => NEPALI_NUMERALS[parseInt(w, 10)])
}

/**
 * Approximate Gregorian (A.D.) to Bikram Sambat (B.S.) date conversion helper
 * Gregorian year + 56/57 years offset
 */
export function convertADToBS(dateInput: string | Date): { year: number; month: number; day: number } {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) {
    return { year: 2081, month: 1, day: 1 }
  }

  const year = d.getFullYear()
  const month = d.getMonth() // 0-indexed (0 = Jan)
  const day = d.getDate()

  // Nepal BS is ~56 years & 8.5 months ahead of AD
  let bsYear = year + 57
  let bsMonth = month + 9 // Jan -> Magh (month index 9)

  if (bsMonth > 12) {
    bsMonth -= 12
  } else {
    bsYear -= 1
  }

  return {
    year: bsYear,
    month: Math.max(1, Math.min(12, bsMonth)),
    day,
  }
}

/**
 * Format a date string into displayable Bikram Sambat (B.S.) representation
 * Example: "2026-08-19" -> "2083 Bhadra 3 B.S." (English) or "२०८३ भदौ ३" (Nepali)
 */
export function formatBSDate(
  dateInput: string | Date,
  language: 'en' | 'ne' = 'en'
): string {
  const { year, month, day } = convertADToBS(dateInput)

  if (language === 'ne') {
    const monthName = NEPALI_MONTHS_NE[month - 1] || 'वैशाख'
    return `${toNepaliNumerals(year)} ${monthName} ${toNepaliNumerals(day)}`
  }

  const monthName = NEPALI_MONTHS_EN[month - 1] || 'Baisakh'
  return `${year} ${monthName} ${day} B.S.`
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
