import { localDB, OfflineAuthRecord } from './db'

/**
 * Web Crypto SHA-256 helper with salt for offline password verification.
 * Never stores plaintext passwords.
 */
async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${salt}:${password}`)

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } else {
    // Node environment fallback for unit tests
    const nodeCrypto = await import('crypto')
    return nodeCrypto.createHash('sha256').update(`${salt}:${password}`).digest('hex')
  }
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server-device'
  let deviceId = localStorage.getItem('inventory_lite_device_id')
  if (!deviceId) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `device_${Date.now()}`
    localStorage.setItem('inventory_lite_device_id', deviceId)
  }
  return deviceId
}

export interface OfflineVerifyResult {
  success: boolean
  code?: 'INVALID_CREDENTIALS' | 'OFFLINE_NOT_AUTHORIZED'
  error?: string
  record?: OfflineAuthRecord
}

export class OfflineAuthService {
  /**
   * Record a successful online login to permit future offline access on this device.
   */
  async recordOnlineLogin(
    email: string,
    password: string,
    user: any,
    userProfile: any,
    activeBusiness: any,
    memberships: any[]
  ): Promise<void> {
    if (!email || !user || !activeBusiness) return

    try {
      const saltBytes = new Uint8Array(16)
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(saltBytes)
      } else {
        for (let i = 0; i < 16; i++) saltBytes[i] = Math.floor(Math.random() * 256)
      }
      const salt = Array.from(saltBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      const passwordHash = await hashPasswordWithSalt(password, salt)
      const deviceId = getOrCreateDeviceId()
      const normalizedEmail = email.toLowerCase().trim()

      const record: OfflineAuthRecord = {
        id: normalizedEmail,
        userId: user.$id || user.id,
        email: normalizedEmail,
        passwordHash,
        salt,
        deviceId,
        userProfile,
        activeBusinessId: activeBusiness.$id || activeBusiness.id,
        activeBusiness,
        memberships: memberships || [],
        authorizedAt: new Date().toISOString(),
        lastValidatedAt: new Date().toISOString(),
      }

      await localDB.authRecords.put(record)
      localStorage.setItem('inventory_lite_last_offline_user', normalizedEmail)
    } catch (err) {
      console.error('[OfflineAuthService] Failed to record offline authorization:', err)
    }
  }

  /**
   * Verify credentials locally when operating offline.
   */
  async verifyOfflineCredentials(email: string, password: string): Promise<OfflineVerifyResult> {
    if (!email || !password) {
      return {
        success: false,
        code: 'INVALID_CREDENTIALS',
        error: 'Email and password are required.',
      }
    }

    const normalizedEmail = email.toLowerCase().trim()
    const record = await localDB.authRecords.get(normalizedEmail)

    if (!record) {
      return {
        success: false,
        code: 'OFFLINE_NOT_AUTHORIZED',
        error:
          'First-time login requires an internet connection. Connect to the internet and sign in once to enable offline access on this device.',
      }
    }

    const computedHash = await hashPasswordWithSalt(password, record.salt)
    if (computedHash !== record.passwordHash) {
      return {
        success: false,
        code: 'INVALID_CREDENTIALS',
        error: 'Invalid email or password.',
      }
    }

    // Update lastValidatedAt
    record.lastValidatedAt = new Date().toISOString()
    await localDB.authRecords.put(record)
    localStorage.setItem('inventory_lite_last_offline_user', normalizedEmail)

    return {
      success: true,
      record,
    }
  }

  /**
   * Retrieve authorized offline record for automatic session restoration.
   */
  async getAuthorizedOfflineRecord(email?: string): Promise<OfflineAuthRecord | null> {
    try {
      if (email) {
        const record = await localDB.authRecords.get(email.toLowerCase().trim())
        if (record) return record
      }

      const lastUser = typeof window !== 'undefined' ? localStorage.getItem('inventory_lite_last_offline_user') : null
      if (lastUser) {
        const record = await localDB.authRecords.get(lastUser.toLowerCase().trim())
        if (record) return record
      }

      const allRecords = await localDB.authRecords.toArray()
      if (allRecords.length > 0) {
        // Return most recently validated
        allRecords.sort(
          (a, b) => new Date(b.lastValidatedAt || 0).getTime() - new Date(a.lastValidatedAt || 0).getTime()
        )
        return allRecords[0]
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Check if any authorized offline record exists on this device.
   */
  async hasAuthorizedRecord(email?: string): Promise<boolean> {
    const record = await this.getAuthorizedOfflineRecord(email)
    return !!record
  }

  /**
   * Revoke offline record upon explicit logout.
   */
  async clearOfflineRecord(emailOrUserId?: string): Promise<void> {
    try {
      if (emailOrUserId) {
        const norm = emailOrUserId.toLowerCase().trim()
        await localDB.authRecords.delete(norm)
        const userRec = await localDB.authRecords.where('userId').equals(emailOrUserId).first()
        if (userRec) {
          await localDB.authRecords.delete(userRec.id)
        }
      } else {
        await localDB.authRecords.clear()
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('inventory_lite_last_offline_user')
      }
    } catch (err) {
      console.error('[OfflineAuthService] Error clearing offline record:', err)
    }
  }
}

export const offlineAuthService = new OfflineAuthService()
