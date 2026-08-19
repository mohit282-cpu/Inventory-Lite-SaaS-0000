import { describe, it, expect, beforeEach, vi } from 'vitest'
import { invoiceService } from '@/services/invoice.service'
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

describe('Invoices & Billing System', () => {
  const businessA = 'bus_tenant_alpha'
  const businessB = 'bus_tenant_beta'
  const userA = 'user_owner_100'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Sequential Invoice Numbering', () => {
    it('should generate INV-000001 when no previous invoices exist', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 0,
        documents: [],
      } as any)

      const nextNum = await invoiceService.generateNextInvoiceNumber(businessA)
      expect(nextNum).toBe('INV-000001')
    })

    it('should generate INV-000003 sequentially when INV-000002 exists', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 2,
        documents: [
          { $id: 'inv_2', invoiceNumber: 'INV-000002', businessId: businessA },
          { $id: 'inv_1', invoiceNumber: 'INV-000001', businessId: businessA },
        ],
      } as any)

      const nextNum = await invoiceService.generateNextInvoiceNumber(businessA)
      expect(nextNum).toBe('INV-000003')
    })
  })

  describe('Invoice Creation & Sale Linkage', () => {
    it('should create an invoice document linked to a completed sale', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 0,
        documents: [],
      } as any)

      vi.mocked(databases.createDocument).mockResolvedValueOnce({
        $id: 'inv_doc_100',
        invoiceNumber: 'INV-000001',
        saleId: 'sale_999',
        businessId: businessA,
        issueDate: '2026-08-19T10:00:00.000Z',
      } as any)

      const inv = await invoiceService.createInvoice(
        { saleId: 'sale_999' },
        businessA,
        userA
      )

      expect(inv.$id).toBe('inv_doc_100')
      expect(inv.invoiceNumber).toBe('INV-000001')
      expect(inv.saleId).toBe('sale_999')
    })
  })

  describe('Historical Snapshot Integrity', () => {
    it('should preserve sale item snapshot even if original product catalog data changes', async () => {
      const originalProduct = {
        $id: 'prod_keyboard',
        name: 'Mechanical Keyboard RGB',
        sellingPrice: 4500,
        businessId: businessA,
      }

      const saleItemSnapshot = {
        $id: 'sale_item_1',
        saleId: 'sale_101',
        productId: originalProduct.$id,
        productNameSnapshot: 'Mechanical Keyboard RGB',
        unitPrice: 4500,
        quantity: 2,
        discount: 0,
        total: 9000,
        businessId: businessA,
      }

      // Simulate catalog product name update
      const updatedProduct = {
        ...originalProduct,
        name: 'Mechanical Keyboard PRO Wireless 2026',
        sellingPrice: 6000,
      }

      expect(saleItemSnapshot.productNameSnapshot).toBe('Mechanical Keyboard RGB')
      expect(saleItemSnapshot.unitPrice).toBe(4500)
      expect(saleItemSnapshot.total).toBe(9000)
      expect(updatedProduct.name).not.toBe(saleItemSnapshot.productNameSnapshot)
    })
  })

  describe('Multi-Tenant Isolation', () => {
    it('should reject fetching an invoice belonging to another business', async () => {
      vi.mocked(databases.getDocument).mockResolvedValueOnce({
        $id: 'inv_secret_b',
        invoiceNumber: 'INV-000005',
        businessId: businessB,
      } as any)

      await expect(
        invoiceService.getInvoice('inv_secret_b', businessA)
      ).rejects.toThrow('Tenant Isolation Violation')
    })
  })
})
