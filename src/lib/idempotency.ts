/**
 * Idempotency Key Manager
 * 
 * Prevents double-submission of financial transactions (e.g. double clicking Receive Payment or Create Sale).
 * Caches in-flight Promises and completed results so concurrent duplicate requests return the same result.
 */

interface CacheRecord {
  timestamp: number
  promise: Promise<any>
}

export class IdempotencyManager {
  private cache = new Map<string, CacheRecord>()
  private ttlMs: number

  constructor(ttlMs: number = 60000) {
    this.ttlMs = ttlMs
  }

  /**
   * Process a request idempotently.
   * If key has been processed or is currently in-flight within ttlMs, returns cached promise/result.
   */
  async execute<T>(key: string | undefined, operation: () => Promise<T>): Promise<T> {
    if (!key || key.trim() === '') {
      return await operation()
    }

    const now = Date.now()
    const cached = this.cache.get(key)

    if (cached && now - cached.timestamp < this.ttlMs) {
      return cached.promise as Promise<T>
    }

    const promise = operation()

    this.cache.set(key, {
      timestamp: now,
      promise,
    })

    // Clean up expired keys
    if (this.cache.size > 1000) {
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp >= this.ttlMs) {
          this.cache.delete(k)
        }
      }
    }

    return promise
  }

  clear(): void {
    this.cache.clear()
  }
}

export const idempotencyManager = new IdempotencyManager()
