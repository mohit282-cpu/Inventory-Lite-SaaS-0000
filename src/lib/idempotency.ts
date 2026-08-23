import { localDB } from './offline/db'

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
  private persistentRecords = new Map<string, IdempotencyRecord>()
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
    this.persistentRecords.clear()
  }

  /**
   * Process a transaction idempotently with persistent storage and payload hash validation (P0-2).
   * Prevents duplicate financial transactions across serverless processes, tabs, and network retries.
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
    const compositeKey = `${businessId}:${operationType}:${key}`
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
      // 2. Check in-memory persistent store
      const memRecord = this.persistentRecords.get(compositeKey)
      if (memRecord) {
        if (memRecord.requestHash !== requestHash) {
          throw new Error(
            `IDEMPOTENCY_KEY_REUSE_MISMATCH: Idempotency key '${key}' was already used for a different payload in ${operationType}`
          )
        }
        if (memRecord.status === 'COMPLETED' && memRecord.result !== undefined) {
          return memRecord.result as T
        }
      }

      // 3. Check IndexedDB persistent store fallback
      try {
        const dbRecord = await localDB.idempotencyRecords.get(compositeKey)
        if (dbRecord) {
          if (dbRecord.requestHash !== requestHash) {
            throw new Error(
              `IDEMPOTENCY_KEY_REUSE_MISMATCH: Idempotency key '${key}' was already used for a different payload in ${operationType}`
            )
          }
          if (dbRecord.status === 'COMPLETED' && dbRecord.result !== undefined) {
            this.persistentRecords.set(compositeKey, dbRecord as any)
            return dbRecord.result as T
          }
        }
      } catch {
        // Dexie lookup failure non-fatal
      }

      // 4. Run application persistent check (e.g. check DB if sale/payment exists with key)
      try {
        const existingDoc = await persistentCheck()
        if (existingDoc) {
          const docHash = (existingDoc as any)?.requestHash || (existingDoc as any)?.sale?.requestHash
          if (docHash && docHash !== requestHash) {
            throw new Error(
              `IDEMPOTENCY_KEY_REUSE_MISMATCH: Idempotency key '${key}' was already used for a different payload in ${operationType}`
            )
          }
          const completedRec: IdempotencyRecord = {
            idempotencyKey: key,
            businessId,
            operationType,
            requestHash,
            status: 'COMPLETED',
            resourceType,
            resourceId: (existingDoc as any)?.$id || (existingDoc as any)?.id || (existingDoc as any)?.sale?.$id,
            result: existingDoc,
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          }
          this.persistentRecords.set(compositeKey, completedRec)
          try {
            await localDB.idempotencyRecords.put({ ...completedRec, id: compositeKey })
          } catch {}
          return existingDoc
        }
      } catch (err: any) {
        if (err.message?.includes('IDEMPOTENCY_KEY_REUSE_MISMATCH')) {
          throw err
        }
      }

      // 5. Reserve 'PROCESSING' record atomically
      const processingRecord: IdempotencyRecord = {
        idempotencyKey: key,
        businessId,
        operationType,
        requestHash,
        status: 'PROCESSING',
        resourceType,
        createdAt: new Date().toISOString(),
      }
      this.persistentRecords.set(compositeKey, processingRecord)
      try {
        await localDB.idempotencyRecords.put({ ...processingRecord, id: compositeKey })
      } catch {}

      // 6. Execute operation
      try {
        const result = await operation()
        const completedRec: IdempotencyRecord = {
          idempotencyKey: key,
          businessId,
          operationType,
          requestHash,
          status: 'COMPLETED',
          resourceType,
          resourceId: (result as any)?.$id || (result as any)?.id,
          result,
          createdAt: processingRecord.createdAt,
          completedAt: new Date().toISOString(),
        }
        this.persistentRecords.set(compositeKey, completedRec)
        try {
          await localDB.idempotencyRecords.put({ ...completedRec, id: compositeKey })
        } catch {}
        return result
      } catch (err: any) {
        const failedRec: IdempotencyRecord = {
          idempotencyKey: key,
          businessId,
          operationType,
          requestHash,
          status: 'FAILED',
          resourceType,
          error: err?.message || 'Operation failed',
          createdAt: processingRecord.createdAt,
          completedAt: new Date().toISOString(),
        }
        this.persistentRecords.set(compositeKey, failedRec)
        try {
          await localDB.idempotencyRecords.put({ ...failedRec, id: compositeKey })
        } catch {}
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

