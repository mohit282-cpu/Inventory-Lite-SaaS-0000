import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculateSaleTotals, validateFinancialInvariants } from '@/lib/money'

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
  beforeEach(async () => {
    vi.clearAllMocks()
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
})
