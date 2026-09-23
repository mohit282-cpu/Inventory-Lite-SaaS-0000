import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for Tailwind-specific merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency based on locale and currency code
 * Standardizes output across dashboard and reports with thousands separators (e.g., NPR 11,000.00)
 */
export function formatCurrency(amount: number | null | undefined, currency: string = 'NPR'): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  const formattedNumber = safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const code = (currency || 'NPR').trim()
  if (code === 'NPR') {
    return `NPR ${formattedNumber}`
  }
  if (code === 'रु.') {
    return `रु. ${formattedNumber}`
  }
  if (code === 'Rs.' || code === 'Rs') {
    return `Rs. ${formattedNumber}`
  }
  return `${code} ${formattedNumber}`
}

export interface GrossProfitMetrics {
  grossProfit: number
  grossMarginPercent: number | null
  formattedGrossProfit: string
  formattedGrossMargin: string
  isLoss: boolean
  isZeroCost: boolean
}

/**
 * Calculate Gross Profit and Gross Margin for product pricing metrics.
 * 
 * Rules:
 * - Gross Profit = Selling Price - Purchase Price
 * - Gross Margin = (Gross Profit / Selling Price) * 100
 * - If Purchase Price is 0 or Selling Price is 0, Gross Margin displays "N/A" (never NaN or Infinity)
 * - Format negative profit cleanly (e.g. -Rs. 5.00 or -NPR 5.00)
 */
export function calculateGrossProfitMetrics(
  sellingPrice: number | null | undefined,
  purchasePrice: number | null | undefined,
  currency: string = 'Rs.'
): GrossProfitMetrics {
  const safeSelling = typeof sellingPrice === 'number' && !isNaN(sellingPrice) ? sellingPrice : 0
  const safePurchase = typeof purchasePrice === 'number' && !isNaN(purchasePrice) ? purchasePrice : 0

  const grossProfit = safeSelling - safePurchase
  const isLoss = grossProfit < 0
  const isZeroCost = safePurchase === 0

  let formattedGrossProfit: string
  if (isLoss) {
    const absFormatted = formatCurrency(Math.abs(grossProfit), currency)
    formattedGrossProfit = `-${absFormatted}`
  } else {
    formattedGrossProfit = formatCurrency(grossProfit, currency)
  }

  let grossMarginPercent: number | null = null
  let formattedGrossMargin = 'N/A'

  if (safePurchase > 0 && safeSelling > 0) {
    const marginRatio = (grossProfit / safeSelling) * 100
    if (!isNaN(marginRatio) && isFinite(marginRatio)) {
      grossMarginPercent = marginRatio
      formattedGrossMargin = `${marginRatio.toFixed(1)}%`
    }
  }

  return {
    grossProfit,
    grossMarginPercent,
    formattedGrossProfit,
    formattedGrossMargin,
    isLoss,
    isZeroCost,
  }
}

/**
 * Format raw payment method enum strings into clean presentation labels.
 * E.g., 'full_udhaar' -> 'Full Udhaar', 'cash' -> 'Cash', 'bank_transfer' -> 'Bank Transfer'
 */
export function formatPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return 'Cash'
  const raw = String(method).trim().toLowerCase()
  switch (raw) {
    case 'cash':
      return 'Cash'
    case 'full_udhaar':
    case 'udhaar':
      return 'Full Udhaar'
    case 'partial_udhaar':
      return 'Partial Udhaar'
    case 'bank_transfer':
    case 'bank':
      return 'Bank Transfer'
    case 'digital_wallet':
    case 'wallet':
    case 'mobile_payment':
    case 'qr_code':
    case 'esewa':
    case 'khalti':
    case 'fonepay':
      return 'Mobile Payment'
    case 'card':
    case 'credit_card':
      return 'Card'
    default:
      return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

/**
 * Format raw movement type enum strings into human-readable presentation labels.
 * E.g., 'stock_in' -> 'Stock In', 'STOCK_OUT' -> 'Stock Out', 'adjustment' -> 'Adjustment'
 */
export function formatMovementTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Movement'
  const raw = String(type).trim().toLowerCase()
  switch (raw) {
    case 'stock_in':
    case 'in':
      return 'Stock In'
    case 'stock_out':
    case 'out':
      return 'Stock Out'
    case 'adjustment':
    case 'stock_adjustment':
      return 'Adjustment'
    case 'sale':
      return 'Sale'
    case 'purchase':
      return 'Purchase'
    case 'return':
    case 'sales_return':
      return 'Return'
    case 'damage':
    case 'spoilage':
      return 'Damage'
    case 'opening_stock':
    case 'opening':
      return 'Opening Stock'
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

/**
 * Map API/Appwrite error instances to user-friendly messages.
 * Prevents raw database or network exceptions from leaking to the UI.
 */
export function mapStockError(err: any): string {
  if (!err) return 'Unable to update stock. Please try again.'
  const msg = typeof err === 'string' ? err : err.message || ''

  if (msg.includes('Insufficient stock')) return msg
  if (msg.includes('CONCURRENCY_CONFLICT')) {
    return 'Stock was modified by another transaction. Please review the latest stock and retry.'
  }
  if (msg.includes('Forbidden') || msg.includes('Unauthorized') || msg.includes('403')) {
    return "You don't have permission to perform this stock operation."
  }
  if (msg.includes('404') || msg.includes('not found') || msg.includes('Document')) {
    return 'The selected product is no longer available. Please refresh and try again.'
  }
  if (msg.includes('Network') || msg.includes('fetch') || msg.includes('offline')) {
    return 'Unable to update stock due to a network connection error. Check your connection and retry.'
  }

  return msg || 'Unable to update stock. Please try again.'
}

/**
 * Format sales transaction into a standardized human-readable invoice number.
 * Example: INV-83/84-000001 (never displays raw internal database IDs)
 */
export function formatHumanInvoiceNumber(sale: any, defaultFy: string = '83/84'): string {
  if (!sale) return `INV-${defaultFy}-000000`
  if (typeof sale === 'string') {
    if (sale.startsWith('INV-') || sale.startsWith('SALE-')) return sale.replace('SALE-', 'INV-')
    return `INV-${defaultFy}-${sale.slice(-6).toUpperCase()}`
  }
  if (sale.invoiceNumber && sale.invoiceNumber.trim() !== '' && !sale.invoiceNumber.includes('_')) {
    return sale.invoiceNumber
  }
  if (sale.saleNumber && sale.saleNumber.trim() !== '') {
    return sale.saleNumber.replace('SALE-', 'INV-')
  }
  if (sale.billNumber && sale.billNumber.trim() !== '') {
    return sale.billNumber.replace('BILL-', 'INV-')
  }
  const idStr = String(sale.$id || sale.id || '000000')
  return `INV-${defaultFy}-${idStr.slice(-6).toUpperCase()}`
}

/**
 * Format purchase transaction into a standardized human-readable purchase number.
 * Example: PUR-83/84-000001
 */
export function formatHumanPurchaseNumber(purchase: any, defaultFy: string = '83/84'): string {
  if (!purchase) return `PUR-${defaultFy}-000000`
  if (typeof purchase === 'string') {
    if (purchase.startsWith('PUR-') || purchase.startsWith('BILL-')) return purchase.replace('BILL-', 'PUR-')
    return `PUR-${defaultFy}-${purchase.slice(-6).toUpperCase()}`
  }
  if (purchase.purchaseNumber && purchase.purchaseNumber.trim() !== '') {
    return purchase.purchaseNumber
  }
  if (purchase.billNumber && purchase.billNumber.trim() !== '') {
    return purchase.billNumber.replace('BILL-', 'PUR-')
  }
  if (purchase.supplierInvoiceNumber && purchase.supplierInvoiceNumber.trim() !== '') {
    return purchase.supplierInvoiceNumber
  }
  const idStr = String(purchase.$id || purchase.id || '000000')
  return `PUR-${defaultFy}-${idStr.slice(-6).toUpperCase()}`
}

/**
 * Format date based on locale and format string
 */
export function formatDate(date: string | Date, format: string = 'DD/MM/YYYY'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Simple formatting - can be enhanced with date-fns
  const day = dateObj.getDate().toString().padStart(2, '0')
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0')
  const year = dateObj.getFullYear()
  
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year.toString())
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return 'just now'
  }
  if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)} minutes ago`
  }
  if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)} hours ago`
  }
  if (diffInSeconds < 604800) {
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }
  
  return formatDate(dateObj)
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.slice(0, maxLength) + '...'
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Check if running on client side
 */
export function isClient(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Check if running on server side
 */
export function isServer(): boolean {
  return typeof window === 'undefined'
}

/**
 * Format any phone number into E.164 international standard (+ country code + digits)
 * E.g., '9841234567' -> '+9779841234567'
 */
export function formatE164Phone(phone: string): string {
  if (!phone || phone.trim() === '') return ''
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) {
    return trimmed
  }
  const digitsOnly = trimmed.replace(/\D/g, '')
  if (!digitsOnly) return ''

  if (digitsOnly.startsWith('977')) {
    return `+${digitsOnly}`
  }
  if (digitsOnly.length === 10 && (digitsOnly.startsWith('98') || digitsOnly.startsWith('97') || digitsOnly.startsWith('96'))) {
    return `+977${digitsOnly}`
  }
  if (digitsOnly.startsWith('0')) {
    return `+977${digitsOnly.substring(1)}`
  }
  return `+${digitsOnly}`
}

/**
 * Sanitize document IDs to guarantee strict compliance with Appwrite documentId requirements:
 * 1. Must contain at most 36 chars.
 * 2. Valid chars are a-z, A-Z, 0-9, period (.), hyphen (-), and underscore (_).
 * 3. Can't start with a special char (must start with a-z, A-Z, 0-9).
 */
export function sanitizeAppwriteDocId(id: string | undefined | null, prefix = 'doc'): string {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    return `${prefix}_${Math.random().toString(36).substring(2, 10)}`.substring(0, 36)
  }

  const raw = id.trim()
  
  // Replace invalid characters with underscore
  let sanitized = raw.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Remove leading non-alphanumeric characters (., -, _)
  sanitized = sanitized.replace(/^[^a-zA-Z0-9]+/, '')

  // Fallback if empty after stripping
  if (!sanitized) {
    sanitized = `${prefix}_${Math.random().toString(36).substring(2, 10)}`
  }

  // Ensure first character is alphanumeric
  if (!/^[a-zA-Z0-9]/.test(sanitized)) {
    sanitized = `d_${sanitized}`
  }

  // Handle max length 36 limit gracefully using deterministic hashing
  if (sanitized.length > 36) {
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    const hashStr = Math.abs(hash).toString(36)
    // Keep first 28 chars + '_' + hash (up to 7 chars) = <= 36 chars
    sanitized = `${sanitized.substring(0, 28)}_${hashStr}`.substring(0, 36)
  }

  return sanitized
}
