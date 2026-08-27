import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { AuditLog, AuditAction } from '@/types'
import { Query } from 'appwrite'

/**
 * Backward-compatible AuditLogEntry interface used by existing audit UI.
 */
export interface AuditLogEntry {
  id: string
  timestamp: string
  action: string
  target: string
  userId: string
  metadata?: Record<string, any>
}

/**
 * Audit Log Service
 * 
 * Records every significant financial and data operation for compliance.
 * Immutable append-only log — entries cannot be modified or deleted.
 */
export class AuditLogService extends BaseService {
  constructor() {
    super(COLLECTIONS.AUDIT_LOGS)
  }

  /**
   * Record an audit log entry. This is append-only — no update or delete.
   */
  async record(params: {
    businessId: string
    entityType: string
    entityId: string
    entityNumber?: string
    action: AuditAction
    changes?: Record<string, { old: any; new: any }>
    performedBy: string
    performedByName?: string
    ipAddress?: string
  }): Promise<AuditLog> {
    const changesJson = params.changes ? JSON.stringify(params.changes) : undefined

    return await this.create<AuditLog>(
      {
        entityType: params.entityType,
        entityId: params.entityId,
        entityNumber: params.entityNumber,
        action: params.action,
        changes: changesJson,
        performedBy: params.performedBy,
        performedByName: params.performedByName,
        ipAddress: params.ipAddress,
      },
      params.businessId,
      params.performedBy
    )
  }

  /**
   * List audit logs with filters.
   */
  async listAuditLogs(
    businessId: string,
    options?: {
      entityType?: string
      entityId?: string
      action?: AuditAction
      performedBy?: string
      dateFrom?: string
      dateTo?: string
      limit?: number
      offset?: number
    }
  ): Promise<AuditLog[]> {
    const queries: any[] = []

    if (options?.entityType) {
      queries.push(Query.equal('entityType', options.entityType))
    }
    if (options?.entityId) {
      queries.push(Query.equal('entityId', options.entityId))
    }
    if (options?.action) {
      queries.push(Query.equal('action', options.action))
    }
    if (options?.performedBy) {
      queries.push(Query.equal('performedBy', options.performedBy))
    }
    if (options?.dateFrom) {
      queries.push(Query.greaterThanEqual('createdAt', options.dateFrom))
    }
    if (options?.dateTo) {
      queries.push(Query.lessThanEqual('createdAt', options.dateTo))
    }
    if (options?.limit) {
      queries.push(Query.limit(options.limit))
    }
    if (options?.offset) {
      queries.push(Query.offset(options.offset))
    }

    queries.push(Query.orderDesc('createdAt'))

    return await this.list<AuditLog>(businessId, queries)
  }

  /**
   * Get audit trail for a specific entity.
   */
  async getEntityAuditTrail(
    businessId: string,
    entityType: string,
    entityId: string
  ): Promise<AuditLog[]> {
    return await this.listAuditLogs(businessId, {
      entityType,
      entityId,
    })
  }

  /**
   * Get recent activity summary for a business.
   */
  async getRecentActivitySummary(
    businessId: string,
    days: number = 30
  ): Promise<{
    totalActions: number
    byAction: Record<AuditAction, number>
    byEntityType: Record<string, number>
    recentUsers: string[]
  }> {
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const logs = await this.listAuditLogs(businessId, { dateFrom, limit: 1000 })

    const byAction: Record<string, number> = {}
    const byEntityType: Record<string, number> = {}
    const userSet = new Set<string>()

    for (const log of logs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1
      byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1
      if (log.performedByName) userSet.add(log.performedByName)
    }

    return {
      totalActions: logs.length,
      byAction: byAction as Record<AuditAction, number>,
      byEntityType,
      recentUsers: Array.from(userSet),
    }
  }

  /**
   * Export audit logs for a fiscal year (for IRD/audit compliance).
   */
  async exportAuditLogsForPeriod(
    businessId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<AuditLog[]> {
    // Fetch all logs in batches
    const allLogs: AuditLog[] = []
    let offset = 0
    const batchSize = 500

    while (true) {
      const batch = await this.listAuditLogs(businessId, {
        dateFrom,
        dateTo,
        limit: batchSize,
        offset,
      })

      allLogs.push(...batch)
      if (batch.length < batchSize) break
      offset += batchSize
    }

    return allLogs
  }

  // ==================== Backward-Compatible Methods ====================

  /**
   * Backward-compatible logEvent method used by existing services.
   * Internally maps to the new record() method.
   */
  async logEvent(
    businessId: string,
    userId: string,
    action: string,
    entityId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.record({
        businessId,
        entityType: metadata?.entityType || action.split('_')[0],
        entityId,
        entityNumber: metadata?.entityNumber,
        action: action.toUpperCase().replace(/_/g, '_') as AuditAction,
        changes: metadata,
        performedBy: userId,
      })
    } catch {
      // Non-critical — log failures should not break main operations
    }
  }

  /**
   * Backward-compatible getBusinessAuditLogs returning AuditLogEntry[].
   */
  async getBusinessAuditLogs(
    businessId: string,
    options?: { dateFrom?: string; dateTo?: string }
  ): Promise<AuditLogEntry[]> {
    const logs = await this.listAuditLogs(businessId, {
      dateFrom: options?.dateFrom,
      dateTo: options?.dateTo,
      limit: 200,
    })

    return logs.map(log => ({
      id: log.$id,
      timestamp: log.createdAt,
      action: log.action,
      target: log.entityType,
      userId: log.performedBy,
      metadata: log.changes ? JSON.parse(log.changes) : {},
    }))
  }
}

export const auditLogService = new AuditLogService()
