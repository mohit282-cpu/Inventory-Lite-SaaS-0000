import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/config/appwrite', () => ({
  DATABASE_ID: 'test_db',
  COLLECTIONS: {
    IDEMPOTENCY_KEYS: 'idempotency_keys',
  },
  databases: {
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
  },
}))

import { IdempotencyManager, computePayloadHash, isDocumentNotFoundError, isCollectionNotFoundError } from '@/lib/idempotency'
import { databases } from '@/config/appwrite'

describe('Idempotency Hardening & Failure Path Unit Tests', () => {
  let manager: IdempotencyManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new IdempotencyManager(60000)
  })

  it('correctly classifies Appwrite 404 document errors vs collection errors', () => {
    expect(isDocumentNotFoundError({ code: 404, type: 'document_not_found', message: 'Document not found' })).toBe(true)
    expect(isDocumentNotFoundError({ code: 404, message: 'Document with ID x could not be found' })).toBe(true)
    expect(isDocumentNotFoundError({ code: 404, message: 'Collection with ID x could not be found' })).toBe(false)
    expect(isDocumentNotFoundError({ code: 500, message: 'Internal Server Error' })).toBe(false)
    expect(isDocumentNotFoundError(null)).toBe(false)

    expect(isCollectionNotFoundError({ code: 404, type: 'collection_not_found', message: 'Collection not found' })).toBe(true)
    expect(isCollectionNotFoundError({ code: 404, message: 'Collection with the requested ID could not be found' })).toBe(true)
    expect(isCollectionNotFoundError({ code: 404, message: 'Database not found' })).toBe(true)
    expect(isCollectionNotFoundError({ code: 404, message: 'Document not found' })).toBe(false)
  })

  it('fails closed when idempotency collection is not provisioned', async () => {
    vi.mocked(databases.getDocument).mockRejectedValueOnce({
      code: 404,
      type: 'collection_not_found',
      message: 'Collection could not be found',
    })

    const op = vi.fn().mockResolvedValue({ saleId: '123' })
    const persistentCheck = vi.fn().mockResolvedValue(null)

    await expect(
      manager.executeIdempotentTransaction(
        {
          idempotencyKey: 'key_coll_missing',
          businessId: 'biz_1',
          operationType: 'create_sale',
        },
        persistentCheck,
        op
      )
    ).rejects.toThrow('IDEMPOTENCY_STORE_NOT_PROVISIONED')

    // Operation must NEVER execute when idempotency store is missing
    expect(op).not.toHaveBeenCalled()
  })

  it('fails closed when authoritative database read encounters network error or 500', async () => {
    vi.mocked(databases.getDocument).mockRejectedValueOnce({
      code: 500,
      message: 'Network connection reset by peer',
    })

    const op = vi.fn().mockResolvedValue({ saleId: '123' })
    const persistentCheck = vi.fn().mockResolvedValue(null)

    await expect(
      manager.executeIdempotentTransaction(
        {
          idempotencyKey: 'key_net_err',
          businessId: 'biz_1',
          operationType: 'create_sale',
        },
        persistentCheck,
        op
      )
    ).rejects.toThrow('IDEMPOTENCY_STORE_UNAVAILABLE')

    // Operation must NOT run blindly on database read failure
    expect(op).not.toHaveBeenCalled()
  })

  it('enforces idempotency key presence when enforceKey is true', async () => {
    const op = vi.fn().mockResolvedValue({ saleId: '123' })
    const persistentCheck = vi.fn().mockResolvedValue(null)

    await expect(
      manager.executeIdempotentTransaction(
        {
          idempotencyKey: '',
          businessId: 'biz_1',
          operationType: 'process_payment',
          enforceKey: true,
        },
        persistentCheck,
        op
      )
    ).rejects.toThrow('IDEMPOTENCY_KEY_REQUIRED')

    expect(op).not.toHaveBeenCalled()
  })

  it('rejects reusing the same idempotency key with a different request payload', async () => {
    vi.mocked(databases.getDocument).mockResolvedValueOnce({
      $id: 'idemp_key_reuse',
      status: 'COMPLETED',
      requestHash: computePayloadHash({ amount: 100 }),
      result: JSON.stringify({ saleId: 'sale_original' }),
    } as any)

    const op = vi.fn().mockResolvedValue({ saleId: 'sale_new' })
    const persistentCheck = vi.fn().mockResolvedValue(null)

    await expect(
      manager.executeIdempotentTransaction(
        {
          idempotencyKey: 'key_reuse_test',
          businessId: 'biz_1',
          operationType: 'create_sale',
          payload: { amount: 500 }, // Different payload
        },
        persistentCheck,
        op
      )
    ).rejects.toThrow('IDEMPOTENCY_KEY_REUSE_MISMATCH')

    expect(op).not.toHaveBeenCalled()
  })

  it('recovers safely from abandoned PROCESSING record when domain entity exists', async () => {
    const staleDate = new Date(Date.now() - 300000).toISOString() // 5 minutes ago

    vi.mocked(databases.getDocument).mockResolvedValueOnce({
      $id: 'idemp_key_abandoned',
      status: 'PROCESSING',
      requestHash: computePayloadHash({ amount: 100 }),
      createdAt: staleDate,
    } as any)

    const domainEntity = { $id: 'sale_already_recorded', amount: 100 }
    const persistentCheck = vi.fn().mockResolvedValue(domainEntity)
    const op = vi.fn().mockResolvedValue({ $id: 'sale_duplicate' })

    const result = await manager.executeIdempotentTransaction(
      {
        idempotencyKey: 'key_abandoned',
        businessId: 'biz_1',
        operationType: 'create_sale',
        payload: { amount: 100 },
      },
      persistentCheck,
      op
    )

    // Succeeded by returning existing entity without re-running operation
    expect(result).toEqual(domainEntity)
    expect(op).not.toHaveBeenCalled()
    expect(persistentCheck).toHaveBeenCalled()
    expect(databases.updateDocument).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ status: 'COMPLETED' })
    )
  })

  it('does not mask successful transaction if finalization update throws error', async () => {
    vi.mocked(databases.getDocument).mockRejectedValueOnce({
      code: 404,
      type: 'document_not_found',
      message: 'Document not found',
    })
    vi.mocked(databases.createDocument).mockResolvedValueOnce({} as any)
    // All 3 updateDocument retries fail
    vi.mocked(databases.updateDocument).mockRejectedValue(new Error('Appwrite DB write timeout'))

    const opResult = { $id: 'sale_committed_success', amount: 999 }
    const op = vi.fn().mockResolvedValue(opResult)
    const persistentCheck = vi.fn().mockResolvedValue(null)

    // Should return opResult and NOT throw error to avoid caller duplicating financial transaction
    const result = await manager.executeIdempotentTransaction(
      {
        idempotencyKey: 'key_finalize_fail',
        businessId: 'biz_1',
        operationType: 'create_sale',
      },
      persistentCheck,
      op
    )

    expect(result).toEqual(opResult)
    expect(op).toHaveBeenCalledTimes(1)
  })
})
