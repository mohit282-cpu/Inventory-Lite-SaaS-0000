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
   * @param email - User email
   * @param password - User password
   * @param name - User display name
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
   * @param email - User email
   * @param password - User password
   */
  async login(email: string, password: string): Promise<Models.Session> {
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
   * @param data - User data to update
   */
  async updateAccount(data: { name?: string; email?: string; password?: string }): Promise<Models.User<Models.Preferences>> {
    return await account.updatePrefs(data)
  }

  /**
   * Request password recovery
   * @param email - User email
   */
  async recoverPassword(email: string): Promise<Models.Token> {
    return await account.createRecovery(email, 'http://localhost:3000/auth/reset-password')
  }

  /**
   * Complete password recovery
   * @param userId - User ID
   * @param secret - Recovery secret
   * @param password - New password
   */
  async completePasswordRecovery(userId: string, secret: string, password: string): Promise<Models.Token> {
    return await account.updateRecovery(userId, secret, password)
  }

  /**
   * Create email verification
   * @param url - Redirect URL after verification
   */
  async createVerification(url: string): Promise<Models.Token> {
    return await account.createVerification(url)
  }

  /**
   * Update email verification
   * @param userId - User ID
   * @param secret - Verification secret
   */
  async updateVerification(userId: string, secret: string): Promise<Models.Token> {
    return await account.updateVerification(userId, secret)
  }
}

export const authService = new AuthService()
