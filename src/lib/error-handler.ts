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
 * Handle API errors from Appwrite
 */
export function handleApiError(error: any): AppError {
  if (error?.response) {
    const { status, data } = error.response

    switch (status) {
      case 400:
        return new ValidationError(data?.message || 'Invalid request', data)
      case 401:
        return new AuthenticationError(data?.message || 'Authentication failed')
      case 403:
        return new AuthorizationError(data?.message || 'Access denied')
      case 404:
        return new NotFoundError(data?.message || 'Resource not found')
      case 409:
        return new ConflictError(data?.message || 'Resource conflict')
      default:
        return new AppError(
          data?.message || 'Server error',
          'API_ERROR',
          status,
          data
        )
    }
  }

  if (error?.message) {
    return new AppError(error.message, 'UNKNOWN_ERROR')
  }

  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR')
}

/**
 * Log error for debugging
 */
export function logError(error: unknown, context?: string): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  }

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', errorInfo)
  }

  // In production, you would send this to your error tracking service
  // Example: Sentry.captureException(error, { extra: { context } })
}

/**
 * Error boundary component helper
 */
export function componentDidCatch(error: Error, _errorInfo: React.ErrorInfo): void {
  logError(error, 'React Error Boundary')
  // Additional error reporting logic here
}
