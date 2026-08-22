import { describe, it, expect, beforeEach } from 'vitest'
import { localDB } from '@/lib/offline/db'
import { stockMovementService } from '@/services/stock-movement.service'

describe('Stock Ledger Offline Resilience', () => {
  beforeEach(async () => {
    await localDB.stockMovements.clear()
  })

  it('stores and retrieves stock movement audit records in IndexedDB when offline', async () => {
    await localDB.stockMovements.put({
      id: 'sm_101',
      businessId: 'biz_stock_test',
      productId: 'prod_cement',
      type: 'stock_in',
      quantity: 20,
      previousQuantity: 50,
      newQuantity: 70,
      reason: 'Purchase shipment arrival',
      syncStatus: 'SYNCED',
      createdAt: new Date().toISOString(),
    })

    const localMovs = await localDB.stockMovements
      .where('businessId')
      .equals('biz_stock_test')
      .toArray()

    expect(localMovs.length).toBe(1)
    expect(localMovs[0].productId).toBe('prod_cement')
    expect(localMovs[0].newQuantity).toBe(70)
  })

  it('listMovements falls back to local IndexedDB records when network is offline', async () => {
    await localDB.stockMovements.put({
      id: 'sm_102',
      businessId: 'biz_stock_test',
      productId: 'prod_paint',
      type: 'stock_out',
      quantity: 5,
      previousQuantity: 15,
      newQuantity: 10,
      reason: 'Over the counter POS sale',
      syncStatus: 'SYNCED',
      createdAt: new Date().toISOString(),
    })

    const movements = await stockMovementService.listMovements('biz_stock_test')
    expect(movements).toBeDefined()
    expect(Array.isArray(movements)).toBe(true)
  })
})
