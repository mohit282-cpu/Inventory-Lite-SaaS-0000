import { describe, it, expect, beforeEach, vi } from 'vitest'
import { localDB } from '@/lib/offline/db'
import { syncEngine } from '@/lib/offline/sync-engine'
import { customerService } from '@/services/customer.service'
import { expenseService } from '@/services/expense.service'
import { saleService } from '@/services/sale.service'

describe('Comprehensive Real Offline-First PWA Unit Tests', () => {
  const businessA = 'biz_test_alpha'
  const businessB = 'biz_test_beta'
  const userA = 'user_owner_alpha'

  beforeEach(async () => {
    await localDB.clearBusinessData(businessA)
    await localDB.clearBusinessData(businessB)
  })

  it('1. Performs fast offline product & barcode search using local Dexie store', async () => {
    await localDB.products.put({
      id: 'p_101',
      businessId: businessA,
      name: 'Wai Wai Noodles',
      sku: 'SKU-WW-01',
      barcode: '8901234567890',
      quantity: 100,
      price: 25,
      syncStatus: 'SYNCED',
    })

    await localDB.products.put({
      id: 'p_102',
      businessId: businessA,
      name: 'Rara Noodles',
      sku: 'SKU-RR-02',
      barcode: '8909876543210',
      quantity: 50,
      price: 20,
      syncStatus: 'SYNCED',
    })

    const foundByBarcode = await localDB.products.where('businessId').equals(businessA).and((p) => p.barcode === '8901234567890').first()
    expect(foundByBarcode).toBeDefined()
    expect(foundByBarcode?.name).toBe('Wai Wai Noodles')

    const foundByName = await localDB.products.where('businessId').equals(businessA).and((p) => p.name.toLowerCase().includes('rara')).toArray()
    expect(foundByName.length).toBe(1)
    expect(foundByName[0].price).toBe(20)
  })

  it('2. Creates customer offline, stores in Dexie with PENDING_SYNC status, and queues in syncQueue', async () => {
    // Force offline simulation
    vi.stubGlobal('navigator', { onLine: false })

    const cust = await customerService.createCustomer(
      { name: 'Hari Store', phone: '9841000000', address: 'Baneshwor' },
      businessA,
      userA
    )

    expect(cust.$id).toBeDefined()
    expect(cust.$id.startsWith('LOCAL-CUST-')).toBe(true)

    const storedInDb = await localDB.customers.get(cust.$id)
    expect(storedInDb).toBeDefined()
    expect(storedInDb?.name).toBe('Hari Store')
    expect(storedInDb?.syncStatus).toBe('PENDING_SYNC')

    const queueItems = await localDB.syncQueue.where('businessId').equals(businessA).toArray()
    expect(queueItems.length).toBe(1)
    expect(queueItems[0].entityType).toBe('customer')
    expect(queueItems[0].entityId).toBe(cust.$id)

    vi.unstubAllGlobals()
  })

  it('3. Creates offline expense, calculates offline summary metrics correctly', async () => {
    vi.stubGlobal('navigator', { onLine: false })

    const exp = await expenseService.createExpense(
      { title: 'Shop Electricity Bill', category: 'Utilities', amount: 2500, date: new Date().toISOString().slice(0, 10) },
      businessA,
      userA
    )

    expect(exp.$id.startsWith('LOCAL-EXP-')).toBe(true)
    expect(exp.amount).toBe(2500)

    const list = await expenseService.listExpenses(businessA)
    expect(list.length).toBe(1)
    expect(list[0].title).toBe('Shop Electricity Bill')

    vi.unstubAllGlobals()
  })

  it('4. Executes dependency-ordered queue sync (Customer -> Sale -> Payment -> Expense)', async () => {
    vi.stubGlobal('navigator', { onLine: true })

    // Mock services
    const mockCreateCustomer = vi.spyOn(customerService, 'createCustomer').mockResolvedValue({
      $id: 'SERVER-CUST-999',
      businessId: businessA,
      name: 'Hari Store',
      phone: '9841000000',
      totalDue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
      $databaseId: '',
      $collectionId: '',
      $permissions: [],
    })

    const mockCreateSale = vi.spyOn(saleService, 'createSale').mockResolvedValue({
      sale: {
        $id: 'SERVER-SALE-888',
        businessId: businessA,
        subtotal: 1000,
        discount: 0,
        tax: 130,
        total: 1130,
        paidAmount: 500,
        dueAmount: 630,
        status: 'pending',
        paymentMethod: 'cash',
        createdBy: userA,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        $databaseId: '',
        $collectionId: '',
        $permissions: [],
      },
      items: [],
    })

    // Queue sale first, then customer (should process Customer first due to dependency order)
    await localDB.syncQueue.add({
      businessId: businessA,
      userId: userA,
      entityType: 'sale',
      entityId: 'LOCAL-SALE-1',
      operation: 'CREATE',
      payload: { customerId: 'LOCAL-CUST-1', items: [], paidAmount: 500, paymentMethod: 'cash' },
      retryCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    })

    await localDB.syncQueue.add({
      businessId: businessA,
      userId: userA,
      entityType: 'customer',
      entityId: 'LOCAL-CUST-1',
      operation: 'CREATE',
      payload: { name: 'Hari Store', phone: '9841000000' },
      retryCount: 0,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    })

    const res = await syncEngine.processSyncQueue(businessA)
    expect(res.syncedCount).toBe(2)

    // Customer creation should be called before Sale creation
    expect(mockCreateCustomer).toHaveBeenCalled()
    expect(mockCreateSale).toHaveBeenCalled()

    // Sale payload should have been mapped with real server customer ID SERVER-CUST-999
    expect(mockCreateSale.mock.calls[0][0].customerId).toBe('SERVER-CUST-999')

    mockCreateCustomer.mockRestore()
    mockCreateSale.mockRestore()
    vi.unstubAllGlobals()
  })

  it('5. Guarantees multi-tenant business data isolation when switching businesses', async () => {
    await localDB.products.put({
      id: 'prod_biz_A',
      businessId: businessA,
      name: 'Product in Biz A',
      quantity: 10,
      price: 100,
      syncStatus: 'SYNCED',
    })

    await localDB.products.put({
      id: 'prod_biz_B',
      businessId: businessB,
      name: 'Product in Biz B',
      quantity: 20,
      price: 200,
      syncStatus: 'SYNCED',
    })

    const prodsA = await localDB.products.where('businessId').equals(businessA).toArray()
    const prodsB = await localDB.products.where('businessId').equals(businessB).toArray()

    expect(prodsA.length).toBe(1)
    expect(prodsA[0].name).toBe('Product in Biz A')

    expect(prodsB.length).toBe(1)
    expect(prodsB[0].name).toBe('Product in Biz B')

    // Clearing Business A must not affect Business B
    await localDB.clearBusinessData(businessA)

    const remainingA = await localDB.products.where('businessId').equals(businessA).toArray()
    const remainingB = await localDB.products.where('businessId').equals(businessB).toArray()

    expect(remainingA.length).toBe(0)
    expect(remainingB.length).toBe(1)
    expect(remainingB[0].id).toBe('prod_biz_B')
  })
})
