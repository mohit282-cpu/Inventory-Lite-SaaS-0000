import { describe, it, expect, beforeEach, vi } from 'vitest'
import { paymentService } from '@/services/payment.service'
import { saleService } from '@/services/sale.service'
import { localDB } from '@/lib/offline/db'
import { databases } from '@/config/appwrite'

vi.mock('@/config/appwrite', () => ({
  databases: {
    createDocument: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
  DATABASE_ID: 'inventory_lite_db',
  COLLECTIONS: {
    INVOICES: 'invoices',
    SALES: 'sales',
    SALE_ITEMS: 'sale_items',
    PRODUCTS: 'products',
    CUSTOMERS: 'customers',
    BUSINESSES: 'businesses',
    PAYMENTS: 'payments',
  },
}))

describe('Payment Service - Collection Missing & Offline Fallback', () => {
  const businessId = 'biz_pay_test'
  const userId = 'user_pay_test'

  beforeEach(async () => {
    vi.clearAllMocks()
    await localDB.payments.clear()
    await localDB.syncQueue.clear()
  })

  it('records payment in local Dexie DB when Appwrite payments collection is missing (404)', async () => {
    // Mock getSale
    vi.spyOn(saleService, 'getSale').mockResolvedValueOnce({
      $id: 'sale_101',
      businessId,
      saleNumber: 'SALE-83/84-000001',
      customerId: 'cust_101',
      subtotal: 1000,
      discount: 0,
      tax: 0,
      total: 1000,
      paidAmount: 200,
      dueAmount: 800,
      paymentMethod: 'cash',
      status: 'pending',
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      $createdAt: new Date().toISOString(),
      $updatedAt: new Date().toISOString(),
      $databaseId: '',
      $collectionId: '',
      $permissions: [],
    })

    vi.mocked(databases.listDocuments).mockResolvedValue({
      total: 1,
      documents: [
        {
          $id: 'bm_1',
          userId,
          businessId,
          role: 'owner',
          status: 'active',
        },
      ],
    } as any)
    vi.mocked(databases.getDocument).mockResolvedValue({
      $id: 'cust_101',
      businessId,
      name: 'Ramesh Sharma',
      totalDue: 800,
    } as any)

    // Mock createDocument to fail with Collection missing 404 error
    vi.mocked(databases.createDocument).mockRejectedValueOnce(
      new Error("Collection with the requested ID 'payments' could not be found.")
    )

    const payment = await paymentService.createPayment(
      {
        saleId: 'sale_101',
        amount: 300,
        paymentMethod: 'cash',
        notes: 'Partial payment by cash',
      },
      businessId,
      userId
    )

    expect(payment).toBeDefined()
    expect(payment.amount).toBe(300)
    expect(payment.saleId).toBe('sale_101')

    // Verify it was saved to local Dexie DB and queued
    const localPayments = await localDB.payments.where('businessId').equals(businessId).toArray()
    expect(localPayments.length).toBe(1)
    expect(localPayments[0].amount).toBe(300)
  })
})
