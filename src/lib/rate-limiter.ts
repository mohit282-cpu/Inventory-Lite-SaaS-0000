import { databases, DATABASE_ID } from '@/config/appwrite'
import { ID, Query } from 'appwrite'
import { sanitizeAppwriteDocId } from './utils'

interface RateLimitWindow {
  timestamps: number[]
}

export class RateLimiter {
  private requests = new Map<string, RateLimitWindow>()

  /**
   * Synchronous Sliding Window Rate Limiter
   * Enforces request rate limits per client key / IP / user ID.
   */
  checkLimit(key: string, maxRequests: number = 30, windowMs: number = 60000): void {
    if (!key) return

    const now = Date.now()
    const record = this.requests.get(key) || { timestamps: [] }

    // Filter timestamps within current sliding window
    const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs)

    if (validTimestamps.length >= maxRequests) {
      throw new Error(`Rate limit exceeded (${maxRequests} requests per ${windowMs / 1000}s). Please wait before retrying.`)
    }

    validTimestamps.push(now)
    this.requests.set(key, { timestamps: validTimestamps })
  }

  /**
   * Distributed Persistent Rate Limiter
   * Tracks request limits across serverless instances using Appwrite DB when available,
   * falling back to local sliding window memory.
   */
  async checkLimitAsync(key: string, maxRequests: number = 30, windowMs: number = 60000): Promise<void> {
    // Enforce local memory limit first for instant response
    this.checkLimit(key, maxRequests, windowMs)

    if (!key) return

    try {
      const sanitizedKey = sanitizeAppwriteDocId(`rl_${key}`, 'rl')
      const windowStart = new Date(Date.now() - windowMs).toISOString()

      // Attempt querying rate limits collection in Appwrite
      const existing = await databases.listDocuments(
        DATABASE_ID,
        'rate_limits',
        [Query.equal('clientKey', key), Query.greaterThanEqual('createdAt', windowStart)]
      )

      if (existing.documents.length >= maxRequests) {
        throw new Error(`Rate limit exceeded (${maxRequests} requests per ${windowMs / 1000}s). Please wait before retrying.`)
      }

      await databases.createDocument(DATABASE_ID, 'rate_limits', ID.unique(), {
        clientKey: key,
        sanitizedKey,
        createdAt: new Date().toISOString(),
      })
    } catch (err: any) {
      if (err?.message?.includes('Rate limit exceeded')) {
        throw err
      }
      // Silently fall back if rate_limits collection is not provisioned in Appwrite DB
    }
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key)
    } else {
      this.requests.clear()
    }
  }
}

export const rateLimiter = new RateLimiter()

