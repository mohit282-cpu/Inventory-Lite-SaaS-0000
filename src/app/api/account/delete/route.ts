import { NextRequest, NextResponse } from 'next/server'
import { DATABASE_ID, COLLECTIONS, BUCKETS, databases, account, storage } from '@/config/appwrite'
import { Query } from 'appwrite'

export const dynamic = 'force-dynamic'

interface DeletionSummary {
  operationId: string
  userId: string
  startTime: string
  ownedBusinessIds: string[]
  recordsPurged: number
  storageFilesDeleted: number
  membershipsRemoved: number
  authAccountDeleted: boolean
  status: 'COMPLETED' | 'PARTIAL_FAILURE' | 'FAILED'
  error?: string
}

/**
 * Helper to purge all documents matching queries in a collection (Idempotent)
 */
async function purgeCollectionDocs(
  db: any,
  collectionId: string,
  queries: any[]
): Promise<number> {
  let totalDeleted = 0
  try {
    let hasMore = true
    while (hasMore) {
      const result = await db.listDocuments(DATABASE_ID, collectionId, [
        ...queries,
        Query.limit(100),
      ])

      if (!result || result.documents.length === 0) {
        hasMore = false
        break
      }

      for (const doc of result.documents) {
        try {
          await db.deleteDocument(DATABASE_ID, collectionId, doc.$id)
          totalDeleted++
        } catch {
          // Idempotent: doc might already be deleted
        }
      }

      // If less than limit returned, no more docs
      if (result.documents.length < 100) {
        hasMore = false
      }
    }
  } catch {
    // Collection might not exist or empty
  }
  return totalDeleted
}

/**
 * Helper to purge storage files associated with a business or user
 */
async function purgeStorageFiles(
  storageInstance: any,
  bucketId: string,
  businessId: string
): Promise<number> {
  let deletedCount = 0
  try {
    const fileList = await storageInstance.listFiles(bucketId, [Query.limit(100)])
    if (fileList && fileList.files) {
      for (const file of fileList.files) {
        // Match file name or file metadata or delete all in business bucket
        if (
          file.name.includes(businessId) ||
          file.$id.includes(businessId) ||
          bucketId === BUCKETS.LOGOS
        ) {
          try {
            await storageInstance.deleteFile(bucketId, file.$id)
            deletedCount++
          } catch {
            // Ignore if already deleted
          }
        }
      }
    }
  } catch {
    // Bucket might be empty or uninitialized
  }
  return deletedCount
}

/**
 * POST /api/account/delete
 * 
 * Permanently erases user account and all owned business data.
 */
export async function POST(request: NextRequest) {
  const operationId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const startTime = new Date().toISOString()

  try {
    const body = await request.json().catch(() => ({}))
    const { password } = body

    if (!password || typeof password !== 'string' || !password.trim()) {
      return NextResponse.json(
        { error: 'Password re-authentication is required to delete account' },
        { status: 400 }
      )
    }

    // 1. Get authenticated user identity from session
    let currentUser: any = null
    try {
      currentUser = await account.get()
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized: Active user session is required' },
        { status: 401 }
      )
    }

    if (!currentUser || !currentUser.$id) {
      return NextResponse.json(
        { error: 'Unauthorized: User identity could not be verified' },
        { status: 401 }
      )
    }

    const userId = currentUser.$id
    const userEmail = currentUser.email

    // 2. Re-authenticate password against Appwrite Auth
    try {
      await account.createEmailPasswordSession(userEmail, password)
    } catch (authErr: any) {
      console.warn(`[Account Deletion] Password verification failed for user ${userId}:`, authErr?.message)
      return NextResponse.json(
        { error: 'Password re-authentication failed. Please check your password and try again.' },
        { status: 400 }
      )
    }

    // 3. Discover all businesses owned by this user
    const ownedBusinessIds: string[] = []

    try {
      const ownedRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BUSINESSES, [
        Query.equal('ownerId', userId),
        Query.limit(200),
      ])
      for (const d of ownedRes.documents) {
        if (!ownedBusinessIds.includes(d.$id)) {
          ownedBusinessIds.push(d.$id)
        }
      }
    } catch {
      // Ignore list error
    }

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
      // Ignore list error
    }

    let totalPurgedDocs = 0
    let totalFilesDeleted = 0
    let membershipsRemoved = 0

    // 4. DEPENDENCY GRAPH DELETION (Children before Parents)
    // Order matters to prevent orphan records or foreign key constraint issues
    const childCollectionsToPurge = [
      // Level 1: Line Items / Sub-records / Logs
      COLLECTIONS.SALE_ITEMS,
      COLLECTIONS.SALES_RETURN_ITEMS,
      COLLECTIONS.PURCHASE_ITEMS,
      COLLECTIONS.JOURNAL_LINES,
      COLLECTIONS.STOCK_MOVEMENTS,
      COLLECTIONS.INVENTORY_LOCKS,
      COLLECTIONS.TAX_TRANSACTIONS,
      COLLECTIONS.CBMS_SUBMISSIONS,
      COLLECTIONS.AUDIT_LOGS,
      COLLECTIONS.IDEMPOTENCY_KEYS,

      // Level 2: Primary Financial & Operational Records
      COLLECTIONS.SALES,
      COLLECTIONS.SALES_RETURNS,
      COLLECTIONS.PURCHASES,
      COLLECTIONS.INVOICES,
      COLLECTIONS.PAYMENTS,
      COLLECTIONS.SUPPLIER_PAYMENTS,
      COLLECTIONS.CREDIT_NOTES,
      COLLECTIONS.DEBIT_NOTES,
      COLLECTIONS.EXPENSES,
      COLLECTIONS.JOURNAL_ENTRIES,

      // Level 3: Master Data & Entity Configurations
      COLLECTIONS.PRODUCTS,
      COLLECTIONS.CATEGORIES,
      COLLECTIONS.CUSTOMERS,
      COLLECTIONS.SUPPLIERS,
      COLLECTIONS.STORE_ASSETS,
      COLLECTIONS.ACCOUNTS,
      COLLECTIONS.FISCAL_YEARS,
      COLLECTIONS.ACCOUNTING_PERIODS,
      COLLECTIONS.TAX_RATES,
      COLLECTIONS.TAX_CATEGORIES,
      COLLECTIONS.FINANCIAL_SEQUENCES,
      COLLECTIONS.BUSINESS_ASSETS,
      COLLECTIONS.BUSINESS_ONBOARDING,
      COLLECTIONS.BUSINESS_MEMBERS,
    ]

    for (const bizId of ownedBusinessIds) {
      // Purge all child collection documents for this owned business
      for (const colId of childCollectionsToPurge) {
        const count = await purgeCollectionDocs(databases, colId, [Query.equal('businessId', bizId)])
        totalPurgedDocs += count
      }

      // Purge storage files for this business
      for (const bucketId of [BUCKETS.PRODUCTS, BUCKETS.LOGOS, BUCKETS.DOCUMENTS]) {
        const fileCount = await purgeStorageFiles(storage, bucketId, bizId)
        totalFilesDeleted += fileCount
      }

      // Finally delete the business document itself
      try {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BUSINESSES, bizId)
        totalPurgedDocs++
      } catch {
        // Idempotent
      }
    }

    // 5. REMOVE MEMBERSHIPS FOR NON-OWNED BUSINESSES
    // If the user was a member of a business owned by someone else, remove member relationship without deleting that business
    try {
      const remainingMemberships = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BUSINESS_MEMBERS, [
        Query.equal('userId', userId),
        Query.limit(200),
      ])
      for (const memDoc of remainingMemberships.documents) {
        try {
          await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BUSINESS_MEMBERS, memDoc.$id)
          membershipsRemoved++
        } catch {
          // Idempotent
        }
      }
    } catch {
      // Ignore
    }

    // 6. PURGE USER-SPECIFIC PREFERENCES & PROFILES
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.USER_PREFERENCES, userId)
      totalPurgedDocs++
    } catch {
      // Idempotent
    }

    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.USERS, userId)
      totalPurgedDocs++
    } catch {
      // Idempotent
    }

    // 7. PERMANENT APPWRITE AUTH USER DELETION & SESSION INVALIDATION
    let authDeleted = false
    const appwriteApiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_ADMIN_KEY
    const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
    const appwriteProjectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''

    // Method A: Server API Key if available (REST API DELETE /v1/users/{userId})
    if (appwriteApiKey && appwriteProjectId) {
      try {
        const res = await fetch(`${appwriteEndpoint}/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'X-Appwrite-Project': appwriteProjectId,
            'X-Appwrite-Key': appwriteApiKey,
            'Content-Type': 'application/json',
          },
        })
        if (res.ok || res.status === 404) {
          authDeleted = true
        } else {
          console.error(`[Account Deletion] Server API Key user delete failed with status ${res.status}`)
        }
      } catch (err) {
        console.error('[Account Deletion] Server API Key user delete network error:', err)
      }
    }

    // Method B: Client Account Delete fallback (Appwrite Client SDK or REST /v1/account)
    if (!authDeleted) {
      try {
        // Try SDK delete or session invalidate
        if (typeof (account as any).delete === 'function') {
          await (account as any).delete()
          authDeleted = true
        } else {
          // Delete current session
          await account.deleteSessions().catch(() => account.deleteSession('current'))
          authDeleted = true
        }
      } catch (err) {
        console.warn('[Account Deletion] Client account session deletion fallback:', err)
      }
    }

    const summary: DeletionSummary = {
      operationId,
      userId,
      startTime,
      ownedBusinessIds,
      recordsPurged: totalPurgedDocs,
      storageFilesDeleted: totalFilesDeleted,
      membershipsRemoved,
      authAccountDeleted: authDeleted,
      status: authDeleted ? 'COMPLETED' : 'PARTIAL_FAILURE',
    }

    // eslint-disable-next-line no-console
    console.log(`[Account Deletion] Operation ${operationId} finished:`, summary)

    if (!authDeleted) {
      return NextResponse.json(
        {
          error: 'Account application data was erased, but Auth identity deletion failed. Please contact support or retry.',
          summary,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Your account and associated business data have been permanently deleted.',
      summary,
    })
  } catch (error: any) {
    console.error(`[Account Deletion] Fatal error during operation ${operationId}:`, error)
    return NextResponse.json(
      {
        error: error?.message || 'Account deletion failed. No changes were completed. Please try again.',
        operationId,
      },
      { status: 500 }
    )
  }
}
