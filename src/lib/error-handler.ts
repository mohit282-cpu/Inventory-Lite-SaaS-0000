/**
 * Error Handler
 * 
 * Centralized error handling for the application.
 * Provides consistent error logging, user-facing messages, and error recovery strategies.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 'AUTHORIZATION_ERROR', 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR', 409)
    this.name = 'ConflictError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0)
    this.name = 'NetworkError'
  }
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unexpected error occurred'
}

/**
 * Handle API errors from Appwrite SDK & HTTP responses
 */
export function handleApiError(error: any): AppError {
  const code = error?.code || error?.response?.status || 500
  const message = error?.message || error?.response?.data?.message || 'An unexpected error occurred'
  const type = error?.type || error?.response?.data?.type

  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return new NetworkError('Unable to connect to backend server. Please verify Web Platform domain configuration (CORS) in Appwrite Console.')
  }

  if (type === 'user_already_exists' || (code === 409 && message.includes('already exists'))) {
    return new ConflictError('An account with this email address already exists. Please sign in instead.')
  }

  if (type === 'user_invalid_credentials' || (code === 401 && message.includes('Invalid credentials'))) {
    return new AuthenticationError('Invalid email or password. Please check your credentials and try again.')
  }

  if (type === 'user_session_already_exists') {
    return new ConflictError('User session already active.')
  }

  if (type === 'user_blocked' || message.includes('user has been blocked') || message.includes('user_blocked')) {
    return new AuthenticationError('This user account has been deleted. If you previously deleted your account, please register a new account.')
  }

  switch (code) {
    case 400:
      return new ValidationError(message, error)
    case 401:
      return new AuthenticationError(message)
    case 403:
      return new AuthorizationError(message)
    case 404:
      return new NotFoundError(message)
    case 409:
      return new ConflictError(message)
    default:
      return new AppError(message, type || 'API_ERROR', code, error)
  }
}

/**
 * Error Categories for strict offline fallback classification (P1 Issue #5)
 */
export type ErrorCategory =
  | 'NETWORK_OFFLINE'
  | 'TIMEOUT'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'CONFIGURATION'
  | 'UNKNOWN'

/**
 * Classify any error into a deterministic ErrorCategory
 */
export function classifyError(error: unknown): ErrorCategory {
  if (!error) return 'UNKNOWN'

  if (typeof error === 'object' && error !== null) {
    const err = error as any
    const message = (err.message || String(err)).toLowerCase()
    const code = err.code || err.statusCode || err.status || 0
    const name = err.name || ''

    if (
      name === 'NetworkError' ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('offline') ||
      message.includes('net::err') ||
      (typeof window !== 'undefined' && !navigator.onLine)
    ) {
      return 'NETWORK_OFFLINE'
    }

    if (name === 'TimeoutError' || message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT'
    }

    if (
      name === 'AuthenticationError' ||
      code === 401 ||
      message.includes('unauthorized') ||
      message.includes('invalid credentials') ||
      message.includes('session')
    ) {
      return 'AUTHENTICATION'
    }

    if (
      name === 'AuthorizationError' ||
      code === 403 ||
      message.includes('permission') ||
      message.includes('forbidden') ||
      message.includes('tenant isolation') ||
      message.includes('access denied')
    ) {
      return 'AUTHORIZATION'
    }

    if (
      name === 'ValidationError' ||
      code === 400 ||
      message.includes('validation') ||
      message.includes('invalid input') ||
      message.includes('cannot be negative')
    ) {
      return 'VALIDATION'
    }

    if (name === 'NotFoundError' || code === 404 || message.includes('not found')) {
      return 'NOT_FOUND'
    }

    if (
      name === 'ConflictError' ||
      code === 409 ||
      message.includes('already exists') ||
      message.includes('conflict') ||
      message.includes('duplicate') ||
      message.includes('idempotency_key_reuse_mismatch')
    ) {
      return 'CONFLICT'
    }

    if (message.includes('configuration warning') || message.includes('next_public_appwrite')) {
      return 'CONFIGURATION'
    }

    if (code >= 500) {
      return 'SERVER_ERROR'
    }
  }

  return 'UNKNOWN'
}



/**
 * Log error for debugging
 */
export function logError(error: unknown, context?: string): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    category: classifyError(error),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', errorInfo)
  }
}

