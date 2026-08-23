import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saleService } from '@/services/sale.service'
import { invoiceService } from '@/services/invoice.service'
import { numberingService } from '@/services/numbering.service'
import { getFiscalYearCode } from '@/lib/localization'
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
  },
}))

describe('Financial Year Sequential Numbering (Starts from 1 every FY)', () => {
  const businessId = 'biz_fy_test'

  beforeEach(() => {
    vi.clearAllMocks()
    numberingService.resetInMemorySequences()
  })

  it('calculates correct Nepalese Fiscal Year code for given dates', () => {
    // August 2026 -> BS 2083 -> FY 83/84
    expect(getFiscalYearCode('2026-08-22')).toBe('83/84')
    // May 2024 -> BS 2080 -> FY 80/81
    expect(getFiscalYearCode('2024-05-10')).toBe('80/81')
    // July 20, 2025 -> BS 2082 -> FY 82/83
    expect(getFiscalYearCode('2025-07-20')).toBe('82/83')
  })

  it('generates sequential Sale # starting from 1 for the financial year', async () => {
    vi.mocked(databases.listDocuments).mockResolvedValueOnce({
      total: 0,
      documents: [],
    } as any)

    const saleNum1 = await saleService.generateNextSaleNumber(businessId, '2026-08-22')
    expect(saleNum1).toBe('SALE-83/84-000001')

    numberingService.resetInMemorySequences()

    vi.mocked(databases.listDocuments).mockResolvedValueOnce({
      total: 2,
      documents: [
        { $id: 's2', saleNumber: 'SALE-83/84-000002', businessId },
        { $id: 's1', saleNumber: 'SALE-83/84-000001', businessId },
      ],
    } as any)

    const saleNum3 = await saleService.generateNextSaleNumber(businessId, '2026-08-22')
    expect(saleNum3).toBe('SALE-83/84-000003')
  })

  it('resets Sale # sequence to 1 when a new Financial Year starts', async () => {
    // FY 83/84 has 50 sales, but for new FY 84/85 (Aug 2027), no sales exist yet in 84/85
    vi.mocked(databases.listDocuments).mockResolvedValueOnce({
      total: 50,
      documents: [
        { $id: 's50', saleNumber: 'SALE-83/84-000050', businessId },
      ],
    } as any)

    const newFySaleNum = await saleService.generateNextSaleNumber(businessId, '2027-08-22')
    expect(newFySaleNum).toBe('SALE-84/85-000001') // RESETS TO 1!
  })

  it('generates sequential Invoice # starting from 1 for the financial year', async () => {
    vi.mocked(databases.listDocuments).mockResolvedValueOnce({
      total: 0,
      documents: [],
    } as any)

    const invNum1 = await invoiceService.generateNextInvoiceNumber(businessId, '2026-08-22')
    expect(invNum1).toBe('INV-83/84-000001')
  })

  it('resets Invoice # sequence to 1 when a new Financial Year starts', async () => {
    vi.mocked(databases.listDocuments).mockResolvedValueOnce({
      total: 100,
      documents: [
        { $id: 'inv100', invoiceNumber: 'INV-83/84-000100', businessId },
      ],
    } as any)

    const newFyInvNum = await invoiceService.generateNextInvoiceNumber(businessId, '2027-08-22')
    expect(newFyInvNum).toBe('INV-84/85-000001') // RESETS TO 1!
  })
})
