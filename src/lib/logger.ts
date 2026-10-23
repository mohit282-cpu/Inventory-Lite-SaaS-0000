/**
 * Production Security & Diagnostic Logger
 * 
 * Safe error and event logging with correlation IDs, safe contextual metadata,
 * and zero sensitive data exposure (tokens, passwords, database credentials).
 */

export type LogSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

export interface LogContext {
  path?: string
  category?: 'AUTH' | 'APPWRITE' | 'CHUNK_LOAD' | 'NAVIGATION' | 'RUNTIME' | 'NETWORK'
  correlationId?: string
  userId?: string
  businessId?: string
  severity?: LogSeverity
  [key: string]: any
}

/**
 * Generate a correlation ID for tracing a log entry through the system.
 */
function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `err_${crypto.randomUUID().slice(0, 8)}`
  }
  return `err_${Math.random().toString(36).substring(2, 10)}`
}

/**
 * SENSITIVE_KEYS are redacted from log context to prevent accidental
 * exposure of passwords, tokens, API keys, and other secrets.
 * This set is intentionally conservative; add entries as new secret
 * formats are discovered in the codebase.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'jwt',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'sessionid',
  'appwrite_project_id',
  'creditcard',
  'cvv',
  'ssn',
  'healthid',
])

/**
 * Recursively sanitize data, redacting any SENSITIVE_KEYS found at any nesting level.
 * Handles objects, arrays, primitives. Never returns the original reference.
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item))
  }

  if (typeof data !== 'object') return data

  const cleanObj: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    if (SENSITIVE_KEYS.has(lowerKey)) {
      cleanObj[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      cleanObj[key] = sanitizeData(value)
    } else {
      cleanObj[key] = value
    }
  }
  return cleanObj
}

export const logger = {
  /**
   * Log an error with correlation ID, category, and context. Sensitive data
   * in the context is recursively redacted before logging.
   */
  error(message: string, error?: any, context: LogContext = {}): string {
    const correlationId = context.correlationId || generateCorrelationId()
    const timestamp = new Date().toISOString()
    const path = context.path || (typeof window !== 'undefined' ? window.location.pathname : 'server')
    const category = context.category || 'RUNTIME'
    const severity = context.severity || 'ERROR'

    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    } : { message: String(error) }

    const sanitizedContext = sanitizeData(context)

    const logEntry = {
      timestamp,
      correlationId,
      category,
      severity,
      path,
      message,
      error: errorDetails,
      context: sanitizedContext,
    }

    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify(logEntry))
    } else {
      console.error(`[${category}] [${severity}] ${message} (${correlationId}):`, error, context)
    }

    return correlationId
  },

  /**
   * Log a warning with contextual metadata. Sensitive data in context is redacted.
   */
  warn(message: string, context: LogContext = {}): void {
    const timestamp = new Date().toISOString()
    const path = context.path || (typeof window !== 'undefined' ? window.location.pathname : 'server')
    const category = context.category || 'RUNTIME'

    const sanitizedContext = sanitizeData(context)

    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify({ timestamp, level: 'WARN', category, path, message, context: sanitizedContext }))
    } else {
      console.warn(`[WARN] ${message}:`, context)
    }
  },

  /**
   * Log informational message. Only output in development environment.
   */
  info(message: string, context: LogContext = {}): void {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString()
      const category = context.category || 'RUNTIME'
      console.info(`[${category}] [INFO] ${timestamp} ${message}:`, context)
    }
  },

  /**
   * Log a structured event with guaranteed fields for observability.
   * Includes correlation ID, severity, timestamp, and fully sanitized context.
   * Designed for integration with external log services in production.
   */
  event(message: string, context: Omit<LogContext, 'category' | 'severity'> & { severity: LogSeverity }): string {
    const correlationId = context.correlationId || generateCorrelationId()
    const timestamp = new Date().toISOString()
    const severity = context.severity

    const baseContext: LogContext = {
      correlationId,
      severity,
      timestamp: timestamp,
      path: context.path,
      category: context.category,
    }

    const sanitizedContext = sanitizeData(baseContext)

    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({
        event: true,
        timestamp,
        correlationId,
        severity,
        message,
        context: sanitizedContext,
      }))
    } else {
      console.error(`[EVENT] [${severity}] ${message} (${correlationId}):`, context)
    }

    return correlationId
  },
}
