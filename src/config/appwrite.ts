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

import { AuthorizationError, classifyError } from '@/lib/error-handler'

/**
 * Get current session user with classified session error logging
 */
export async function getCurrentUser() {
  try {
    return await account.get()
  } catch (error: any) {
    const statusCode = error?.code || error?.statusCode || 500
    const category = classifyError(error)

    if (statusCode === 401 || category === 'AUTHENTICATION' || error?.type === 'user_unauthorized') {
      return null
    }

    const correlationId = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    console.error(`[Appwrite Auth Error] [${correlationId}]`, {
      correlationId,
      code: statusCode,
      category,
      message: error?.message || 'Session lookup failed',
      type: error?.type || 'unknown_auth_error',
    })
    return null
  }
}

/**
 * Get active business context for the current session with strict membership validation and error classification
 */
export async function getActiveBusinessContext(requestedBusinessId?: string) {
  const correlationId = `biz_ctx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

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

    // 1. Strict explicit requestedBusinessId validation: throw if requested businessId is not authorized
    if (requestedBusinessId && requestedBusinessId.trim() !== '') {
      const match = members.find((m) => m.businessId === requestedBusinessId)
      if (!match) {
        throw new AuthorizationError(
          `Invalid business context: User '${user.$id}' is not an authorized member of business '${requestedBusinessId}'`
        )
      }
      activeMember = match
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
  } catch (error: any) {
    if (
      error instanceof AuthorizationError ||
      error?.name === 'AuthorizationError' ||
      error?.message?.includes('Invalid business context') ||
      error?.message?.startsWith('Unauthorized:')
    ) {
      throw error
    }

    const category = classifyError(error)
    console.error(`[Appwrite Business Context Error] [${correlationId}]`, {
      correlationId,
      code: error?.code || error?.statusCode || 500,
      category,
      message: error?.message || 'Workspace context lookup failed',
    })
    return null
  }
}
