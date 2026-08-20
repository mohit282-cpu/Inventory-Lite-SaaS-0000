/**
 * In-Memory Sliding Window Rate Limiter
 * 
 * Protects critical application endpoints (login, payment creation, sale creation, file uploads).
 * Enforces request rate limits per client key / IP / user ID.
 */

interface RateLimitWindow {
  timestamps: number[]
}

export class RateLimiter {
  private requests = new Map<string, RateLimitWindow>()

  /**
   * Check and enforce rate limit.
   * Throws Error if request limit is exceeded within window.
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

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key)
    } else {
      this.requests.clear()
    }
  }
}

export const rateLimiter = new RateLimiter()
