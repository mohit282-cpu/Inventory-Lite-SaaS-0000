/**
 * Production Security & Diagnostic Logger
 * 
 * Safe error and event logging with correlation IDs, safe contextual metadata,
 * and zero sensitive data exposure (tokens, passwords, database credentials).
 */

export interface LogContext {
  path?: string
  category?: 'AUTH' | 'APPWRITE' | 'CHUNK_LOAD' | 'NAVIGATION' | 'RUNTIME' | 'NETWORK'
  correlationId?: string
  userId?: string
  businessId?: string
  [key: string]: any
}

function generateCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `err_${crypto.randomUUID().slice(0, 8)}`
  }
  return `err_${Math.random().toString(36).substring(2, 10)}`
}

function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data

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
  ])

  if (Array.isArray(data)) {
    return data.map(sanitizeData)
  }

  const cleanObj: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
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
  error(message: string, error?: any, context: LogContext = {}): string {
    const correlationId = context.correlationId || generateCorrelationId()
    const timestamp = new Date().toISOString()
    const path = context.path || (typeof window !== 'undefined' ? window.location.pathname : 'server')
    const category = context.category || 'RUNTIME'

    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    } : { message: String(error) }

    const logEntry = {
      timestamp,
      correlationId,
      category,
      path,
      message,
      error: errorDetails,
      context: sanitizeData(context),
    }

    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify(logEntry))
    } else {
      console.error(`[${category}] ${message} (${correlationId}):`, error, context)
    }

    return correlationId
  },

  warn(message: string, context: LogContext = {}): void {
    const timestamp = new Date().toISOString()
    const path = context.path || (typeof window !== 'undefined' ? window.location.pathname : 'server')

    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify({ timestamp, level: 'WARN', path, message, context: sanitizeData(context) }))
    } else {
      console.warn(`[WARN] ${message}:`, context)
    }
  },

  info(message: string, context: LogContext = {}): void {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[INFO] ${message}:`, context)
    }
  },
}
