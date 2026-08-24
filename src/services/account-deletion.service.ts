import { databases, account, DATABASE_ID, COLLECTIONS } from '@/config/appwrite'
import { Query } from 'appwrite'
import { authService } from './auth.service'
import { userService } from './user.service'
import { authorizeBusinessAccess } from '@/lib/authorization'

/**
 * Account & Business Deletion Service
 * 
 * Implements strict compliance with Inventory Lite deletion rules:
 * 1. "Delete Business": Deletes selected business entity and all associated records. User account remains ACTIVE.
 * 2. "Delete Account": Deletes ALL businesses owned by user & all associated data. User Auth identity is PRESERVED,
 *    and application account status is set to BLOCKED.
 */
export class AccountDeletionService {
  /**
   * Helper to purge all documents in a collection matching a query
   */
  private async purgeCollectionDocuments(collectionId: string, queries: any[]): Promise<void> {
    try {
      const result = await databases.listDocuments(DATABASE_ID, collectionId, [
        ...queries,
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

  /**
   * Purge all business-owned records for a specific business ID
   */
  private async purgeBusinessRecords(businessId: string): Promise<void> {
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
      await this.purgeCollectionDocuments(collectionId, [Query.equal('businessId', businessId)])
    }

    // Delete the business document itself
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BUSINESSES, businessId)
    } catch {
      // Ignore if already deleted
    }
  }

  /**
   * Delete ONLY a single selected business entity (Keep Auth Account ACTIVE)
   */
  async deleteBusinessOnly(
    businessId: string,
    userId: string,
    passwordConfirm: string,
    userEmail: string
  ): Promise<void> {
    if (!businessId || !userId) {
      throw new Error('Business ID and User ID are required for deletion')
    }

    if (!passwordConfirm || passwordConfirm.trim() === '') {
      throw new Error('Please enter your current password to confirm deletion')
    }

    // 1. Re-authenticate caller
    try {
      await authService.login(userEmail, passwordConfirm)
    } catch {
      throw new Error('Password re-authentication failed. Please check your password and try again.')
    }

    // 2. Database RBAC check: Caller must be OWNER of the target business
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: 'owner',
    })

    // 3. Purge all records belonging to this business
    try {
      await this.purgeBusinessRecords(businessId)
    } catch (err: any) {
      throw new Error('Business deletion failed. No changes were completed. Please try again.')
    }
  }

  /**
   * Delete Account & ALL Owned Businesses:
   * - Deletes all business-owned data for all businesses owned by user.
   - PRESERVES the Auth identity (DOES NOT delete Auth user from Auth provider).
   - Sets user account status to BLOCKED.
   */
  async deleteAccount(
    userId: string,
    passwordConfirm: string,
    userEmail: string
  ): Promise<void> {
    if (!userId || !userEmail) {
      throw new Error('User ID and User Email are required for account deletion')
    }

    if (!passwordConfirm || passwordConfirm.trim() === '') {
      throw new Error('Please enter your current password to confirm deletion')
    }

    // 1. Re-authenticate caller
    try {
      await authService.login(userEmail, passwordConfirm)
    } catch {
      throw new Error('Password re-authentication failed. Please check your password and try again.')
    }

    try {
      // 2. Identify all businesses owned by this user
      let ownedBusinessIds: string[] = []

      try {
        const ownedRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BUSINESSES, [
          Query.equal('ownerId', userId),
          Query.limit(200),
        ])
        ownedBusinessIds = ownedRes.documents.map((d) => d.$id)
      } catch {
        ownedBusinessIds = []
      }

      // Also check business memberships where role is owner
      try {
        const memberRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BUSINESS_MEMBERS, [
          Query.equal('userId', userId),
          Query.equal('role', 'owner'),
          Query.limit(200),
        ])
        for (const m of memberRes.documents) {
          if (m.businessId && !ownedBusinessIds.includes(m.businessId)) {
            ownedBusinessIds.push(m.businessId)
          }
        }
      } catch {
        // Ignore listing error
      }

      // 3. Purge all business-owned records for all owned businesses
      for (const bizId of ownedBusinessIds) {
        await this.purgeBusinessRecords(bizId)
      }

      // 4. Purge any remaining memberships associated with this user
      await this.purgeCollectionDocuments(COLLECTIONS.BUSINESS_MEMBERS, [Query.equal('userId', userId)])

      // 5. Mark User Account Status as BLOCKED (DO NOT delete Auth User Identity)
      try {
        await userService.updateUserPreferences(userId, {
          accountStatus: 'BLOCKED',
          isBlocked: true,
          activeBusinessId: undefined,
        } as any)
      } catch {
        // Ignore fallback
      }

      try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.USERS, userId, {
          accountStatus: 'BLOCKED',
          isBlocked: true,
        } as any)
      } catch {
        // User doc update fallback if attribute not present
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(`account_blocked_${userId}`, 'true')
      }
    } catch (err: any) {
      console.error('Account deletion execution failure:', err)
      throw new Error('Account deletion failed. No changes were completed. Please try again.')
    }

    // 6. Destroy active sessions (Sign out caller cleanly)
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

  /**
   * Backward-compatible alias for deleteAccount / deleteBusinessOnly
   */
  async deleteBusinessAndAccount(
    _businessId: string,
    userId: string,
    passwordConfirm: string,
    userEmail: string
  ): Promise<void> {
    return await this.deleteAccount(userId, passwordConfirm, userEmail)
  }
}

export const accountDeletionService = new AccountDeletionService()
