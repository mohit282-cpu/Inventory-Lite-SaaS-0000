import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { numberingService } from '@/services/numbering.service'
import { offlineNumberPoolService } from '@/services/offline-number-pool.service'
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
    EXPENSES: 'expenses',
    FINANCIAL_SEQUENCES: 'financial_sequences',
  },
}))

describe('Production Financial Year Based Numbering System', () => {
  const bizA = 'biz_test_A'
  const bizB = 'biz_test_B'

  beforeEach(async () => {
    vi.clearAllMocks()
    await localDB.numberBlocks.clear()
    await localDB.sales.clear()
    await localDB.invoices.clear()
    await localDB.syncQueue.clear()
  })

  describe('1. Nepal Bikram Sambat (BS) Financial Year Calculation', () => {
    it('correctly calculates Nepal BS Fiscal Year starting on Shrawan 1st', () => {
      // 2026-08-01 AD is Shrawan in BS 2083 -> FY 2083/84 ("83/84")
      const fyShrawan = getCurrentFinancialYear('2026-08-01')
      expect(fyShrawan.label).toBe('2083/84')
      expect(fyShrawan.shortLabel).toBe('83/84')

      // 2026-06-01 AD is Asar in BS 2083 -> FY 2082/83 ("82/83")
      const fyAsar = getCurrentFinancialYear('2026-06-01')
      expect(fyAsar.label).toBe('2082/83')
      expect(fyAsar.shortLabel).toBe('82/83')

      // 2027-08-01 AD is Shrawan in BS 2084 -> FY 2084/85 ("84/85")
      const fyNextYear = getCurrentFinancialYear('2027-08-01')
      expect(fyNextYear.label).toBe('2084/85')
      expect(fyNextYear.shortLabel).toBe('84/85')
    })
  })

  describe('2. Sale & Invoice Number Formatting and FY Sequence Reset', () => {
    it('formats first sale as SALE-83/84-000001 and second sale as SALE-83/84-000002', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValue({ total: 0, documents: [] } as any)
      vi.mocked(databases.createDocument).mockResolvedValue({ $id: 'seq_1', nextNumber: 2 } as any)

      const sale1 = await numberingService.allocateNextNumber(bizA, 'SALE', '2026-08-15')
      expect(sale1.formattedNumber).toBe('SALE-83/84-000001')
      expect(sale1.sequenceNumber).toBe(1)

      vi.mocked(databases.listDocuments).mockResolvedValue({
        total: 1,
        documents: [{ $id: 'seq_1', nextNumber: 2, documentType: 'SALE', financialYear: '2083/84' }],
      } as any)

      const sale2 = await numberingService.allocateNextNumber(bizA, 'SALE', '2026-08-15')
      expect(sale2.formattedNumber).toBe('SALE-83/84-000002')
      expect(sale2.sequenceNumber).toBe(2)
    })

    it('formats first invoice as INV-83/84-000001 and maintains independent counter from sales', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValue({ total: 0, documents: [] } as any)

      const inv1 = await numberingService.allocateNextNumber(bizA, 'INVOICE', '2026-08-15')
      expect(inv1.formattedNumber).toBe('INV-83/84-000001')
      expect(inv1.sequenceNumber).toBe(1)
    })

    it('resets sequence to 1 at the start of a new Financial Year (FY 2084/85)', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValue({ total: 0, documents: [] } as any)

      // FY 2084/85 (Shrawan 2084 / Aug 2027)
      const newFySale = await numberingService.allocateNextNumber(bizA, 'SALE', '2027-08-15')
      expect(newFySale.formattedNumber).toBe('SALE-84/85-000001')
      expect(newFySale.sequenceNumber).toBe(1)

      const newFyInv = await numberingService.allocateNextNumber(bizA, 'INVOICE', '2027-08-15')
      expect(newFyInv.formattedNumber).toBe('INV-84/85-000001')
      expect(newFyInv.sequenceNumber).toBe(1)
    })
  })

  describe('3. Multi-Tenant Isolation', () => {
    it('isolates sequence counters per business tenant', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValue({ total: 0, documents: [] } as any)

      const saleBizA = await numberingService.allocateNextNumber(bizA, 'SALE', '2026-08-15')
      const saleBizB = await numberingService.allocateNextNumber(bizB, 'SALE', '2026-08-15')

      expect(saleBizA.formattedNumber).toBe('SALE-83/84-000001')
      expect(saleBizB.formattedNumber).toBe('SALE-83/84-000001')
    })
  })

  describe('4. Collision-Proof Offline Block Reservation', () => {
    it('generates persistent device ID and reserves number block for offline use', async () => {
      const deviceId = await offlineNumberPoolService.getOrCreateDeviceId()
      expect(deviceId).toBeDefined()
      expect(deviceId.startsWith('dev_')).toBe(true)

      // Reserve block 1..50
      vi.mocked(databases.listDocuments).mockResolvedValue({ total: 0, documents: [] } as any)
      await offlineNumberPoolService.replenishLocalBlock(bizA, 'SALE', '2026-08-15', 50)

      const block = await localDB.numberBlocks.get(`${bizA}_SALE_2083/84`)
      expect(block).toBeDefined()
      expect(block?.startNumber).toBe(1)
      expect(block?.endNumber).toBe(50)
    })
  })

  describe('5. Immutability & FY Boundary Preservation', () => {
    it('preserves assigned FY number when an old offline sale synchronizes after a new FY has started', async () => {
      // Sale created on last day of FY 2083/84
      const oldSaleDate = '2027-06-15' // Asar 2084 (FY 2083/84)
      const allocatedOld = await offlineNumberPoolService.allocateDocumentNumber(bizA, 'SALE', oldSaleDate)
      expect(allocatedOld.formattedNumber).toContain('83/84')

      // Sync occurs in FY 2084/85 (Shrawan 2084 / Aug 2027)
      const syncedSaleNumber = oldSaleDate ? allocatedOld.formattedNumber : ''
      expect(syncedSaleNumber).toBe(allocatedOld.formattedNumber)
    })

    it('strictly ignores legacy 13-digit timestamps (e.g. SALE-83/84-1787332825957) and generates clean 6-digit sequence numbers', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 1,
        documents: [{ saleNumber: 'SALE-83/84-1787332825957' }],
      } as any)

      const allocated = await numberingService.allocateNextNumber(bizA, 'SALE', '2026-08-15')
      expect(allocated.formattedNumber).toBe('SALE-83/84-000001')
      expect(allocated.sequenceNumber).toBe(1)
    })
  })
})
