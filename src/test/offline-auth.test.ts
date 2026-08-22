import { describe, it, expect, beforeEach } from 'vitest'
import { localDB } from '@/lib/offline/db'
import { offlineAuthService } from '@/lib/offline/offline-auth.service'

describe('Production-Ready Offline Authentication & Session System', () => {
  beforeEach(async () => {
    await localDB.authRecords.clear()
    await localDB.clearBusinessData('biz_tenant_1')
    await localDB.clearBusinessData('biz_tenant_2')
  })

  it('TEST 1: Online first-time login records Web Crypto password hash and offline authorization', async () => {
    const user = { $id: 'usr_owner_1' }
    const profile = { name: 'Ram Hardware Owner', email: 'owner@ramhardware.com' }
    const business = { $id: 'biz_ram_1', name: 'Ram Hardware Store' }
    const memberships = [{ businessId: 'biz_ram_1', role: 'owner' }]

    await offlineAuthService.recordOnlineLogin(
      'owner@ramhardware.com',
      'SecurePass123!',
      user,
      profile,
      business,
      memberships
    )

    const record = await localDB.authRecords.get('owner@ramhardware.com')
    expect(record).toBeDefined()
    expect(record?.userId).toBe('usr_owner_1')
    expect(record?.email).toBe('owner@ramhardware.com')
    expect(record?.passwordHash).not.toBe('SecurePass123!') // Never store plaintext!
    expect(record?.passwordHash.length).toBe(64) // SHA-256 hex string length
    expect(record?.salt).toBeDefined()
    expect(record?.activeBusinessId).toBe('biz_ram_1')
  })

  it('TEST 2: Offline login succeeds for previously authorized device with correct credentials', async () => {
    const user = { $id: 'usr_owner_1' }
    const profile = { name: 'Ram Hardware Owner', email: 'owner@ramhardware.com' }
    const business = { $id: 'biz_ram_1', name: 'Ram Hardware Store' }
    const memberships = [{ businessId: 'biz_ram_1', role: 'owner' }]

    await offlineAuthService.recordOnlineLogin(
      'owner@ramhardware.com',
      'SecurePass123!',
      user,
      profile,
      business,
      memberships
    )

    const verifyRes = await offlineAuthService.verifyOfflineCredentials('owner@ramhardware.com', 'SecurePass123!')
    expect(verifyRes.success).toBe(true)
    expect(verifyRes.record?.userId).toBe('usr_owner_1')
    expect(verifyRes.record?.activeBusiness.$id).toBe('biz_ram_1')
  })

  it('TEST 3: Offline login fails with clear first-time login message on new/unauthorized account', async () => {
    const verifyRes = await offlineAuthService.verifyOfflineCredentials('newuser@newshop.com', 'Pass123!')
    expect(verifyRes.success).toBe(false)
    expect(verifyRes.code).toBe('OFFLINE_NOT_AUTHORIZED')
    expect(verifyRes.error).toContain('First-time login requires an internet connection')
  })

  it('TEST 4: Offline login rejects incorrect password with invalid credentials error', async () => {
    await offlineAuthService.recordOnlineLogin(
      'owner@ramhardware.com',
      'CorrectPassword123!',
      { $id: 'usr_owner_1' },
      { name: 'Owner' },
      { $id: 'biz_ram_1' },
      []
    )

    const verifyRes = await offlineAuthService.verifyOfflineCredentials('owner@ramhardware.com', 'WrongPassword!')
    expect(verifyRes.success).toBe(false)
    expect(verifyRes.code).toBe('INVALID_CREDENTIALS')
    expect(verifyRes.error).toBe('Invalid email or password.')
  })

  it('TEST 5: Explicit logout removes offline authorization record', async () => {
    await offlineAuthService.recordOnlineLogin(
      'owner@ramhardware.com',
      'Pass123!',
      { $id: 'usr_owner_1' },
      { name: 'Owner' },
      { $id: 'biz_ram_1' },
      []
    )

    let record = await offlineAuthService.getAuthorizedOfflineRecord('owner@ramhardware.com')
    expect(record).toBeDefined()

    await offlineAuthService.clearOfflineRecord('usr_owner_1')

    record = await offlineAuthService.getAuthorizedOfflineRecord('owner@ramhardware.com')
    expect(record).toBeNull()
  })

  it('TEST 6: Multi-Tenant offline authorization maintains strict businessId isolation', async () => {
    await offlineAuthService.recordOnlineLogin(
      'tenant1@biz.com',
      'Pass1!',
      { $id: 'usr_1' },
      { name: 'User 1' },
      { $id: 'biz_tenant_1' },
      [{ businessId: 'biz_tenant_1', role: 'owner' }]
    )

    await offlineAuthService.recordOnlineLogin(
      'tenant2@biz.com',
      'Pass2!',
      { $id: 'usr_2' },
      { name: 'User 2' },
      { $id: 'biz_tenant_2' },
      [{ businessId: 'biz_tenant_2', role: 'owner' }]
    )

    const record1 = await offlineAuthService.getAuthorizedOfflineRecord('tenant1@biz.com')
    const record2 = await offlineAuthService.getAuthorizedOfflineRecord('tenant2@biz.com')

    expect(record1?.activeBusinessId).toBe('biz_tenant_1')
    expect(record2?.activeBusinessId).toBe('biz_tenant_2')
  })
})
