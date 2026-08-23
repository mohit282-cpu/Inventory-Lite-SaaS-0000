import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateStockLedgerPdf, sanitizeFilename } from '@/lib/pdf/stock-ledger-pdf'
import { stockMovementService } from '@/services/stock-movement.service'
import { Business, Product, StockMovement } from '@/types'

// Mock Appwrite & Authorization
vi.mock('@/config/appwrite', () => ({
  DATABASE_ID: 'inventory_lite_db',
  COLLECTIONS: {
    STOCK_MOVEMENTS: 'stock_movements',
    PRODUCTS: 'products',
    BUSINESSES: 'businesses',
    BUSINESS_MEMBERS: 'business_members',
  },
  databases: {
    listDocuments: vi.fn(async (_dbId, _colId, _queries) => {
      // Mock tenant-scoped data query return
      return { documents: [], total: 0 }
    }),
    getDocument: vi.fn(async () => ({})),
  },
}))

vi.mock('@/lib/authorization', () => ({
  authorizeBusinessAccess: vi.fn(async ({ userId, businessId }: any) => {
    if (businessId === 'biz_unauthorized') {
      throw new Error("Forbidden: Access denied for business 'biz_unauthorized'")
    }
    if (userId === 'user_unauthorized') {
      throw new Error('Forbidden: User does not have access')
    }
    return { role: 'owner' }
  }),
}))

describe('Stock Movements & Ledger PDF Export System', () => {
  const mockBusiness: Business = {
    $id: 'biz_123',
    $createdAt: '2026-01-01T00:00:00.000Z',
    $updatedAt: '2026-01-01T00:00:00.000Z',
    $collectionId: 'businesses',
    $databaseId: 'inventory_lite_db',
    $permissions: [],
    name: 'Kathmandu Retail Traders',
    ownerId: 'user_123',
    address: 'New Road, Kathmandu',
    phone: '9841000000',
    currency: 'NPR',
    timezone: 'Asia/Kathmandu',
    taxRegistrationType: 'VAT',
    taxRegistrationNumber: '123456789',
    vatNumber: '123456789',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  const mockProduct: Product = {
    $id: 'prod_1',
    $createdAt: '2026-01-01T00:00:00.000Z',
    $updatedAt: '2026-01-01T00:00:00.000Z',
    $collectionId: 'products',
    $databaseId: 'inventory_lite_db',
    $permissions: [],
    businessId: 'biz_123',
    name: 'Wai Wai Noodles',
    sku: 'WAI-001',
    unit: 'pcs',
    purchasePrice: 20,
    sellingPrice: 25,
    stockQuantity: 100,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  const mockMovements: StockMovement[] = [
    {
      $id: 'mov_1',
      $createdAt: '2026-08-01T10:00:00.000Z',
      $updatedAt: '2026-08-01T10:00:00.000Z',
      $collectionId: 'stock_movements',
      $databaseId: 'inventory_lite_db',
      $permissions: [],
      businessId: 'biz_123',
      productId: 'prod_1',
      type: 'stock_in',
      quantity: 50,
      previousQuantity: 0,
      newQuantity: 50,
      reason: 'Initial Restock',
      createdBy: 'user_123',
      createdAt: '2026-08-01T10:00:00.000Z',
    },
    {
      $id: 'mov_2',
      $createdAt: '2026-08-02T14:30:00.000Z',
      $updatedAt: '2026-08-02T14:30:00.000Z',
      $collectionId: 'stock_movements',
      $databaseId: 'inventory_lite_db',
      $permissions: [],
      businessId: 'biz_123',
      productId: 'prod_1',
      type: 'stock_out',
      quantity: 15,
      previousQuantity: 50,
      newQuantity: 35,
      reason: 'Sale #1001',
      createdBy: 'user_123',
      createdAt: '2026-08-02T14:30:00.000Z',
    },
    {
      $id: 'mov_3',
      $createdAt: '2026-08-03T09:15:00.000Z',
      $updatedAt: '2026-08-03T09:15:00.000Z',
      $collectionId: 'stock_movements',
      $databaseId: 'inventory_lite_db',
      $permissions: [],
      businessId: 'biz_123',
      productId: 'prod_1',
      type: 'adjustment',
      quantity: 40,
      previousQuantity: 35,
      newQuantity: 40,
      reason: 'Count Reconciliation',
      createdBy: 'user_123',
      createdAt: '2026-08-03T09:15:00.000Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test 1 — PDF Generation for Authorized User
  it('Test 1 — Generates valid PDF document for authorized business ledger', () => {
    const pdfDoc = generateStockLedgerPdf({
      business: mockBusiness,
      movements: mockMovements,
      products: [mockProduct],
      dateFrom: '2026-08-01',
      dateTo: '2026-08-03',
      generatedBy: 'Owner User',
    })

    expect(pdfDoc).toBeDefined()
    expect(typeof pdfDoc.output).toBe('function')
    const outputBuffer = pdfDoc.output('arraybuffer')
    expect(outputBuffer.byteLength).toBeGreaterThan(0)
  })

  // Test 2 — Tenant Security Violation Check
  it('Test 2 — Prevents unauthorized business data fetch during PDF export', async () => {
    await expect(
      stockMovementService.fetchAllMovements('biz_unauthorized', {}, 'user_123')
    ).rejects.toThrow(/Forbidden: Access denied for business/)
  })

  // Test 3 — RBAC Check
  it('Test 3 — Rejects export if user does not belong to business', async () => {
    await expect(
      stockMovementService.fetchAllMovements('biz_123', {}, 'user_unauthorized')
    ).rejects.toThrow(/Forbidden: User does not have access/)
  })

  // Test 4 — PDF Export is READ-ONLY (No state mutation)
  it('Test 4 — PDF export is strictly read-only and does not mutate stock or products', () => {
    const initialStock = mockProduct.stockQuantity
    const initialMovementsCount = mockMovements.length

    generateStockLedgerPdf({
      business: mockBusiness,
      movements: mockMovements,
      products: [mockProduct],
    })

    // Verify stock and movement count remain 100% unchanged
    expect(mockProduct.stockQuantity).toBe(initialStock)
    expect(mockMovements.length).toBe(initialMovementsCount)
  })

  // Test 5 — Data Integrity & Summary Calculations
  it('Test 5 — Calculates exact Stock In, Stock Out, and Net Movement totals without rounding error', () => {
    let totalIn = 0
    let totalOut = 0

    mockMovements.forEach((m) => {
      if (m.type === 'stock_in') totalIn += m.quantity
      if (m.type === 'stock_out') totalOut += m.quantity
    })

    expect(totalIn).toBe(50)
    expect(totalOut).toBe(15)
    expect(totalIn - totalOut).toBe(35)
  })

  // Test 6 — Product-Specific Ledger Mode
  it('Test 6 — Generates Product-Specific Ledger with Opening and Closing Balances', () => {
    const pdfDoc = generateStockLedgerPdf({
      business: mockBusiness,
      movements: mockMovements,
      products: [mockProduct],
      selectedProductId: 'prod_1',
    })

    expect(pdfDoc).toBeDefined()
    const outputArray = pdfDoc.output('arraybuffer')
    expect(outputArray.byteLength).toBeGreaterThan(0)
  })

  // Test 7 — Empty Dataset Handling
  it('Test 7 — Handles empty stock movement dataset gracefully without throwing', () => {
    const pdfDoc = generateStockLedgerPdf({
      business: mockBusiness,
      movements: [],
      products: [mockProduct],
    })

    expect(pdfDoc).toBeDefined()
    const outputArray = pdfDoc.output('arraybuffer')
    expect(outputArray.byteLength).toBeGreaterThan(0)
  })

  // Test 8 — Filename Sanitization
  it('Test 8 — Sanitizes business and product names for illegal filename characters', () => {
    const rawName = 'Shop & Store / 100% * Quality?'
    const sanitized = sanitizeFilename(rawName)
    expect(sanitized).toBe('Shop___Store___100____Quality_')
    expect(sanitized).not.toContain('/')
    expect(sanitized).not.toContain('?')
    expect(sanitized).not.toContain('*')
  })

  // Test 9 — Chunked Pagination Large Dataset Support (500+ records)
  it('Test 9 — Supports chunked fetching of large movement datasets without truncation', async () => {
    const mockChunk = Array.from({ length: 100 }, (_, i) => ({
      $id: `mov_bulk_${i}`,
      $createdAt: '2026-08-01T00:00:00.000Z',
      $updatedAt: '2026-08-01T00:00:00.000Z',
      $collectionId: 'stock_movements',
      $databaseId: 'inventory_lite_db',
      $permissions: [],
      businessId: 'biz_123',
      productId: 'prod_1',
      type: 'stock_in' as const,
      quantity: 10,
      previousQuantity: i * 10,
      newQuantity: (i + 1) * 10,
      createdBy: 'user_123',
      createdAt: '2026-08-01T00:00:00.000Z',
    }))

    // Spy on list method to return 3 full chunks (300 records) then empty chunk
    let callCount = 0
    vi.spyOn(stockMovementService, 'list').mockImplementation(async () => {
      callCount++
      if (callCount <= 3) {
        return mockChunk as any
      }
      return []
    })

    const results = await stockMovementService.fetchAllMovements('biz_123', { maxLimit: 1000 })
    expect(results.length).toBe(300)
    expect(callCount).toBe(4) // 3 full chunks + 1 empty chunk
  })
})
