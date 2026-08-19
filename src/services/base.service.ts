import { databases, DATABASE_ID } from '@/config/appwrite'
import { ID, Query, Models } from 'appwrite'

/**
 * Base Service Class
 * 
 * Provides common database operations with built-in tenant isolation.
 * All business-specific services should extend this class.
 * 
 * Tenant isolation is enforced by automatically adding businessId filters
 * to all queries for business-scoped collections.
 */
export abstract class BaseService {
  protected collectionId: string

  constructor(collectionId: string) {
    this.collectionId = collectionId
  }

  /**
   * Create a new document
   * @param data - Document data
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
   * @param userId - Optional user ID for ownership tracking
   */
  async create<T>(data: Omit<T, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>, businessId: string, userId?: string): Promise<Models.Document> {
    const documentData: any = {
      ...data,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Only add businessId if it's not a system-level entity
    if (businessId !== 'system') {
      documentData.businessId = businessId
    }

    return await databases.createDocument(
      DATABASE_ID,
      this.collectionId,
      ID.unique(),
      documentData
    )
  }

  /**
   * Get a document by ID with tenant isolation
   * @param id - Document ID
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
   * Note: Tenant verification should be done before calling this method
   */
  async getById(id: string, _businessId: string): Promise<Models.Document> {
    // Note: Appwrite getDocument doesn't support queries
    // Tenant verification should be done at the business logic layer
    return await databases.getDocument(
      DATABASE_ID,
      this.collectionId,
      id
    )
  }

  /**
   * List all documents for a business with optional filters
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
   * @param queries - Additional Appwrite queries
   */
  async list(businessId: string, queries: any[] = []): Promise<Models.DocumentList<Models.Document>> {
    if (businessId === 'system') {
      return await databases.listDocuments(
        DATABASE_ID,
        this.collectionId,
        queries
      )
    }
    
    const tenantQueries = [Query.equal('businessId', businessId), ...queries]
    return await databases.listDocuments(
      DATABASE_ID,
      this.collectionId,
      tenantQueries
    )
  }

  /**
   * Update a document with tenant isolation verification
   * @param id - Document ID
   * @param data - Updated data
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
   * Note: Tenant verification should be done before calling this method
   */
  async update(id: string, data: any, _businessId: string): Promise<Models.Document> {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    }

    // Note: Appwrite updateDocument doesn't support queries
    // Tenant verification should be done at the business logic layer
    return await databases.updateDocument(
      DATABASE_ID,
      this.collectionId,
      id,
      updateData
    )
  }

  /**
   * Delete a document with tenant isolation verification
   * @param id - Document ID
   * @param businessId - Business ID for tenant isolation (use 'system' for top-level entities)
   * Note: Tenant verification should be done before calling this method
   */
  async delete(id: string, _businessId: string): Promise<{}> {
    // Note: Appwrite deleteDocument doesn't support queries
    // Tenant verification should be done at the business logic layer
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
  async query(businessId: string, queries: any[]): Promise<Models.DocumentList<Models.Document>> {
    if (businessId === 'system') {
      return await databases.listDocuments(
        DATABASE_ID,
        this.collectionId,
        queries
      )
    }
    
    const tenantQueries = [Query.equal('businessId', businessId), ...queries]
    return await databases.listDocuments(
      DATABASE_ID,
      this.collectionId,
      tenantQueries
    )
  }
}
