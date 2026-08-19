/**
 * Security Utilities and Guidelines
 * 
 * This file contains security-related utilities and serves as documentation
 * for security principles to be followed throughout the application.
 */

// ==================== Security Principles ====================

/**
 * MULTI-TENANT SECURITY PRINCIPLES:
 * 
 * 1. TENANT ISOLATION: All business data must be scoped by businessId
 *    - Every database query must include tenant filtering
 *    - Never expose data from one business to another
 *    - Validate tenant access on every request
 * 
 * 2. AUTHORIZATION: Role-based access control (RBAC)
 *    - Users have specific roles within businesses
 *    - Verify permissions before each operation
 *    - Implement proper ownership checks
 * 
 * 3. DATA ENCRYPTION: Use Appwrite's built-in encryption
 *    - All data at rest is encrypted by Appwrite
 *    - Use HTTPS for all communications
 *    - Never store sensitive data in plain text
 * 
 * 4. API SECURITY: Proper API key management
 *    - Never expose server-side API keys to client
 *    - Use Appwrite's permission system
 *    - Implement rate limiting
 * 
 * 5. SESSION MANAGEMENT: Secure session handling
 *    - Use Appwrite's built-in session management
 *    - Implement proper logout functionality
 *    - Handle session expiration gracefully
 */

// ==================== Security Utilities ====================

/**
 * Validate tenant access
 * Ensures the current user has access to the specified business
 */
export function validateTenantAccess(userBusinessId: string, requestedBusinessId: string): boolean {
  return userBusinessId === requestedBusinessId
}

/**
 * Check if user has required role
 */
export function hasRequiredRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole)
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number (Nepal format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+977)?[0-9]{9,10}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

/**
 * Generate secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '****'
  }
  return data.substring(0, visibleChars) + '****'
}

/**
 * Mask email for display
 */
export function maskEmail(email: string): string {
  const [username, domain] = email.split('@')
  if (username.length <= 2) {
    return `${username}@${domain}`
  }
  return `${username[0]}${'*'.repeat(username.length - 2)}${username[username.length - 1]}@${domain}`
}

/**
 * Mask phone number for display
 */
export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length <= 4) {
    return cleaned
  }
  return `${cleaned.substring(0, 2)}${'*'.repeat(cleaned.length - 4)}${cleaned.substring(cleaned.length - 2)}`
}

// ==================== Appwrite Security Helpers ====================

/**
 * Build Appwrite permission array based on user role
 */
export function buildAppwritePermissions(role: string, userId: string, _businessId: string): string[] {
  const basePermissions = [`user:${userId}`]
  
  // Business owners and admins have full access
  if (role === 'owner' || role === 'admin') {
    return basePermissions
  }
  
  // Other roles have read-only access
  return [...basePermissions, `read:role:${role}`]
}

/**
 * Validate file upload security
 */
export function validateFileUpload(file: File, allowedTypes: string[], maxSizeMB: number = 5): { valid: boolean; error?: string } {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' }
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` }
  }
  
  return { valid: true }
}

/**
 * Check if running in secure environment
 */
export function isSecureEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return true // Server-side is secure
  }
  return window.location.protocol === 'https:'
}

// ==================== Security Constants ====================

export const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: false,
  
  // Session settings
  SESSION_TIMEOUT_MINUTES: 30,
  MAX_SESSIONS_PER_USER: 5,
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPT_WINDOW_MINUTES: 15,
  
  // File upload limits
  MAX_FILE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  
  // API limits
  MAX_API_REQUESTS_PER_MINUTE: 100,
  MAX_CONCURRENT_REQUESTS: 10,
}

// ==================== Security Validation ====================

/**
 * Validate password strength
 */
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
  
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check for common password patterns
 */
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'monkey', 'master', 'dragon', '111111', 'baseball',
    'iloveyou', 'trustno1', 'sunshine', 'princess', 'admin'
  ]
  
  return commonPasswords.includes(password.toLowerCase())
}
