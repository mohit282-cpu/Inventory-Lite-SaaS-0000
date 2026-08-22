import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculateSaleTotals, validateFinancialInvariants } from '@/lib/money'
import { saleService } from '@/services/sale.service'
import { localDB } from '@/lib/offline/db'

vi.mock('@/config/appwrite', () => ({
  client: {},
  DATABASE_ID: 'inventory_db',
  COLLECTIONS: {
    BUSINESSES: 'businesses',
    USERS: 'users',
    BUSINESS_MEMBERS: 'business_members',
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
    CUSTOMERS: 'customers',
    SALES: 'sales',
    SALE_ITEMS: 'sale_items',
    INVOICES: 'invoices',
    PAYMENTS: 'payments',
  },
  databases: {
    createDocument: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
  },
  account: {
    get: vi.fn(),
  },
}))

vi.mock('@/lib/authorization', () => ({
  authorizeBusinessAccess: vi.fn().mockResolvedValue({
    role: 'owner',
    permissions: {
      canManageBusiness: true,
      canManageUsers: true,
      canManageInventory: true,
      canProcessSales: true,
      canViewReports: true,
      canManageSettings: true,
    },
  }),
  hasPermission: vi.fn().mockReturnValue(true),
}))

describe('Mandatory Billing & POS Calculation Regression Tests', () => {
  const businessId = 'biz_billing_test'
  const userId = 'user_cashier_1'

  beforeEach(async () => {
    vi.clearAllMocks()
    await localDB.sales.clear()
    await localDB.saleItems.clear()
    await localDB.customers.clear()
    await localDB.syncQueue.clear()
  })

  // TEST 1: Subtotal 1000, Discount 10%, Paid 900
  it('TEST 1: Subtotal 1000, Discount 10%, Paid 900 -> Due 0, Change 0', () => {
    const res = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000 }],
      discount: 100, // 10% of 1000 = 100
      taxRate: 0,
      paidAmount: 900,
    })

    expect(res.subtotal).toBe(1000)
    expect(res.overallDiscount).toBe(100)
    expect(res.total).toBe(900)
    expect(res.paidAmount).toBe(900)
    expect(res.dueAmount).toBe(0)
    expect(res.changeAmount).toBe(0)
    validateFinancialInvariants(res)
  })

  // TEST 2: Subtotal 1000, Discount 10%, Paid 700
  it('TEST 2: Subtotal 1000, Discount 10%, Paid 700 -> Due 200, Change 0', () => {
    const res = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000 }],
      discount: 100,
      taxRate: 0,
      paidAmount: 700,
    })

    expect(res.subtotal).toBe(1000)
    expect(res.overallDiscount).toBe(100)
    expect(res.total).toBe(900)
    expect(res.paidAmount).toBe(700)
    expect(res.dueAmount).toBe(200)
    expect(res.changeAmount).toBe(0)
    validateFinancialInvariants(res)
  })

  // TEST 3: Subtotal 1000, Discount 10%, Paid 2000
  it('TEST 3: Subtotal 1000, Discount 10%, Paid 2000 -> Due 0, Change 1100', () => {
    const res = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000 }],
      discount: 100,
      taxRate: 0,
      paidAmount: 2000,
    })

    expect(res.subtotal).toBe(1000)
    expect(res.overallDiscount).toBe(100)
    expect(res.total).toBe(900)
    expect(res.paidAmount).toBe(2000)
    expect(res.dueAmount).toBe(0)
    expect(res.changeAmount).toBe(1100)
    validateFinancialInvariants(res)
  })

  // TEST 4: Subtotal 1000, Discount 0%, Paid 1000
  it('TEST 4: Subtotal 1000, Discount 0%, Paid 1000 -> Due 0, Change 0', () => {
    const res = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000 }],
      discount: 0,
      taxRate: 0,
      paidAmount: 1000,
    })

    expect(res.subtotal).toBe(1000)
    expect(res.total).toBe(1000)
    expect(res.paidAmount).toBe(1000)
    expect(res.dueAmount).toBe(0)
    expect(res.changeAmount).toBe(0)
    validateFinancialInvariants(res)
  })

  // TEST 5: Subtotal 1000, Discount 10%, Paid 0
  it('TEST 5: Subtotal 1000, Discount 10%, Paid 0 -> Due 900, Change 0', () => {
    const res = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000 }],
      discount: 100,
      taxRate: 0,
      paidAmount: 0,
    })

    expect(res.subtotal).toBe(1000)
    expect(res.total).toBe(900)
    expect(res.paidAmount).toBe(0)
    expect(res.dueAmount).toBe(900)
    expect(res.changeAmount).toBe(0)
    validateFinancialInvariants(res)
  })

  // TEST 6: Subtotal 5000, Discount 20%, Paid 3000
  it('TEST 6: Subtotal 5000, Discount 20%, Paid 3000 -> Final 4000, Due 1000, Change 0', () => {
    const res = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 1, unitPrice: 5000 }],
      discount: 1000, // 20% of 5000 = 1000
      taxRate: 0,
      paidAmount: 3000,
    })

    expect(res.subtotal).toBe(5000)
    expect(res.total).toBe(4000)
    expect(res.paidAmount).toBe(3000)
    expect(res.dueAmount).toBe(1000)
    expect(res.changeAmount).toBe(0)
    validateFinancialInvariants(res)
  })

  // TEST 7: Subtotal 5000, Discount 20%, Paid 5000
  it('TEST 7: Subtotal 5000, Discount 20%, Paid 5000 -> Final 4000, Due 0, Change 1000', () => {
    const res = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 1, unitPrice: 5000 }],
      discount: 1000,
      taxRate: 0,
      paidAmount: 5000,
    })

    expect(res.subtotal).toBe(5000)
    expect(res.total).toBe(4000)
    expect(res.paidAmount).toBe(5000)
    expect(res.dueAmount).toBe(0)
    expect(res.changeAmount).toBe(1000)
    validateFinancialInvariants(res)
  })

  // TEST 8: Multiple products + percentage discount
  it('TEST 8: Multiple products + percentage discount', () => {
    const items = [
      { productId: 'p1', quantity: 2, unitPrice: 500 }, // 1000
      { productId: 'p2', quantity: 3, unitPrice: 1000 }, // 3000
    ] // Total Subtotal = 4000
    const overallDiscount = (4000 * 15) / 100 // 15% of 4000 = 600

    const res = calculateSaleTotals({
      items,
      discount: overallDiscount,
      taxRate: 0,
      paidAmount: 3400,
    })

    expect(res.subtotal).toBe(4000)
    expect(res.overallDiscount).toBe(600)
    expect(res.total).toBe(3400)
    expect(res.dueAmount).toBe(0)
    expect(res.changeAmount).toBe(0)
    validateFinancialInvariants(res)
  })

  // TEST 9: Multiple products + fixed discount
  it('TEST 9: Multiple products + fixed discount', () => {
    const items = [
      { productId: 'p1', quantity: 1, unitPrice: 1500 },
      { productId: 'p2', quantity: 2, unitPrice: 750 },
    ] // Subtotal = 3000

    const res = calculateSaleTotals({
      items,
      discount: 250, // Fixed Rs. 250 discount
      taxRate: 0,
      paidAmount: 3000,
    })

    expect(res.subtotal).toBe(3000)
    expect(res.overallDiscount).toBe(250)
    expect(res.total).toBe(2750)
    expect(res.paidAmount).toBe(3000)
    expect(res.dueAmount).toBe(0)
    expect(res.changeAmount).toBe(250)
    validateFinancialInvariants(res)
  })

  // TEST 10: Discount + tax + payment
  it('TEST 10: Discount + tax + payment', () => {
    // Subtotal = 1000, Discount = 100 -> Taxable = 900
    // Tax = 13% of 900 = 117 -> Final Payable = 1017
    const res = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000 }],
      discount: 100,
      taxRate: 13,
      paidAmount: 1017,
    })

    expect(res.subtotal).toBe(1000)
    expect(res.taxableAmount).toBe(900)
    expect(res.taxAmount).toBe(117)
    expect(res.total).toBe(1017)
    expect(res.dueAmount).toBe(0)
    expect(res.changeAmount).toBe(0)
    validateFinancialInvariants(res)
  })

  // TEST 11: Offline sale + discount + payment
  it('TEST 11: Offline sale + discount + payment', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })

    const items = [
      { productId: 'p_off_1', productName: 'Hammer', quantity: 2, unitPrice: 500, discount: 0 },
    ] // Subtotal = 1000
    // Discount = 100 -> Final Total = 900, Customer pays 1000 -> Change = 100, Due = 0

    await localDB.products.put({
      id: 'p_off_1',
      businessId,
      name: 'Hammer',
      sku: 'HMR',
      unit: 'pcs',
      purchasePrice: 300,
      price: 500,
      quantity: 100,
      syncStatus: 'SYNCED',
      updatedAt: new Date().toISOString(),
    })

    const result = await saleService.createSale(
      {
        items,
        discount: 100,
        taxRate: 0,
        paidAmount: 1000,
        paymentMethod: 'cash',
      },
      businessId,
      userId
    )

    expect(result.sale.subtotal).toBe(1000)
    expect(result.sale.discount).toBe(100)
    expect(result.sale.total).toBe(900)
    expect(result.sale.paidAmount).toBe(1000)
    expect(result.sale.dueAmount).toBe(0)
    expect(result.sale.changeAmount).toBe(100)

    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
  })

  // TEST 12: Offline sale + discount + Udhaar + later synchronization
  it('TEST 12: Offline sale + discount + Udhaar + later synchronization', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })

    const items = [
      { productId: 'p_off_2', productName: 'Cement', quantity: 1, unitPrice: 1000, discount: 0 },
    ] // Subtotal = 1000, Discount = 100 -> Final Total = 900. Paid = 700 -> Udhaar = 200

    await localDB.products.put({
      id: 'p_off_2',
      businessId,
      name: 'Cement',
      sku: 'CMT',
      unit: 'pcs',
      purchasePrice: 700,
      price: 1000,
      quantity: 100,
      syncStatus: 'SYNCED',
      updatedAt: new Date().toISOString(),
    })

    const result = await saleService.createSale(
      {
        customerId: 'cust_udhaar_12',
        items,
        discount: 100,
        taxRate: 0,
        paidAmount: 700,
        paymentMethod: 'cash',
      },
      businessId,
      userId
    )

    expect(result.sale.total).toBe(900)
    expect(result.sale.paidAmount).toBe(700)
    expect(result.sale.dueAmount).toBe(200)
    expect(result.sale.changeAmount).toBe(0)

    // Verify stored local record in Dexie IndexedDB
    const savedLocal = await localDB.sales.get(result.sale.$id)
    expect(savedLocal).toBeDefined()
    expect(savedLocal?.total).toBe(900)
    expect(savedLocal?.dueAmount).toBe(200)
    expect(savedLocal?.changeAmount).toBe(0)

    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
  })
})
