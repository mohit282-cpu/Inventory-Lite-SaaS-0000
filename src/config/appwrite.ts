import { Storage, Functions, Query } from 'appwrite'
import { client, account, databases, getAppwriteConfig, validateAppwriteConfig } from '@/lib/appwrite'

/**
 * Appwrite Configuration
 * 
 * Centralized Appwrite client configuration with proper tenant isolation support.
 * All Appwrite SDK instances are exported from here for application-wide consistency.
 */

export { client, account, databases, getAppwriteConfig, validateAppwriteConfig }

// Initialize additional Appwrite services
export const storage = new Storage(client)
export const functions = new Functions(client)

// Database IDs
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'inventory_lite_db'

// Collection IDs
export const COLLECTIONS = {
  USERS: 'users',
  BUSINESSES: 'businesses',
  BUSINESS_MEMBERS: 'business_members',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  STOCK_MOVEMENTS: 'stock_movements',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  EXPENSES: 'expenses',
  FINANCIAL_SEQUENCES: 'financial_sequences',
  INVENTORY_LOCKS: 'inventory_locks',
  IDEMPOTENCY_KEYS: 'idempotency_keys',
  SUPPLIERS: 'suppliers',
  PURCHASES: 'purchases',
  PURCHASE_ITEMS: 'purchase_items',
  SUPPLIER_PAYMENTS: 'supplier_payments',
  SALES_RETURNS: 'sales_returns',
  SALES_RETURN_ITEMS: 'sales_return_items',
  CREDIT_NOTES: 'credit_notes',
  DEBIT_NOTES: 'debit_notes',
  STORE_ASSETS: 'store_assets',
  ACCOUNTS: 'accounts',
  JOURNAL_ENTRIES: 'journal_entries',
  JOURNAL_LINES: 'journal_lines',
  FISCAL_YEARS: 'fiscal_years',
  ACCOUNTING_PERIODS: 'accounting_periods',
  TAX_RATES: 'tax_rates',
  TAX_CATEGORIES: 'tax_categories',
  TAX_TRANSACTIONS: 'tax_transactions',
  CBMS_SUBMISSIONS: 'cbms_submissions',
  AUDIT_LOGS: 'audit_logs',
  RATE_LIMITS: 'rate_limits',
  USER_PREFERENCES: 'user_preferences',
  BUSINESS_ASSETS: 'business_assets',
  BUSINESS_ONBOARDING: 'business_onboarding',
} as const

// Storage Bucket IDs
export const BUCKETS = {
  PRODUCTS: 'product_images',
  LOGOS: 'business_logos',
  DOCUMENTS: 'documents',
} as const

/**
 * Get current session user
 */
export async function getCurrentUser() {
  try {
    return await account.get()
  } catch (error) {
    return null
  }
}

/**
 * Get active business context for the current session with preference & parameter resolution
 */
export async function getActiveBusinessContext(requestedBusinessId?: string) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return null
    }

    const membershipDocs = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.BUSINESS_MEMBERS,
      [Query.equal('userId', user.$id), Query.limit(100)]
    )

    if (membershipDocs.documents.length === 0) {
      return { user, businessId: null, role: null }
    }

    const members = membershipDocs.documents
    let activeMember = members[0]

    // 1. Check if explicit requestedBusinessId matches a valid membership
    if (requestedBusinessId && requestedBusinessId.trim() !== '') {
      const match = members.find((m) => m.businessId === requestedBusinessId)
      if (match) {
        activeMember = match
      }
    } else {
      // 2. Fall back to user's stored preferred active business ID if present
      try {
        const { userService } = await import('@/services/user.service')
        const profile = await userService.getUserProfile(user.$id)
        if (profile?.preferences?.activeBusinessId) {
          const match = members.find((m) => m.businessId === profile.preferences.activeBusinessId)
          if (match) {
            activeMember = match
          }
        }
      } catch {
        // Fall back to first membership if profile lookup fails
      }
    }

    return {
      user,
      businessId: activeMember.businessId as string,
      role: activeMember.role as string,
    }
  } catch (error) {
    return null
  }
}
