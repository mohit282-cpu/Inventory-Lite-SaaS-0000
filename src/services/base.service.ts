import { databases, DATABASE_ID } from '@/config/appwrite'
import { ID, Query, Models } from 'appwrite'

/**
 * Base Service Class
 * 
 * Provides common database operations with built-in tenant isolation.
 * All business-specific services should extend this class.
 * 
 * Tenant isolation is enforced through multiple mechanisms:
 * 1. Automatic businessId filtering in list/query operations
 * 2. BusinessId verification in getById/update/delete operations
 * 3. BusinessId assignment in create operations
 * 
 * This ensures strict multi-tenant data isolation at the service layer.
 */
export abstract class BaseService {
  protected collectionId: string

  constructor(collectionId: string) {
    this.collectionId = collectionId
  }

  /**
   * Helper to safely map document output to generic entity type
   */
  protected mapDocument<T>(doc: Models.Document): T {
    return doc as unknown as T
  }

  /**
   * Helper to safely map document array to generic entity array
   */
  protected mapDocuments<T>(docs: Models.Document[]): T[] {
    return docs as unknown as T[]
  }

  /**
   * Create a new document
   * @param data - Document data
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
   * @param userId - Optional user ID for ownership tracking
   * @param permissions - Optional custom Appwrite permissions
   */
  async create<T>(
    data: any,
    businessId: string,
    userId?: string,
    permissions?: string[]
  ): Promise<T> {
    const documentData: any = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (userId && !documentData.createdBy) {
      documentData.createdBy = userId
    }

    // Only add businessId if it's not a system-level entity
    if (businessId !== 'system') {
      documentData.businessId = businessId
    }

    const doc = await databases.createDocument(
      DATABASE_ID,
      this.collectionId,
      ID.unique(),
      documentData,
      permissions
    )

    return this.mapDocument<T>(doc)
  }

  /**
   * Get a document by ID with tenant isolation verification
   * @param id - Document ID
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
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
   * List all documents for a business with optional filters
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
   * @param queries - Additional Appwrite queries
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
   * @param id - Document ID
   * @param data - Updated data
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
   */
  async update<T>(id: string, data: any, businessId: string): Promise<T> {
    // Verify tenant isolation before update (getById will throw if businessId doesn't match)
    if (businessId !== 'system') {
      await this.getById(id, businessId)
    }

    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    }

    const doc = await databases.updateDocument(
      DATABASE_ID,
      this.collectionId,
      id,
      updateData
    )

    return this.mapDocument<T>(doc)
  }

  /**
   * Delete a document with tenant isolation verification
   * @param id - Document ID
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
   */
  async delete(id: string, businessId: string): Promise<{}> {
    // Verify tenant isolation before delete (getById will throw if businessId doesn't match)
    if (businessId !== 'system') {
      await this.getById(id, businessId)
    }

    return await databases.deleteDocument(
      DATABASE_ID,
      this.collectionId,
      id
    )
  }

  /**
   * Query documents with custom filters and tenant isolation
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
   * @param queries - Appwrite queries
   */
  async query<T>(businessId: string, queries: any[]): Promise<T[]> {
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
}
