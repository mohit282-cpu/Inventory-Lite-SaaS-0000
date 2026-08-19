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
      phone: data.phone,
      avatar: data.avatar,
      preferences: defaultPreferences,
    }

    // Top-level user entity, so system scope is used
    return await this.create<AppUser>(userData, 'system', userId)
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId: string): Promise<AppUser | null> {
    try {
      return await this.getById<AppUser>(userId, 'system')
    } catch (error) {
      return null
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<AppUser> {
    const user = await this.getUserProfile(userId)
    if (!user) {
      throw new Error(`User profile not found for ID ${userId}`)
    }

    const updatedPreferences: UserPreferences = {
      ...user.preferences,
      ...preferences,
      notifications: {
        ...user.preferences?.notifications,
        ...preferences.notifications,
      },
    }

    return await this.update<AppUser>(userId, { preferences: updatedPreferences }, 'system')
  }

  /**
   * Set active business ID in user preferences
   */
  async setActiveBusiness(userId: string, businessId: string): Promise<AppUser> {
    return await this.updateUserPreferences(userId, { activeBusinessId: businessId })
  }
}

export const userService = new UserService()
