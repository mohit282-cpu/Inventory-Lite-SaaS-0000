import { describe, it, expect, vi, beforeEach } from 'vitest'
import { customerService } from '@/services/customer.service'
import { paymentService } from '@/services/payment.service'
import { analyticsService } from '@/services/analytics.service'
import { saleService } from '@/services/sale.service'

vi.mock('@/config/appwrite', () => ({
  databases: {
    listDocuments: vi.fn().mockResolvedValue({ documents: [] }),
    getDocument: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
  account: {
    get: vi.fn(),
  },
  DATABASE_ID: 'test_db',
  COLLECTIONS: {
    CUSTOMERS: 'customers',
    PAYMENTS: 'payments',
    SALES: 'sales',
    SALE_ITEMS: 'sale_items',
    PRODUCTS: 'products',
    EXPENSES: 'expenses',
    BUSINESSES: 'businesses',
    BUSINESS_MEMBERS: 'business_members',
    CATEGORIES: 'categories',
    STOCK_MOVEMENTS: 'stock_movements',
    INVOICES: 'invoices',
    FINANCIAL_SEQUENCES: 'financial_sequences',
    USER_PROFILES: 'users',
    USERS: 'users',
  },
}))

describe('QA Audit Regression Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TEST 1: Customer summary calculates totalPurchases correctly using sale.total', async () => {
    vi.spyOn(customerService, 'getCustomer').mockResolvedValue({
      $id: 'cust_123',
      businessId: 'biz_a',
      name: 'Test Customer',
      totalDue: 100,
    } as any)

    vi.spyOn(saleService, 'listSales').mockResolvedValue([
      { $id: 'sale_1', total: 500, paidAmount: 400, dueAmount: 100 },
      { $id: 'sale_2', total: 250, paidAmount: 250, dueAmount: 0 },
    ] as any)

    const summary = await customerService.getCustomerSummary('cust_123', 'biz_a')

    expect(summary.totalPurchases).toBe(750)
    expect(summary.totalPaid).toBe(650)
    expect(summary.totalDue).toBe(100)
  })

  it('TEST 2: PaymentService.getPayments delegates to listPayments for offline fallback support', async () => {
    const listSpy = vi.spyOn(paymentService, 'listPayments').mockResolvedValue([
      { $id: 'pay_1', amount: 100, businessId: 'biz_a' },
    ] as any)

    const payments = await paymentService.getPayments('biz_a')

    expect(listSpy).toHaveBeenCalledWith('biz_a')
    expect(payments.length).toBe(1)
  })

  it('TEST 3: AnalyticsService handles all Nepalese and digital wallet payment methods', async () => {
    vi.spyOn(saleService, 'listSales').mockResolvedValue([
      { $id: 's1', total: 100, paymentMethod: 'eSewa' },
      { $id: 's2', total: 200, paymentMethod: 'Khalti' },
      { $id: 's3', total: 300, paymentMethod: 'digital_wallet' },
      { $id: 's4', total: 400, paymentMethod: 'credit' },
    ] as any)

    const distribution = await analyticsService.getSalesByPaymentMethod('biz_a')

    expect(distribution.find((d) => d.method === 'eSewa')?.total).toBe(100)
    expect(distribution.find((d) => d.method === 'Khalti')?.total).toBe(200)
    expect(distribution.find((d) => d.method === 'digital_wallet')?.total).toBe(300)
    expect(distribution.find((d) => d.method === 'credit')?.total).toBe(400)
  })
})
