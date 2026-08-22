import { describe, it, expect, beforeEach } from 'vitest'
import { localDB } from '@/lib/offline/db'

describe('PWA Offline Mode & Dexie IndexedDB Sync Engine', () => {
  beforeEach(async () => {
    await localDB.clearBusinessData('business_test_offline')
  })

  it('stores and retrieves offline local products scoped to businessId', async () => {
    await localDB.products.put({
      id: 'prod_off_1',
      businessId: 'business_test_offline',
      name: 'Cement Bag 50kg',
      quantity: 50,
      price: 850,
      syncStatus: 'PENDING_SYNC',
    })

    const retrieved = await localDB.products.get('prod_off_1')
    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe('Cement Bag 50kg')
    expect(retrieved?.quantity).toBe(50)
    expect(retrieved?.syncStatus).toBe('PENDING_SYNC')
  })

  it('queues offline sales in syncQueue and tracks retry counts', async () => {
    await localDB.syncQueue.add({
      businessId: 'business_test_offline',
      userId: 'user_cashier',
      entityType: 'sale',
      entityId: 'LOCAL-SALE-999',
      operation: 'CREATE',
      payload: { items: [], paidAmount: 500, paymentMethod: 'cash' },
      retryCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    })

    const pending = await localDB.syncQueue.where('businessId').equals('business_test_offline').toArray()
    expect(pending.length).toBe(1)
    expect(pending[0].entityId).toBe('LOCAL-SALE-999')
    expect(pending[0].status).toBe('PENDING')
  })

  it('isolates local business data when clearing business state', async () => {
    await localDB.products.put({
      id: 'prod_A',
      businessId: 'business_A',
      name: 'Item A',
      quantity: 10,
      price: 100,
      syncStatus: 'SYNCED',
    })
    await localDB.products.put({
      id: 'prod_B',
      businessId: 'business_B',
      name: 'Item B',
      quantity: 20,
      price: 200,
      syncStatus: 'SYNCED',
    })

    await localDB.clearBusinessData('business_A')

    const prodA = await localDB.products.get('prod_A')
    const prodB = await localDB.products.get('prod_B')

    expect(prodA).toBeUndefined()
    expect(prodB).toBeDefined()
  })
})
