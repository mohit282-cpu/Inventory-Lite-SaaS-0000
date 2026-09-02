import { databases, DATABASE_ID } from '@/config/appwrite'
import { ID, Query, Models, Permission, Role } from 'appwrite'
import { sanitizeAppwriteDocId } from '@/lib/utils'

const CRITICAL_FINANCIAL_COLLECTIONS = new Set<string>([
  'sales',
  'sale_items',
  'purchases',
  'purchase_items',
  'payments',
  'supplier_payments',
  'invoices',
  'credit_notes',
  'debit_notes',
  'journal_entries',
  'journal_lines',
  'tax_transactions',
  'stock_movements',
])

const CRITICAL_FINANCIAL_FIELDS = new Set<string>([
  'amount',
  'total',
  'paidamount',
  'dueamount',
  'vat',
  'vatamount',
  'taxableamount',
  'cogs',
  'quantity',
  'accountid',
  'invoicenumber',
  'businessid',
])

/**
 * Base Service Class
 * 
 * Provides common database operations with built-in tenant isolation and secure permissions.
 * All business-specific services extend this class.
 * 
 * Tenant isolation is enforced through multiple boundary mechanisms:
 * 1. Automatic businessId filtering in list/query operations
 * 2. BusinessId verification in getById/update/delete operations
 * 3. Secure Appwrite role permissions per document (No public Role.any() access)
 */
export abstract class BaseService {
  protected collectionId: string

  constructor(collectionId: string) {
    this.collectionId = collectionId
  }

  protected mapDocument<T>(doc: Models.Document): T {
    return doc as unknown as T
  }

  protected mapDocuments<T>(docs: Models.Document[]): T[] {
    return docs as unknown as T[]
  }

  /**
   * Create a new document with secure Appwrite permissions
   */
  async create<T>(
    data: any,
    businessId: string,
    userId?: string,
    permissions?: string[],
    customId?: string
  ): Promise<T> {
    const { $id, $createdAt, $updatedAt, $databaseId, $collectionId, $permissions, ...cleanData } = data || {}

    const collectionsWithUpdatedAt = new Set<string>([
      'users',
      'businesses',
      'categories',
      'products',
      'customers',
      'expenses',
      'suppliers',
      'purchases',
      'sales_returns',
      'credit_notes',
      'debit_notes',
      'store_assets',
      'accounts',
      'journal_entries',
      'journal_lines',
      'fiscal_years',
      'accounting_periods',
      'tax_rates',
      'tax_categories',
      'tax_transactions',
      'cbms_submissions',
      'audit_logs',
    ])

    const collectionsWithCreatedAt = new Set<string>([
      'users',
      'businesses',
      'business_members',
      'categories',
      'products',
      'stock_movements',
      'customers',
      'sales',
      'invoices',
      'expenses',
      'payments',
      'suppliers',
      'purchases',
      'purchase_items',
      'supplier_payments',
      'sales_returns',
      'sales_return_items',
      'credit_notes',
      'debit_notes',
      'store_assets',
      'accounts',
      'journal_entries',
      'journal_lines',
      'fiscal_years',
      'accounting_periods',
      'tax_rates',
      'tax_categories',
      'tax_transactions',
      'cbms_submissions',
      'audit_logs',
    ])

    const documentData: any = {
      ...cleanData,
    }

    if (this.collectionId === 'expenses') {
      if (documentData.title && !documentData.description) {
        documentData.description = documentData.title
      }
      delete documentData.title
    }

    if (this.collectionId === 'sales') {
      delete documentData.discountType
      delete documentData.discountValue
      delete documentData.taxableAmount
      delete documentData.vatEnabled
      delete documentData.vatRate
      delete documentData.taxRate
      delete documentData.changeAmount
    }

    if (this.collectionId === 'sales_returns') {
      if (!documentData.returnDate) {
        documentData.returnDate = new Date().toISOString()
      }
      if (documentData.totalAmount === undefined) {
        documentData.totalAmount = documentData.totalRefund ?? documentData.subtotal ?? 0
      }
    }

    if (collectionsWithCreatedAt.has(this.collectionId) || cleanData.createdAt !== undefined) {
      documentData.createdAt = cleanData.createdAt || new Date().toISOString()
    }

    if (collectionsWithUpdatedAt.has(this.collectionId) || cleanData.updatedAt !== undefined) {
      documentData.updatedAt = cleanData.updatedAt || new Date().toISOString()
    }

    if (userId && !documentData.createdBy) {
      documentData.createdBy = userId
    }

    // Only add businessId if it's not a system-level entity
    if (businessId !== 'system') {
      documentData.businessId = businessId
    }

    // Secure Appwrite permissions: NEVER use public Role.any() or broad Role.users() for business data
    if (!permissions && !userId) {
      throw new Error('Security Error: Document creation requires a valid userId or explicit permission target. Broad Role.users() fallback is prohibited.')
    }

    const secureTarget = userId ? Role.user(userId) : Role.team(businessId)
    const docPermissions = permissions || [
      Permission.read(secureTarget),
      Permission.update(secureTarget),
      Permission.delete(secureTarget),
    ]

    let attempts = 0
    while (attempts < 5) {
      try {
        const docId = customId ? sanitizeAppwriteDocId(customId) : ID.unique()
        const createdDoc = await databases.createDocument(
          DATABASE_ID,
          this.collectionId,
          docId,
          documentData,
          docPermissions
        )
        return this.mapDocument<T>(createdDoc)
      } catch (err: any) {
        if (err?.message && err.message.includes('Unknown attribute')) {
          const match = err.message.match(/Unknown attribute:\s*"([^"]+)"/i)
          if (match && match[1] && documentData[match[1]] !== undefined) {
            const fieldName = match[1]
            if (CRITICAL_FINANCIAL_COLLECTIONS.has(this.collectionId) || CRITICAL_FINANCIAL_FIELDS.has(fieldName.toLowerCase())) {
              throw new Error(`Schema Error: Cannot silently strip critical financial attribute "${fieldName}" from collection "${this.collectionId}". Database schema update required.`)
            }
            console.warn(`[BaseService] Stripping unknown attribute "${fieldName}" from ${this.collectionId} create payload...`)
            delete documentData[fieldName]
            attempts++
            continue
          }
        }
        if (
          err?.code === 404 ||
          (err?.message &&
            (err.message.includes('could not be found') ||
              err.message.includes('Collection with the requested ID') ||
              err.message.includes('collection_not_found')))
        ) {
          throw new Error(`Collection '${this.collectionId}' was not found in Appwrite project. Please run 'npx tsx scripts/setup-appwrite.ts' or provision the collection '${this.collectionId}' in Appwrite Console.`)
        }
        throw err
      }
    }

    throw new Error(`Failed to create document in ${this.collectionId}: max retries exceeded`)
  }

  /**
   * Get a document by ID with tenant isolation verification
   */
  async getById<T>(id: string, businessId: string): Promise<T> {
    const document = await databases.getDocument(
      DATABASE_ID,
      this.collectionId,
      id
    )

    // Verify tenant isolation for business-scoped collections
    if (businessId !== 'system' && document.businessId !== businessId) {
      throw new Error(`Tenant Isolation Violation: Access denied to document ${id} for business ${businessId}`)
    }

    return this.mapDocument<T>(document)
  }

  /**
   * List all documents for a business with tenant isolation query injection
   */
  async list<T>(businessId: string, queries: any[] = []): Promise<T[]> {
    try {
      if (businessId === 'system') {
        const result = await databases.listDocuments(
          DATABASE_ID,
          this.collectionId,
          queries
        )
        return this.mapDocuments<T>(result.documents)
      }

      const tenantQueries = [Query.equal('businessId', businessId), ...queries]
      const result = await databases.listDocuments(
        DATABASE_ID,
        this.collectionId,
        tenantQueries
      )
      return this.mapDocuments<T>(result.documents)
    } catch (err: any) {
      if (
        err?.code === 404 ||
        (err?.message &&
          (err.message.includes('could not be found') ||
            err.message.includes('Collection with the requested ID') ||
            err.message.includes('collection_not_found')))
      ) {
        if (CRITICAL_FINANCIAL_COLLECTIONS.has(this.collectionId)) {
          throw new Error(`Financial data service unavailable: Collection '${this.collectionId}' is missing or uninitialized.`)
        }
        if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
          console.warn(`[BaseService] Collection '${this.collectionId}' not found in database '${DATABASE_ID}'. Returning empty array.`)
        }
        return []
      }
      throw err
    }
  }

  /**
   * Fetch all documents for a business, bypassing limit restrictions by using cursor pagination
   */
  async listAll<T extends Models.Document>(businessId: string, queries: any[] = []): Promise<T[]> {
    const allDocuments: T[] = []
    let cursor: string | null = null
    const limit = 500 // Max limit for Appwrite is 5000, 500 is safer for large payloads

    while (true) {
      const pageQueries = [...queries, Query.limit(limit)]
      if (cursor) {
        pageQueries.push(Query.cursorAfter(cursor))
      }

      const pageDocs = await this.list<T>(businessId, pageQueries)
      if (pageDocs.length === 0) break

      allDocuments.push(...pageDocs)

      if (pageDocs.length < limit) break
      cursor = pageDocs[pageDocs.length - 1].$id
    }

    return allDocuments
  }

  /**
   * Update a document with tenant isolation verification
   */
  async update<T>(id: string, data: any, businessId: string): Promise<T> {
    // Verify tenant isolation before update (getById will throw if businessId doesn't match)
    if (businessId !== 'system') {
      await this.getById(id, businessId)
    }

    const { $id, $createdAt, $updatedAt, $databaseId, $collectionId, $permissions, ...cleanData } = data || {}

    const collectionsWithUpdatedAt = new Set<string>([
      'users',
      'businesses',
      'categories',
      'products',
      'customers',
      'expenses',
      'suppliers',
      'purchases',
      'sales_returns',
    ])

    const updatePayload = { ...cleanData }

    // Prevent changing businessId to prevent tenant movement
    delete updatePayload.businessId

    if (this.collectionId === 'expenses') {
      if (updatePayload.title && !updatePayload.description) {
        updatePayload.description = updatePayload.title
      }
      delete updatePayload.title
    }

    if (collectionsWithUpdatedAt.has(this.collectionId)) {
      updatePayload.updatedAt = new Date().toISOString()
    }

    let attempts = 0
    while (attempts < 5) {
      try {
        const updatedDoc = await databases.updateDocument(
          DATABASE_ID,
          this.collectionId,
          id,
          updatePayload
        )
        return this.mapDocument<T>(updatedDoc)
      } catch (err: any) {
        if (err?.message && err.message.includes('Unknown attribute')) {
          const match = err.message.match(/Unknown attribute:\s*"([^"]+)"/i)
          if (match && match[1] && updatePayload[match[1]] !== undefined) {
            const fieldName = match[1]
            if (CRITICAL_FINANCIAL_COLLECTIONS.has(this.collectionId) || CRITICAL_FINANCIAL_FIELDS.has(fieldName.toLowerCase())) {
              throw new Error(`Schema Error: Cannot silently strip critical financial attribute "${fieldName}" from collection "${this.collectionId}". Database schema update required.`)
            }
            console.warn(`[BaseService] Stripping unknown attribute "${fieldName}" from ${this.collectionId} update payload...`)
            delete updatePayload[fieldName]
            attempts++
            continue
          }
        }
        throw err
      }
    }

    throw new Error(`Failed to update document in ${this.collectionId}: max retries exceeded`)
  }


  /**
   * Delete a document with tenant isolation verification
   */
  async delete(id: string, businessId: string): Promise<boolean> {
    // Verify tenant isolation before delete
    if (businessId !== 'system') {
      await this.getById(id, businessId)
    }

    await databases.deleteDocument(
      DATABASE_ID,
      this.collectionId,
      id
    )

    return true
  }
}
