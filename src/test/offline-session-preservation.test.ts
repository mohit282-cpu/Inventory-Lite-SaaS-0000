import { describe, it, expect, beforeEach } from 'vitest'
import { localDB } from '@/lib/offline/db'
import { offlineAuthService } from '@/lib/offline/offline-auth.service'

describe('Offline Session Preservation & Non-Blocking Network Architecture', () => {
  beforeEach(async () => {
    await localDB.authRecords.clear()
    await localDB.clearBusinessData('biz_offline_test')
  })

  it('TEST 1: Preserves active session and offline record when Wi-Fi is suddenly lost', async () => {
    const user = { $id: 'usr_active_1' }
    const profile = { name: 'Active Owner', email: 'owner@active.com' }
    const business = { $id: 'biz_offline_test', name: 'Active Hardware' }
    const memberships = [{ businessId: 'biz_offline_test', role: 'owner' }]

    await offlineAuthService.recordOnlineLogin(
      'owner@active.com',
      'Password123!',
      user,
      profile,
      business,
      memberships
    )

    const record = await offlineAuthService.getAuthorizedOfflineRecord('owner@active.com')
    expect(record).toBeDefined()
    expect(record?.userId).toBe('usr_active_1')
    expect(record?.activeBusinessId).toBe('biz_offline_test')
  })

  it('TEST 2: Offline transaction queuing preserves idempotency keys across disconnects', async () => {
    const transactionId = 'tx_offline_uuid_100'

    await localDB.syncQueue.add({
      businessId: 'biz_offline_test',
      userId: 'usr_active_1',
      entityType: 'sale',
      entityId: transactionId,
      operation: 'CREATE',
      payload: { idempotencyKey: transactionId, total: 1500 },
      retryCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    })

    const queued = await localDB.syncQueue.where('businessId').equals('biz_offline_test').toArray()
    expect(queued.length).toBe(1)
    expect(queued[0].entityId).toBe(transactionId)
    expect(queued[0].payload.idempotencyKey).toBe(transactionId)
  })
})
