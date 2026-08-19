import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { AppUser, UserPreferences } from '@/types'

/**
 * User Profile Service
 * 
 * Handles user profile operations in the 'users' collection.
 * Core authentication is handled by Appwrite Auth (Account API), while
 * extended user details and preferences are stored in this collection.
 */
export class UserService extends BaseService {
  constructor() {
    super(COLLECTIONS.USERS)
  }

  /**
   * Create or update user profile document
   */
  async createUserProfile(
    userId: string,
    data: {
      name: string
      email: string
      phone?: string
      avatar?: string
      preferences?: Partial<UserPreferences>
    }
  ): Promise<AppUser> {
    const defaultPreferences: UserPreferences = {
      theme: 'system',
      language: 'en',
      notifications: {
        email: true,
        push: true,
      },
      ...data.preferences,
    }

    const userData = {
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      avatar: data.avatar || '',
      preferences: JSON.stringify(defaultPreferences),
    }

    // Top-level user entity, pass userId as document ID
    const doc = await this.create<any>(userData, 'system', userId, undefined, userId)

    return {
      ...doc,
      preferences: defaultPreferences,
    } as AppUser
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<AppUser | null> {
    try {
      const doc = await this.getById<any>(userId, 'system')
      let preferences: UserPreferences = {
        theme: 'system',
        language: 'en',
        notifications: { email: true, push: true },
      }
      if (doc.preferences) {
        try {
          preferences = typeof doc.preferences === 'string' ? JSON.parse(doc.preferences) : doc.preferences
        } catch {
          // If parsing fails, fall back to default
        }
      }
      return {
        ...doc,
        preferences,
      } as AppUser
    } catch (error) {
      return null
    }
  }

  /**
   * Update user profile details
   */
  async updateUserProfile(
    userId: string,
    data: Partial<{
      name: string
      phone: string
      avatar: string
    }>
  ): Promise<AppUser> {
    const doc = await this.update<any>(userId, data, 'system')
    return doc as AppUser
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<AppUser> {
    const user = await this.getUserProfile(userId)
    const currentPrefs: UserPreferences = user?.preferences || {
      theme: 'system',
      language: 'en',
      notifications: { email: true, push: true },
    }

    const updatedPreferences: UserPreferences = {
      ...currentPrefs,
      ...preferences,
      notifications: {
        ...currentPrefs.notifications,
        ...preferences.notifications,
      },
    }

    const doc = await this.update<any>(
      userId,
      { preferences: JSON.stringify(updatedPreferences) },
      'system'
    )

    return {
      ...doc,
      preferences: updatedPreferences,
    } as AppUser
  }

  /**
   * Set active business ID in user preferences
   */
  async setActiveBusiness(userId: string, businessId: string): Promise<AppUser> {
    return await this.updateUserPreferences(userId, { activeBusinessId: businessId })
  }
}

export const userService = new UserService()
