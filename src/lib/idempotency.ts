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

  /**
   * Process a request idempotently with persistent store fallback.
   * Prevents duplicate transactions across serverless containers and process restarts.
   */
  async executeWithPersistentFallback<T>(
    key: string | undefined,
    persistentCheck: () => Promise<T | null>,
    operation: () => Promise<T>
  ): Promise<T> {
    if (!key || key.trim() === '') {
      return await operation()
    }

    const now = Date.now()
    const cached = this.cache.get(key)

    if (cached && now - cached.timestamp < this.ttlMs) {
      return cached.promise as Promise<T>
    }

    // Synchronously create and cache the in-flight execution promise
    const wrappedPromise = (async () => {
      try {
        const existingDoc = await persistentCheck()
        if (existingDoc) {
          return existingDoc
        }
      } catch {
        // Persistent lookup failure non-fatal, proceed with operation
      }
      return await operation()
    })()

    this.cache.set(key, {
      timestamp: now,
      promise: wrappedPromise,
    })

    if (this.cache.size > 1000) {
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp >= this.ttlMs) {
          this.cache.delete(k)
        }
      }
    }

    return wrappedPromise
  }
}

export const idempotencyManager = new IdempotencyManager()
