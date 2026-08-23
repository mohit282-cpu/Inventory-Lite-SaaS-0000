import { account } from '@/config/appwrite'
import { ID, Models } from 'appwrite'
import { formatE164Phone } from '@/lib/utils'

/**
 * Authentication Service
 * 
 * Handles all authentication operations using Appwrite Account API.
 * Provides methods for user registration, login, session management, and password recovery.
 */
export class AuthService {
  /**
   * Register a new user account
   */
  async register(email: string, password: string, name: string, phone?: string): Promise<Models.User<Models.Preferences>> {
    const userAcc = await account.create(
      ID.unique(),
      email,
      password,
      name
    )

    // Format phone number to E.164 standard (+977...) for Appwrite Auth Console
    if (phone && phone.trim()) {
      const formattedPhone = formatE164Phone(phone)
      try {
        await account.updatePrefs({ phone: formattedPhone, rawPhone: phone })
      } catch {
        // Non-blocking
      }
    }

    return userAcc
  }

  /**
   * Update native Appwrite Auth Phone number on user account
   */
  async updatePhone(phone: string, password?: string): Promise<Models.User<Models.Preferences> | null> {
    if (!phone || !phone.trim()) return null
    const formattedPhone = formatE164Phone(phone)

    // 1. Try Web SDK account.updatePhone if password is provided
    if (password) {
      try {
        const res = await account.updatePhone(formattedPhone, password)
        return res
      } catch (err) {
        console.warn('[AuthService] account.updatePhone SDK warning:', err)
      }
    }

    // 2. Always store formatted phone in user preferences
    try {
      return await account.updatePrefs({ phone: formattedPhone, rawPhone: phone })
    } catch {
      return null
    }
  }

  /**
   * Login with email and password
   * Automatically clears any pre-existing active session to prevent 409 conflict errors
   */
  async login(email: string, password: string): Promise<Models.Session> {
    try {
      await account.deleteSession('current')
    } catch {
      // No active session to delete, proceed with login
    }
    return await account.createEmailPasswordSession(email, password)
  }

  /**
   * Logout current session
   */
  async logout(): Promise<{}> {
    return await account.deleteSession('current')
  }

  /**
   * Get current user account
   */
  async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    if (typeof window !== 'undefined') {
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'inventory-lite'
      const hasCookie = document.cookie.includes('a_session') || document.cookie.includes(projectId)
      const hasFallback = !!localStorage.getItem('cookieFallback') || !!localStorage.getItem('a_session')
      if (!hasCookie && !hasFallback) {
        return null
      }
    }
    try {
      return await account.get()
    } catch (error) {
      return null
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<Models.Session | null> {
    try {
      return await account.getSession('current')
    } catch (error) {
      return null
    }
  }

  /**
   * Update user account
   */
  async updateAccount(data: { name?: string; email?: string; password?: string }): Promise<Models.User<Models.Preferences>> {
    return await account.updatePrefs(data)
  }

  /**
   * Update current user password
   */
  async updatePassword(password: string, oldPassword?: string): Promise<Models.User<Models.Preferences>> {
    return await account.updatePassword(password, oldPassword)
  }

  /**
   * Request password recovery
   */
  async recoverPassword(email: string): Promise<Models.Token> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    return await account.createRecovery(email, `${origin}/auth/reset-password`)
  }

  /**
   * Complete password recovery
   */
  async completePasswordRecovery(userId: string, secret: string, password: string): Promise<Models.Token> {
    return await account.updateRecovery(userId, secret, password)
  }

  /**
   * Create email verification
   */
  async createVerification(url: string): Promise<Models.Token> {
    return await account.createVerification(url)
  }

  /**
   * Update email verification
   */
  async updateVerification(userId: string, secret: string): Promise<Models.Token> {
    return await account.updateVerification(userId, secret)
  }
}

export const authService = new AuthService()
