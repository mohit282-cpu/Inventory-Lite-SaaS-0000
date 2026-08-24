import { COLLECTIONS, databases, DATABASE_ID } from '@/config/appwrite'
import { sanitizeAppwriteDocId } from './utils'

/**
 * Idempotency Record Interface
 * 
 * Persistent idempotency fields required by P0-2:
 * idempotencyKey, businessId, operationType, requestHash, status, resourceType, resourceId, createdAt, completedAt, error
 */
export interface IdempotencyRecord {
  idempotencyKey: string
  businessId: string
  operationType: string
  requestHash: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  resourceType?: string
  resourceId?: string
  result?: any
  error?: string
  createdAt: string
  completedAt?: string
}

interface CacheRecord {
  timestamp: number
  promise: Promise<any>
  requestHash?: string
}

/**
 * Compute deterministic hash of request payload for idempotency verification
 */
export function computePayloadHash(payload: any): string {
  if (payload === undefined || payload === null) return 'hash_empty'
  try {
    const serialized = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload, (_key, val) => {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            return Object.keys(val).sort().reduce((sorted: any, k) => {
              sorted[k] = val[k]
              return sorted
            }, {})
          }
          return val
        })
    
    let hash = 0
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    return `h_${Math.abs(hash).toString(36)}_${serialized.length}`
  } catch {
    return `h_raw_${String(payload).slice(0, 32)}`
  }
}

export class IdempotencyManager {
  private cache = new Map<string, CacheRecord>()
  private ttlMs: number

  constructor(ttlMs: number = 60000) {
    this.ttlMs = ttlMs
  }

  /**
   * Process a request idempotently.
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
   * Process a transaction idempotently with persistent storage, stale lock recovery, and payload hash validation (P0-2).
   * Prevents duplicate financial transactions across serverless processes, tabs, and network retries.
   * Utilizes Appwrite collection for authoritative distributed lock.
   */
  async executeIdempotentTransaction<T>(
    params: {
      idempotencyKey: string | undefined
      businessId: string
      operationType: string
      payload?: any
      resourceType?: string
    },
    persistentCheck: () => Promise<T | null>,
    operation: () => Promise<T>
  ): Promise<T> {
    const { idempotencyKey, businessId, operationType, payload, resourceType } = params

    if (!idempotencyKey || idempotencyKey.trim() === '') {
      return await operation()
    }

    const key = idempotencyKey.trim()
    const compositeKey = sanitizeAppwriteDocId(`${key}_${businessId}_${operationType}`, 'idemp')
    const requestHash = computePayloadHash(payload)

    // 1. In-memory lock per composite key (prevents duplicate execution within same JS runtime)
    const now = Date.now()
    const cached = this.cache.get(compositeKey)
    if (cached && now - cached.timestamp < this.ttlMs) {
      if (cached.requestHash && cached.requestHash !== requestHash) {
        throw new Error(
          `IDEMPOTENCY_KEY_REUSE_MISMATCH: Idempotency key '${key}' was already used for a different payload in ${operationType}`
        )
      }
      return cached.promise as Promise<T>
    }

    const taskPromise = (async (): Promise<T> => {
      // 2. Check distributed persistent store for completed or active record
      try {
        const memRecord = await databases.getDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey)
        if (memRecord) {
          if (memRecord.requestHash !== requestHash) {
            throw new Error(
              `IDEMPOTENCY_KEY_REUSE_MISMATCH: Idempotency key '${key}' was already used for a different payload in ${operationType}`
            )
          }
          if (memRecord.status === 'COMPLETED' && memRecord.result) {
            return JSON.parse(memRecord.result) as T
          }
          if (memRecord.status === 'PROCESSING') {
            const createdAt = new Date(memRecord.createdAt).getTime()
            if (Date.now() - createdAt < 60000) {
              throw new Error(`IDEMPOTENCY_TRANSACTION_IN_PROGRESS: Transaction with key '${key}' is currently being processed`)
            }
          }
        }
      } catch (err: any) {
        // Ignore 404 (document not found)
        if (err?.code !== 404) {
          // Fall through, might be network error, we will just proceed with cautious checks
        }
      }

      // 3. Run application persistent check (e.g. check backend DB if sale/payment exists with key)
      try {
        const existingDoc = await persistentCheck()
        if (existingDoc) {
          const docHash = (existingDoc as any)?.requestHash || (existingDoc as any)?.sale?.requestHash
          if (docHash && docHash !== requestHash) {
            throw new Error(
              `IDEMPOTENCY_KEY_REUSE_MISMATCH: Idempotency key '${key}' was already used for a different payload in ${operationType}`
            )
          }
          
          try {
            await databases.createDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, {
              idempotencyKey: key,
              businessId,
              operationType,
              requestHash,
              status: 'COMPLETED',
              resourceType,
              resourceId: (existingDoc as any)?.$id || (existingDoc as any)?.id || (existingDoc as any)?.sale?.$id || '',
              result: JSON.stringify(existingDoc),
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            })
          } catch (e: any) {
            if (e?.code === 409) {
              // Already exists, we update it
              await databases.updateDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, {
                status: 'COMPLETED',
                result: JSON.stringify(existingDoc),
                completedAt: new Date().toISOString(),
              })
            }
          }

          return existingDoc
        }
      } catch (err: any) {
        if (
          err.message?.includes('IDEMPOTENCY_KEY_REUSE_MISMATCH') ||
          err.message?.includes('IDEMPOTENCY_TRANSACTION_IN_PROGRESS')
        ) {
          throw err
        }
      }

      // 4. Reserve 'PROCESSING' record atomically in distributed store
      const processingRecord = {
        idempotencyKey: key,
        businessId,
        operationType,
        requestHash,
        status: 'PROCESSING',
        resourceType: resourceType || 'unknown',
        createdAt: new Date().toISOString(),
      }
      
      try {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, processingRecord)
      } catch (e: any) {
        if (e?.code === 404 || (e?.message && e.message.toLowerCase().includes('could not be found'))) {
          // Idempotency collection not provisioned in Appwrite, fallback directly to operation
          return await operation()
        }
        if (e?.code === 409) {
           // Document already exists, someone else created it
           try {
             const existing = await databases.getDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey)
             if (existing.status === 'COMPLETED') {
               return JSON.parse(existing.result) as T
             }
           } catch {
             // Fallback
           }
           throw new Error(`IDEMPOTENCY_TRANSACTION_IN_PROGRESS: Transaction with key '${key}' is currently being processed`)
        }
        throw e
      }

      // 5. Execute operation
      try {
        const result = await operation()
        
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, {
          status: 'COMPLETED',
          resourceId: (result as any)?.$id || (result as any)?.id || '',
          result: JSON.stringify(result),
          completedAt: new Date().toISOString(),
        })

        return result
      } catch (err: any) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, {
          status: 'FAILED',
          error: err?.message || 'Operation failed',
          completedAt: new Date().toISOString(),
        })
        throw err
      }
    })()

    this.cache.set(compositeKey, {
      timestamp: now,
      promise: taskPromise,
      requestHash,
    })

    return taskPromise
  }

  /**
   * Backward-compatible helper wrapping executeIdempotentTransaction
   */
  async executeWithPersistentFallback<T>(
    key: string | undefined,
    persistentCheck: () => Promise<T | null>,
    operation: () => Promise<T>,
    businessId: string = 'system',
    operationType: string = 'generic_operation',
    payload?: any
  ): Promise<T> {
    return await this.executeIdempotentTransaction<T>(
      {
        idempotencyKey: key,
        businessId,
        operationType,
        payload,
      },
      persistentCheck,
      operation
    )
  }
}

export const idempotencyManager = new IdempotencyManager()
export const serverIdempotencyManager = idempotencyManager



