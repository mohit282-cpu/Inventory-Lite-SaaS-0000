import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatNPR } from "./localization"

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes and tailwind-merge for Tailwind-specific merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency based on locale and currency code
 */
export function formatCurrency(amount: number, currency: string = 'NPR', locale: string = 'en-NP'): string {
  if (currency === 'NPR' || currency === 'रु.') {
    return formatNPR(amount, true)
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
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
