import { databases, account, DATABASE_ID, COLLECTIONS } from '@/config/appwrite'
import { Query } from 'appwrite'
import { authService } from './auth.service'
import { authorizeBusinessAccess } from '@/lib/authorization'

/**
 * Account & Business Deletion Service
 * 
 * Handles multi-tenant cascade deletion of a business, its operational records,
 * and the authenticated user account when initiated by a verified Business Owner.
 */
export class AccountDeletionService {
  /**
   * Permanently delete a business entity and all associated records
   */
  async deleteBusinessAndAccount(
    businessId: string,
    userId: string,
    passwordConfirm: string,
    userEmail: string
  ): Promise<void> {
    if (!businessId || !userId) {
      throw new Error('Business ID and User ID are required for account deletion')
    }

    if (!passwordConfirm || passwordConfirm.trim() === '') {
      throw new Error('Please enter your current password to confirm deletion')
    }

    // 1. Re-authenticate caller to ensure current password is valid
    try {
      await authService.login(userEmail, passwordConfirm)
    } catch {
      throw new Error('Password re-authentication failed. Please check your password and try again.')
    }

    // 2. Strict Database RBAC verification: Caller must be OWNER of the business
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: 'owner',
    })

    // 3. Batch delete all tenant-scoped collection records
    const collectionsToPurge = [
      COLLECTIONS.PRODUCTS,
      COLLECTIONS.CATEGORIES,
      COLLECTIONS.STOCK_MOVEMENTS,
      COLLECTIONS.CUSTOMERS,
      COLLECTIONS.SALES,
      COLLECTIONS.SALE_ITEMS,
      COLLECTIONS.INVOICES,
      COLLECTIONS.PAYMENTS,
      COLLECTIONS.EXPENSES,
      COLLECTIONS.BUSINESS_MEMBERS,
    ]

    for (const collectionId of collectionsToPurge) {
      try {
        const result = await databases.listDocuments(DATABASE_ID, collectionId, [
          Query.equal('businessId', businessId),
          Query.limit(500),
        ])

        for (const doc of result.documents) {
          try {
            await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id)
          } catch {
            // Continue purging remaining documents
          }
        }
      } catch {
        // Collection might be empty or uninitialized
      }
    }

    // 4. Delete the business document
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BUSINESSES, businessId)
    } catch {
      // Ignore if already deleted
    }

    // 5. Delete user profile document from database
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.USERS, userId)
    } catch {
      // Ignore if user profile deleted
    }

    // 6. Delete user account from Appwrite Authentication (Server REST API / Users API)
    try {
      const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
      const apiKey = process.env.APPWRITE_API_KEY

      if (apiKey && projectId) {
        await fetch(`${endpoint}/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Appwrite-Project': projectId,
            'X-Appwrite-Key': apiKey,
          },
        })
      }
    } catch {
      // Fallback silently if API key is not configured or user already deleted
    }

    // 7. Purge local offline auth records & IndexedDB cached identity
    try {
      const { offlineAuthService } = await import('@/lib/offline/offline-auth.service')
      await offlineAuthService.clearOfflineRecord(userId)
      if (userEmail) {
        await offlineAuthService.clearOfflineRecord(userEmail)
      }
    } catch {
      // Fallback silently if offline DB is unavailable
    }

    // 8. Destroy all active Appwrite sessions cleanly (Logout caller)
    try {
      await account.deleteSessions()
    } catch {
      try {
        await account.deleteSession('current')
      } catch {
        // Session already destroyed
      }
    }
  }
}

export const accountDeletionService = new AccountDeletionService()
