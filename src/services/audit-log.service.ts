import { maskSensitiveData } from '@/lib/security'

export interface AuditLogEntry {
  id: string
  businessId: string
  userId: string
  action: string
  target: string
  timestamp: string
  metadata?: Record<string, any>
}

/**
 * Audit Log Service
 * 
 * Captures auditable logs for security-sensitive and financial operations.
 * Ensures passwords, tokens, and secrets are never logged.
 */
export class AuditLogService {
  private logs: AuditLogEntry[] = []

  /**
   * Record a security / financial audit event
   */
  async logEvent(
    businessId: string,
    userId: string,
    action: string,
    target: string,
    metadata?: Record<string, any>
  ): Promise<AuditLogEntry> {
    const sanitizeMetadata = (obj?: Record<string, any>): Record<string, any> => {
      if (!obj) return {}
      const clean: Record<string, any> = {}
      for (const [key, val] of Object.entries(obj)) {
        if (/password|token|secret|key|creditcard/i.test(key)) {
          clean[key] = maskSensitiveData(String(val))
        } else {
          clean[key] = val
        }
      }
      return clean
    }

    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId: businessId || 'system',
      userId: userId || 'unknown',
      action,
      target,
      timestamp: new Date().toISOString(),
      metadata: sanitizeMetadata(metadata),
    }

    this.logs.push(entry)
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(`[AUDIT LOG] [${entry.action}] User: ${entry.userId} | Business: ${entry.businessId} | Target: ${entry.target}`)
    }

    return entry
  }

  /**
   * Retrieve recent audit logs for a business
   */
  async getBusinessAuditLogs(businessId: string): Promise<AuditLogEntry[]> {
    return this.logs.filter((l) => l.businessId === businessId)
  }
}

export const auditLogService = new AuditLogService()
