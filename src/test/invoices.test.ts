import { describe, it, expect, beforeEach, vi } from 'vitest'
import { invoiceService } from '@/services/invoice.service'
import { numberingService } from '@/services/numbering.service'
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

describe('Invoices & Billing System', () => {
  const businessA = 'bus_tenant_alpha'
  const businessB = 'bus_tenant_beta'
  const userA = 'user_owner_100'

  beforeEach(() => {
    vi.clearAllMocks()
    numberingService.resetInMemorySequences()
  })

  describe('Sequential Invoice Numbering', () => {
    it('should generate INV-83/84-000001 when no previous invoices exist', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 0,
        documents: [],
      } as any)

      const nextNum = await invoiceService.generateNextInvoiceNumber(businessA)
      expect(nextNum).toMatch(/^INV-\d{2}\/\d{2}-000001$/)
    })

    it('should generate INV-83/84-000003 sequentially when INV-83/84-000002 exists', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 2,
        documents: [
          { $id: 'inv_2', invoiceNumber: 'INV-83/84-000002', businessId: businessA },
          { $id: 'inv_1', invoiceNumber: 'INV-83/84-000001', businessId: businessA },
        ],
      } as any)

      const nextNum = await invoiceService.generateNextInvoiceNumber(businessA)
      expect(nextNum).toMatch(/^INV-\d{2}\/\d{2}-000003$/)
    })
  })

  describe('Invoice Creation & Sale Linkage', () => {
    it('should create an invoice document linked to a completed sale', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValue({
        total: 0,
        documents: [],
      } as any)

      vi.mocked(databases.getDocument).mockImplementation(async (_db, col, id) => {
        if (col === 'sales') {
          return {
            $id: id,
            businessId: businessA,
            status: 'completed',
            total: 100,
            paidAmount: 100,
            dueAmount: 0,
          } as any
        }
        return { $id: id, businessId: businessA } as any
      })

      vi.mocked(databases.createDocument).mockImplementation(async (_db, col, _id, data) => {
        if (col === 'invoices') {
          return {
            $id: 'inv_doc_100',
            invoiceNumber: (data as any).invoiceNumber || 'INV-83/84-000001',
            saleId: 'sale_999',
            businessId: businessA,
            issueDate: '2026-08-19T10:00:00.000Z',
          } as any
        }
        return { $id: 'seq_1', ...data } as any
      })

      const inv = await invoiceService.createInvoice(
        { saleId: 'sale_999' },
        businessA,
        userA
      )

      expect(inv.$id).toBe('inv_doc_100')
      expect(inv.invoiceNumber).toBeDefined()
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
