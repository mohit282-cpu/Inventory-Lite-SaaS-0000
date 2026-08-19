import { Storage, Functions } from 'appwrite'
import { client, account, databases } from '@/lib/appwrite'

/**
 * Appwrite Configuration
 * 
 * Centralized Appwrite client configuration with proper tenant isolation support.
 * All Appwrite SDK instances are exported from here for application-wide consistency.
 */

export { client, account, databases }

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
  EXPENSES: 'expenses',
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
 * Get active business context for the current session
 */
export async function getActiveBusinessContext() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return null
    }
    return null
  } catch (error) {
    return null
  }
}
