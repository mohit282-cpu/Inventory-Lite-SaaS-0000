import { account } from '@/config/appwrite'
import { ID, Models } from 'appwrite'

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
  async register(email: string, password: string, name: string): Promise<Models.User<Models.Preferences>> {
    return await account.create(
      ID.unique(),
      email,
      password,
      name
    )
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
