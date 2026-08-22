import { databases, DATABASE_ID } from '@/config/appwrite'
import { ID, Query, Models, Permission, Role } from 'appwrite'

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

    // Secure Appwrite permissions: NEVER use public Role.any() for business data
    const secureUserTarget = userId ? Role.user(userId) : Role.users()
    const docPermissions = permissions || [
      Permission.read(secureUserTarget),
      Permission.update(secureUserTarget),
      Permission.delete(secureUserTarget),
    ]

    const doc = await databases.createDocument(
      DATABASE_ID,
      this.collectionId,
      customId || ID.unique(),
      documentData,
      docPermissions
    )

    return this.mapDocument<T>(doc)
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

    const updatedDoc = await databases.updateDocument(
      DATABASE_ID,
      this.collectionId,
      id,
      updatePayload
    )

    return this.mapDocument<T>(updatedDoc)
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
