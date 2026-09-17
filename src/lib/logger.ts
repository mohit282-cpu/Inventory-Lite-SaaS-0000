/**
 * Production Logger
 * 
 * Provides structured logging with automatic sanitization of sensitive fields 
 * (passwords, tokens, credentials, PII, session data) for production safety.
 */

const SENSITIVE_KEYS = new Set<string>([
  'password',
  'token',
  'secret',
  'apikey',
  'key',
  'authorization',
  'session',
  'sessionid',
  'cookie',
  'creditcard',
  'cvv',
  'ssn',
])

function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) return data
  if (typeof data !== 'object') return data

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData)
  }

  const cleanObj: Record<string, any> = {}
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      cleanObj[key] = '[REDACTED]'
    } else if (typeof val === 'object' && val !== null) {
      cleanObj[key] = sanitizeLogData(val)
    } else {
      cleanObj[key] = val
    }
  }
  return cleanObj
}

export const logger = {
  info(message: string, context?: Record<string, any>) {
    const payload = context ? sanitizeLogData(context) : ''
    // eslint-disable-next-line no-console
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, payload)
  },
  warn(message: string, context?: Record<string, any>) {
    const payload = context ? sanitizeLogData(context) : ''
    // eslint-disable-next-line no-console
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, payload)
  },
  error(message: string, error?: any, context?: Record<string, any>) {
    const payload = {
      errorMessage: error instanceof Error ? error.message : String(error),
      ...(context ? sanitizeLogData(context) : {}),
    }
    // eslint-disable-next-line no-console
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, payload)
  },
}
