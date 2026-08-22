import { Query } from 'appwrite'
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
  private creationPromises = new Map<string, Promise<AppUser>>()

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
   * Idempotent user profile creation / retrieval
   * Prevents 404 console error on missing document and 409 conflict on concurrent creation.
   * Employs single-flight lock so concurrent callers wait on the same promise without duplicating HTTP POST requests.
   */
  async getOrCreateUserProfile(
    userId: string,
    data: {
      name: string
      email: string
      phone?: string
      avatar?: string
      preferences?: Partial<UserPreferences>
    }
  ): Promise<AppUser> {
    if (this.creationPromises.has(userId)) {
      return await this.creationPromises.get(userId)!
    }

    const promise = (async () => {
      const existing = await this.getUserProfile(userId)
      if (existing) {
        return existing
      }

      try {
        return await this.createUserProfile(userId, data)
      } catch (err: any) {
        if (err?.code === 409 || err?.message?.includes('already exists') || err?.type === 'document_already_exists') {
          const doc = await this.getUserProfile(userId)
          if (doc) return doc
        }
        throw err
      }
    })().finally(() => {
      this.creationPromises.delete(userId)
    })

    this.creationPromises.set(userId, promise)
    return await promise
  }

  /**
   * Get user profile by user ID
   * Uses list with Query.equal('$id', userId) to prevent browser 404 console errors.
   */
  async getUserProfile(userId: string): Promise<AppUser | null> {
    try {
      const docs = await this.list<any>('system', [Query.equal('$id', userId)])
      if (!docs || docs.length === 0) {
        return null
      }

      const doc = docs[0]
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
