/**
 * Observability & Production Operational Event Logger
 * 
 * Centralized structured logger for operational events, failure tracking,
 * and security alerts without logging passwords, tokens, or sensitive personal data.
 */

export type OperationalEventType =
  | 'SALE_FAILURE'
  | 'PAYMENT_FAILURE'
  | 'INVOICE_FAILURE'
  | 'ACCOUNTING_FAILURE'
  | 'STOCK_INCONSISTENCY'
  | 'ROLLBACK_FAILURE'
  | 'RECOVERY_REQUIRED'
  | 'PERMISSION_VIOLATION'
  | 'RATE_LIMIT_EXCEEDED'
  | 'APPWRITE_DISRUPTION'
  | 'RECONCILIATION_MISMATCH'

export type EventSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

export interface OperationalEvent {
  eventName: OperationalEventType
  severity: EventSeverity
  businessId: string
  operationId?: string
  resourceId?: string
  userId?: string
  timestamp: string
  errorCategory?: string
  sanitizedMessage: string
  metadata?: Record<string, any>
}

/**
 * Sanitize sensitive values from metadata objects
 */
function sanitizeMetadata(data?: Record<string, any>): Record<string, any> | undefined {
  if (!data) return undefined
  const sanitized: Record<string, any> = {}

  for (const [key, val] of Object.entries(data)) {
    const k = key.toLowerCase()
    if (k.includes('password') || k.includes('secret') || k.includes('token') || k.includes('key')) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      sanitized[key] = sanitizeMetadata(val)
    } else {
      sanitized[key] = val
    }
  }

  return sanitized
}

export class OperationalLogger {
  private eventsLog: OperationalEvent[] = []
  private maxInMemoryLogs = 1000

  /**
   * Log a structured operational event
   */
  logEvent(params: {
    eventName: OperationalEventType
    severity: EventSeverity
    businessId: string
    operationId?: string
    resourceId?: string
    userId?: string
    errorCategory?: string
    message: string
    metadata?: Record<string, any>
  }): OperationalEvent {
    const event: OperationalEvent = {
      eventName: params.eventName,
      severity: params.severity,
      businessId: params.businessId,
      operationId: params.operationId,
      resourceId: params.resourceId,
      userId: params.userId,
      timestamp: new Date().toISOString(),
      errorCategory: params.errorCategory,
      sanitizedMessage: params.message.replace(/(bearer\s+[a-z0-9._-]+)/gi, 'bearer [REDACTED]'),
      metadata: sanitizeMetadata(params.metadata),
    }

    this.eventsLog.push(event)

    if (this.eventsLog.length > this.maxInMemoryLogs) {
      this.eventsLog.shift()
    }

    if (params.severity === 'ERROR' || params.severity === 'CRITICAL') {
      // eslint-disable-next-line no-console
      console.error(`[OPERATIONAL_ALERT] [${event.severity}] [${event.eventName}] (${event.businessId}): ${event.sanitizedMessage}`, event)
    } else if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[OPERATIONAL_LOG] [${event.severity}] [${event.eventName}]: ${event.sanitizedMessage}`)
    }

    return event
  }

  /**
   * Get recent operational events for an admin or business
   */
  getRecentEvents(businessId?: string, severity?: EventSeverity): OperationalEvent[] {
    return this.eventsLog.filter((e) => {
      if (businessId && e.businessId !== businessId) return false
      if (severity && e.severity !== severity) return false
      return true
    })
  }

  /**
   * Clear in-memory event buffer (for testing)
   */
  clear(): void {
    this.eventsLog = []
  }
}

export const operationalLogger = new OperationalLogger()
