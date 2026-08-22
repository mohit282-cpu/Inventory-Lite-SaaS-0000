import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Appwrite for Distributed Offline Sync Tests
vi.mock('@/config/appwrite', () => {
  const store = new Map<string, any>()

  return {
    DATABASE_ID: 'inventory_lite_db',
    COLLECTIONS: {
      USERS: 'users',
      BUSINESSES: 'businesses',
      BUSINESS_MEMBERS: 'business_members',
      CATEGORIES: 'categories',
      PRODUCTS: 'products',
      STOCK_MOVEMENTS: 'stock_movements',
      CUSTOMERS: 'customers',
      SALES: 'sales',
      SALE_ITEMS: 'sale_items',
      INVOICES: 'invoices',
      PAYMENTS: 'payments',
    },
    account: {
      get: vi.fn(async () => ({ $id: 'user_owner_A' })),
    },
    databases: {
      createDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = {
          $id: id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          $collectionId: colId,
          $databaseId: _dbId,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          ...data,
        }
        store.set(`${colId}:${doc.$id}`, doc)
        return doc
      }),
      getDocument: vi.fn(async (_dbId, colId, id) => {
        const doc = store.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        return { ...doc }
      }),
      updateDocument: vi.fn(async (_dbId, colId, id, data) => {
        const doc = store.get(`${colId}:${id}`)
        if (!doc) throw new Error(`Document ${id} not found`)
        const updated = { ...doc, ...data, $updatedAt: new Date().toISOString() }
        store.set(`${colId}:${id}`, updated)
        return { ...updated }
      }),
      deleteDocument: vi.fn(async (_dbId, colId, id) => {
        store.delete(`${colId}:${id}`)
        return {}
      }),
      listDocuments: vi.fn(async (_dbId, colId, queries = []) => {
        let filtered = Array.from(store.values()).filter((d) => d.$collectionId === colId)
        for (const q of queries) {
          const qStr = typeof q === 'string' ? q : JSON.stringify(q)
          if (qStr.includes('equal')) {
            const fieldMatch =
              qStr.match(/equal\("([^"]+)"/) ||
              qStr.match(/"attribute":"([^"]+)"/) ||
              qStr.match(/attribute: '([^']+)'/)
            const valueMatch =
              qStr.match(/\["([^"]+)"\]/) ||
              qStr.match(/"values":\s*\["([^"]+)"\]/) ||
              qStr.match(/values: \['([^']+)'\]/)
            if (fieldMatch && valueMatch) {
              const field = fieldMatch[1]
              const val = valueMatch[1]
              filtered = filtered.filter((doc) => doc[field] === val)
            }
          }
        }
        return { documents: filtered, total: filtered.length }
      }),
    },
  }
})

import { localDB } from '@/lib/offline/db'
import { syncEngine } from '@/lib/offline/sync-engine'
import { productService } from '@/services/product.service'
import { saleService } from '@/services/sale.service'

describe('Distributed Offline Transaction & Sync Engine Hardening Tests', () => {
  const bizId = 'biz_offline_test'
  const userId = 'user_owner_A'

  beforeEach(async () => {
    vi.restoreAllMocks()
    await localDB.syncQueue.clear()
    await localDB.sales.clear()
    await localDB.products.clear()
  })

  it('Device A offline sale vs Device B online sale: Reconnecting Device A detects CONFLICT without driving stock negative', async () => {
    // Initial server product stock = 10
    const serverProduct = await productService.createProduct(
      {
        name: 'Shared Multi-Device Product',
        unit: 'pcs',
        purchasePrice: 100,
        sellingPrice: 150,
        stockQuantity: 10,
      },
      bizId,
      userId
    )

    // Device A goes offline and queues a sale of 7 items
    const localSaleId = `sale_devA_${Date.now()}`
    await localDB.syncQueue.add({
      businessId: bizId,
      userId,
      entityType: 'sale',
      entityId: localSaleId,
      localTransactionId: localSaleId,
      idempotencyKey: `idemp_${localSaleId}`,
      operation: 'CREATE',
      payload: {
        items: [{ productId: serverProduct.$id, quantity: 7 }],
        paidAmount: 1050,
        paymentMethod: 'cash',
      },
      retryCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    })

    // Device B remains online and sells 7 items directly to server
    await saleService.createSale(
      {
        items: [{ productId: serverProduct.$id, quantity: 7 }],
        paidAmount: 1050,
        paymentMethod: 'cash',
      },
      bizId,
      userId
    )

    // Verify server stock is now 3 (10 - 7)
    const serverProdAfterB = await productService.getProduct(serverProduct.$id, bizId)
    expect(serverProdAfterB.stockQuantity).toBe(3)

    // Device A reconnects and processes its sync queue
    vi.spyOn(syncEngine, 'isOnline').mockReturnValue(true)
    const result = await syncEngine.processSyncQueue(bizId)

    // Device A's sync item must fail due to conflict (3 available < 7 requested)
    expect(result.failedCount).toBe(1)

    const queueItems = await localDB.syncQueue.where('businessId').equals(bizId).toArray()
    expect(queueItems[0].status).toBe('CONFLICT')
    expect(queueItems[0].errorMessage).toContain('Insufficient stock')

    // Verify final server stock is STILL 3 and NOT negative (-4)
    const finalServerProd = await productService.getProduct(serverProduct.$id, bizId)
    expect(finalServerProd.stockQuantity).toBe(3)
  })

  it('Duplicate sync replay returns existing server record without double-deducting stock', async () => {
    const product = await productService.createProduct(
      {
        name: 'Idempotent Sync Product',
        unit: 'pcs',
        purchasePrice: 10,
        sellingPrice: 20,
        stockQuantity: 50,
      },
      bizId,
      userId
    )

    const dupKey = `dup_sync_${Date.now()}`
    await localDB.syncQueue.add({
      businessId: bizId,
      userId,
      entityType: 'sale',
      entityId: dupKey,
      localTransactionId: dupKey,
      idempotencyKey: dupKey,
      operation: 'CREATE',
      payload: {
        items: [{ productId: product.$id, quantity: 5 }],
        paidAmount: 100,
        paymentMethod: 'cash',
      },
      retryCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    })

    vi.spyOn(syncEngine, 'isOnline').mockReturnValue(true)

    // First sync run
    await syncEngine.processSyncQueue(bizId)

    // Reset status back to PENDING to simulate duplicate sync replay
    const item = (await localDB.syncQueue.toArray())[0]
    await localDB.syncQueue.update(item.id!, { status: 'PENDING' })

    // Second sync run
    await syncEngine.processSyncQueue(bizId)

    // Stock deducted ONCE (50 - 5 = 45), NOT TWICE (40)
    const updatedProd = await productService.getProduct(product.$id, bizId)
    expect(updatedProd.stockQuantity).toBe(45)
  })

  it('Browser restart during pending/processing sync resets stuck items back to PENDING and syncs cleanly', async () => {
    await localDB.syncQueue.add({
      businessId: bizId,
      userId,
      entityType: 'customer',
      entityId: `cust_stuck_${Date.now()}`,
      operation: 'CREATE',
      payload: { name: 'Interrupted Customer', phone: '9800000000' },
      retryCount: 0,
      status: 'PROCESSING', // Simulates item interrupted mid-sync by browser refresh
      createdAt: new Date().toISOString(),
    })

    vi.spyOn(syncEngine, 'isOnline').mockReturnValue(true)
    const result = await syncEngine.processSyncQueue(bizId)

    expect(result.syncedCount).toBe(1)
    const items = await localDB.syncQueue.toArray()
    expect(items[0].status).toBe('SYNCED')
  })

  it('Network failure halfway through sync stops gracefully and resumes remaining queue on reconnect', async () => {
    await localDB.syncQueue.add({
      businessId: bizId,
      userId,
      entityType: 'customer',
      entityId: `cust_net1_${Date.now()}`,
      operation: 'CREATE',
      payload: { name: 'Customer Net 1', phone: '9811111111' },
      retryCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    })

    await localDB.syncQueue.add({
      businessId: bizId,
      userId,
      entityType: 'customer',
      entityId: `cust_net2_${Date.now()}`,
      operation: 'CREATE',
      payload: { name: 'Customer Net 2', phone: '9822222222' },
      retryCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    })

    // Simulate network online for 1st item, then offline for 2nd
    let callCount = 0
    vi.spyOn(syncEngine, 'isOnline').mockImplementation(() => {
      callCount++
      return callCount <= 2
    })

    await syncEngine.processSyncQueue(bizId)

    // First item synced, second remained pending due to network drop
    const queue = await localDB.syncQueue.toArray()
    const synced = queue.filter((i) => i.status === 'SYNCED')
    const pending = queue.filter((i) => i.status === 'PENDING' || i.status === 'PROCESSING')

    expect(synced.length).toBe(1)
    expect(pending.length).toBe(1)
  })
})
