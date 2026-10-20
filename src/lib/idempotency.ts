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
 * Helper to identify Appwrite 404 document not found
 */
export function isDocumentNotFoundError(err: any): boolean {
  if (!err) return false
  const code = err.code || err.status
  const type = err.type
  const message = String(err.message || '').toLowerCase()
  if (type === 'document_not_found') return true
  if (code === 404 && !message.includes('collection') && !message.includes('database')) return true
  if (message.includes('document') && message.includes('not found')) return true
  return false
}

/**
 * Helper to identify missing collection / schema error
 */
export function isCollectionNotFoundError(err: any): boolean {
  if (!err) return false
  const code = err.code || err.status
  const type = err.type
  const message = String(err.message || '').toLowerCase()
  if (type === 'collection_not_found' || type === 'database_not_found') return true
  if (code === 404 && (message.includes('collection') || message.includes('database'))) return true
  if (message.includes('collection with the requested id could not be found')) return true
  return false
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
   * Utilizes Appwrite collection for authoritative distributed records.
   * In-memory cache is used strictly for in-process Promise memoization within the same Node/browser runtime.
   */
  async executeIdempotentTransaction<T>(
    params: {
      idempotencyKey: string | undefined
      businessId: string
      operationType: string
      payload?: any
      resourceType?: string
      enforceKey?: boolean
    },
    persistentCheck: () => Promise<T | null>,
    operation: () => Promise<T>
  ): Promise<T> {
    const { idempotencyKey, businessId, operationType, payload, resourceType, enforceKey = false } = params

    const hasExplicitKey = Boolean(idempotencyKey && idempotencyKey.trim() !== '')
    if (enforceKey && !hasExplicitKey) {
      throw new Error(
        `IDEMPOTENCY_KEY_REQUIRED: Financial operation '${operationType}' requires a valid non-empty idempotency key.`
      )
    }

    const requestHash = computePayloadHash(payload)
    const key = hasExplicitKey
      ? idempotencyKey!.trim()
      : `auto_${businessId}_${operationType}_${requestHash}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const compositeKey = sanitizeAppwriteDocId(`${key}_${businessId}_${operationType}`, 'idemp')

    // 1. In-process memoization per composite key (collapses duplicate concurrent calls within the same Node/browser process)
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
      let memRecord: any = null
      try {
        memRecord = await databases.getDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey)
      } catch (err: any) {
        if (isDocumentNotFoundError(err)) {
          memRecord = null
        } else if (isCollectionNotFoundError(err)) {
          throw new Error(
            `IDEMPOTENCY_STORE_NOT_PROVISIONED: Idempotency collection '${COLLECTIONS.IDEMPOTENCY_KEYS}' is not provisioned in Appwrite database '${DATABASE_ID}'. Operations fail closed to prevent duplicate financial processing.`
          )
        } else {
          // Never interpret an unavailable or erroneous idempotency store as proof that a transaction has not already occurred
          throw new Error(
            `IDEMPOTENCY_STORE_UNAVAILABLE: Authoritative idempotency store query failed (${err?.message || 'unknown database error'}). Cannot safely verify if transaction already occurred.`
          )
        }
      }

      if (memRecord) {
        if (memRecord.requestHash && memRecord.requestHash !== requestHash) {
          throw new Error(
            `IDEMPOTENCY_KEY_REUSE_MISMATCH: Idempotency key '${key}' was already used for a different payload in ${operationType}`
          )
        }
        if (memRecord.status === 'COMPLETED') {
          // 'response' is the actual schema field name; fallback to 'result' for backward compat
          const stored = memRecord.response ?? memRecord.result
          if (stored) {
            try {
              return JSON.parse(stored) as T
            } catch {
              return stored as T
            }
          }
        }
        if (memRecord.status === 'PROCESSING') {
          const createdAt = new Date(memRecord.createdAt).getTime()
          const elapsedMs = Date.now() - createdAt
          if (elapsedMs < this.ttlMs) {
            throw new Error(
              `IDEMPOTENCY_TRANSACTION_IN_PROGRESS: Transaction with key '${key}' is currently being processed`
            )
          }

          // Safe recovery for abandoned processing records: verify domain entity first
          const existingDoc = await persistentCheck()
          if (existingDoc) {
            try {
              await databases.updateDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, {
                status: 'COMPLETED',
                resourceId: (existingDoc as any)?.$id || (existingDoc as any)?.id || (existingDoc as any)?.sale?.$id || '',
                result: JSON.stringify(existingDoc),
                completedAt: new Date().toISOString(),
              })
            } catch {}
            return existingDoc
          }
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
            const _now = new Date().toISOString()
            const _expires = new Date(Date.now() + 86400000).toISOString() // 24h TTL
            await databases.createDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, {
              // Map to actual Appwrite schema field names
              key,
              businessId,
              requestHash,
              status: 'COMPLETED',
              resourceId: (existingDoc as any)?.$id || (existingDoc as any)?.id || (existingDoc as any)?.sale?.$id || '',
              response: (() => { try { const s = JSON.stringify(existingDoc); return s.length > 9000 ? s.slice(0, 9000) : s } catch { return '' } })(),
              createdAt: _now,
              updatedAt: _now,
              expiresAt: _expires,
            })
          } catch (e: any) {
            if (e?.code === 409 || e?.type === 'document_already_exists') {
              await databases.updateDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, {
                status: 'COMPLETED',
                response: (() => { try { const s = JSON.stringify(existingDoc); return s.length > 9000 ? s.slice(0, 9000) : s } catch { return '' } })(),
                updatedAt: new Date().toISOString(),
              })
            } else if (isCollectionNotFoundError(e)) {
              throw new Error(
                `IDEMPOTENCY_STORE_NOT_PROVISIONED: Idempotency collection '${COLLECTIONS.IDEMPOTENCY_KEYS}' is not provisioned in Appwrite database '${DATABASE_ID}'. Operations fail closed to prevent duplicate financial processing.`
              )
            }
          }

          return existingDoc
        }
      } catch (err: any) {
        if (
          err.message?.includes('IDEMPOTENCY_KEY_REUSE_MISMATCH') ||
          err.message?.includes('IDEMPOTENCY_TRANSACTION_IN_PROGRESS') ||
          err.message?.includes('IDEMPOTENCY_STORE_')
        ) {
          throw err
        }
      }

      // 4. Reserve 'PROCESSING' record atomically in distributed store
      const _procNow = new Date().toISOString()
      const _procExpires = new Date(Date.now() + 86400000).toISOString() // 24h TTL
      const processingRecord = {
        // Map to actual Appwrite schema field names
        key,
        businessId,
        requestHash,
        status: 'PROCESSING',
        resourceId: '',
        createdAt: _procNow,
        updatedAt: _procNow,
        expiresAt: _procExpires,
      }

      try {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, processingRecord)
      } catch (e: any) {
        if (isCollectionNotFoundError(e)) {
          throw new Error(
            `IDEMPOTENCY_STORE_NOT_PROVISIONED: Idempotency collection '${COLLECTIONS.IDEMPOTENCY_KEYS}' is not provisioned in Appwrite database '${DATABASE_ID}'. Operations fail closed to prevent duplicate financial processing.`
          )
        }
        if (e?.code === 409 || e?.type === 'document_already_exists') {
          // Document already exists, someone else created it concurrently
          try {
            const existing = await databases.getDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey)
            if (existing.requestHash && existing.requestHash !== requestHash) {
              throw new Error(
                `IDEMPOTENCY_KEY_REUSE_MISMATCH: Idempotency key '${key}' was already used for a different payload in ${operationType}`
              )
            }
            // 'response' is the actual schema field; fallback to 'result' for backward compat
            const _stored = existing.response ?? existing.result
            if (existing.status === 'COMPLETED' && _stored) {
              return JSON.parse(_stored) as T
            }
          } catch (fetchErr: any) {
            if (fetchErr.message?.includes('IDEMPOTENCY_KEY_REUSE_MISMATCH')) throw fetchErr
          }
          throw new Error(`IDEMPOTENCY_TRANSACTION_IN_PROGRESS: Transaction with key '${key}' is currently being processed`)
        }
        throw e
      }

      // 5. Execute operation
      let result: T
      try {
        result = await operation()
      } catch (err: any) {
        try {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, {
            status: 'FAILED',
            error: (err?.message || 'Operation failed').slice(0, 1999),
            updatedAt: new Date().toISOString(),
          })
        } catch (failUpdateErr) {
          console.error(`[IdempotencyManager] Failed to record FAILED status for key ${key}:`, failUpdateErr)
        }
        throw err
      }

      // 6. Finalize COMPLETED status with retries so successful writes are never silently lost
      let finalizeRetries = 3
      while (finalizeRetries > 0) {
        try {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.IDEMPOTENCY_KEYS, compositeKey, {
            status: 'COMPLETED',
            resourceId: (result as any)?.$id || (result as any)?.id || (result as any)?.sale?.$id || '',
            response: (() => { try { const s = JSON.stringify(result); return s.length > 9000 ? s.slice(0, 9000) : s } catch { return '' } })(),
            updatedAt: new Date().toISOString(),
          })
          break
        } catch (finalErr: any) {
          finalizeRetries--
          if (finalizeRetries === 0) {
            console.error(
              `[CRITICAL_IDEMPOTENCY_FINALIZATION_FAILURE] Transaction with key '${key}' succeeded but idempotency store finalization failed:`,
              finalErr
            )
            // Do NOT throw an error that masks the successful financial transaction.
            // Returning result ensures caller does not duplicate the transaction.
          } else {
            await new Promise((r) => setTimeout(r, 50))
          }
        }
      }

      return result
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



