import { Client, Account, Databases, Storage, Functions } from 'appwrite'

/**
 * Appwrite Configuration
 * 
 * Centralized Appwrite client configuration with proper tenant isolation support.
 * All Appwrite SDK instances are initialized here to ensure consistency.
 */

const client = new Client()

if (typeof window !== 'undefined') {
  client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
}

// Initialize Appwrite services
export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
export const functions = new Functions(client)

// Database IDs (These should be configured in Appwrite console)
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'inventory_lite_db'

// Collection IDs (to be configured in Appwrite)
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

// Storage Bucket IDs (to be configured in Appwrite)
export const BUCKETS = {
  PRODUCTS: 'product_images',
  LOGOS: 'business_logos',
  DOCUMENTS: 'documents',
} as const

/**
 * Get current session user
 * Returns the currently authenticated user account
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
 * This is crucial for multi-tenant isolation
 */
export async function getActiveBusinessContext() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return null
    }
    
    // Get user's active business from session or preferences
    // This will be implemented when we build the membership system
    return null
  } catch (error) {
    return null
  }
}
