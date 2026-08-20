/**
 * Security Utilities and Guidelines
 * 
 * Provides robust validation, sanitization, token generation, and security checks.
 */

// ==================== Security Principles ====================

export function validateTenantAccess(userBusinessId: string, requestedBusinessId: string): boolean {
  return userBusinessId === requestedBusinessId
}

export class ForbiddenError extends Error {
  constructor(actionName: string, userRole: string) {
    super(`Forbidden: Access denied for action '${actionName}' with role '${userRole}'`)
    this.name = 'ForbiddenError'
  }
}

export function hasRequiredRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

export function requireRole(userRole: string, allowedRoles: string[], actionName: string = 'this operation'): void {
  if (!allowedRoles.includes(userRole)) {
    throw new ForbiddenError(actionName, userRole)
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+977)?[0-9]{9,10}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

/**
 * Generate cryptographically secure random token using Web Crypto API
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomBytes = new Uint8Array(length)

  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes)
  } else {
    // Node.js fallback
    const cryptoModule = require('crypto')
    const bytes = cryptoModule.randomBytes(length)
    for (let i = 0; i < length; i++) {
      randomBytes[i] = bytes[i]
    }
  }

  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomBytes[i] % chars.length)
  }
  return result
}

export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '****'
  }
  return data.substring(0, visibleChars) + '****'
}

export function maskEmail(email: string): string {
  const [username, domain] = email.split('@')
  if (username.length <= 2) {
    return `${username}@${domain}`
  }
  return `${username[0]}${'*'.repeat(username.length - 2)}${username[username.length - 1]}@${domain}`
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length <= 4) {
    return cleaned
  }
  return `${cleaned.substring(0, 2)}${'*'.repeat(cleaned.length - 4)}${cleaned.substring(cleaned.length - 2)}`
}

/**
 * Build Appwrite permission array based on user role and ID
 */
export function buildAppwritePermissions(_role: string, userId: string, businessId: string): string[] {
  // Never expose public Role.any() permissions for business records!
  return [
    `user:${userId}`,
    `team:${businessId}`,
  ]
}

/**
 * Secure File Upload Validation
 * Validates file size, MIME type, extension whitelist, path traversal, and executable blocking.
 */
export function validateFileUpload(
  file: File,
  allowedTypes: string[],
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  // 1. Check path traversal in filename
  if (file.name.includes('../') || file.name.includes('..\\') || file.name.includes('/') || file.name.includes('\\')) {
    return { valid: false, error: 'Malicious filename detected' }
  }

  // 2. Reject dangerous executable & script extensions
  const dangerousExtensions = [
    '.html', '.htm', '.svg', '.exe', '.sh', '.php', '.js', '.bat', '.cmd', '.vbs', '.jar', '.py', '.rb', '.pl', '.cgi'
  ]
  const lowerName = file.name.toLowerCase()
  for (const ext of dangerousExtensions) {
    if (lowerName.endsWith(ext)) {
      return { valid: false, error: `Executable or script file type '${ext}' is strictly forbidden` }
    }
  }

  // 3. Extension whitelist check
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx', '.csv', '.xlsx']
  const hasAllowedExt = allowedExtensions.some((ext) => lowerName.endsWith(ext))
  if (!hasAllowedExt) {
    return { valid: false, error: 'File extension is not permitted' }
  }

  // 4. MIME type check
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid MIME file type' }
  }

  // 5. File size check
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` }
  }

  return { valid: true }
}

export function isSecureEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return true
  }
  return window.location.protocol === 'https:'
}

export const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: false,
  SESSION_TIMEOUT_MINUTES: 30,
  MAX_SESSIONS_PER_USER: 5,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPT_WINDOW_MINUTES: 15,
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MAX_API_REQUESTS_PER_MINUTE: 100,
  MAX_CONCURRENT_REQUESTS: 10,
}

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} characters`)
  }
  if (password.length > SECURITY_CONFIG.PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${SECURITY_CONFIG.PASSWORD_MAX_LENGTH} characters`)
  }
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  return {
    valid: errors.length === 0,
    errors,
  }
}

export function isCommonPassword(password: string): boolean {
  const common = ['password', '123456', '12345678', 'qwerty', 'abc123', 'admin']
  return common.includes(password.toLowerCase())
}
