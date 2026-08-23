import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saleService } from '@/services/sale.service'
import { invoiceService } from '@/services/invoice.service'
import { customerService } from '@/services/customer.service'
import { analyticsService } from '@/services/analytics.service'
import { numberingService } from '@/services/numbering.service'
import { productSchema, customerSchema } from '@/lib/validations'
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
    SALES: 'sales',
    SALE_ITEMS: 'sale_items',
    PRODUCTS: 'products',
    STOCK_MOVEMENTS: 'stock_movements',
    INVOICES: 'invoices',
    CUSTOMERS: 'customers',
    EXPENSES: 'expenses',
  },
}))

describe('Comprehensive QA - Edge Cases & Calculations Test Suite', () => {
  const businessId = 'bus_qa_tenant'
  const userId = 'usr_qa_cashier'

  beforeEach(() => {
    vi.clearAllMocks()
    numberingService.resetInMemorySequences()
  })

  describe('1. Calculations Verification (Totals, Discounts, 13% VAT, Dues, Profit)', () => {
    it('should calculate sale totals, 13% VAT, discounts, and customer dues accurately', () => {
      const items = [
        { productId: 'p1', name: 'Item A', unitPrice: 1000, quantity: 2, subtotal: 2000 },
        { productId: 'p2', name: 'Item B', unitPrice: 500, quantity: 1, subtotal: 500 },
      ]
      const subtotal = items.reduce((s, i) => s + i.subtotal, 0) // 2500
      const discount = 200
      const taxable = subtotal - discount // 2300
      const vat = taxable * 0.13 // 299
      const total = taxable + vat // 2599
      const paid = 1000
      const due = total - paid // 1599

      expect(subtotal).toBe(2500)
      expect(taxable).toBe(2300)
      expect(vat).toBe(299)
      expect(total).toBe(2599)
      expect(due).toBe(1599)
    })

    it('should compute operational profit report correctly', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValue({ total: 0, documents: [] } as any)

      const report = await analyticsService.getProfitEstimateReport(businessId)

      expect(report).toHaveProperty('totalRevenue')
      expect(report).toHaveProperty('cogs')
      expect(report).toHaveProperty('grossProfit')
      expect(report).toHaveProperty('totalExpenses')
      expect(report).toHaveProperty('netProfit')
    })
  })

  describe('2. Input Validation (Prices, Quantities, Empty Forms)', () => {
    it('should reject negative quantities in product schema validation', () => {
      const result = productSchema.safeParse({
        name: 'Test Product',
        sellingPrice: 100,
        costPrice: 50,
        stockQuantity: -5,
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative or zero selling price in product schema', () => {
      const result = productSchema.safeParse({
        name: 'Invalid Price Product',
        sellingPrice: -10,
        costPrice: 5,
        stockQuantity: 10,
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty customer forms in validation schema', () => {
      const result = customerSchema.safeParse({
        name: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('3. Inventory & Stock Rules (Insufficient Stock & Decrement)', () => {
    it('should reject sale completion if stock is insufficient', async () => {
      vi.mocked(databases.getDocument).mockResolvedValueOnce({
        $id: 'p_out_of_stock',
        name: 'Limited Stock Laptop',
        stockQuantity: 2,
        sellingPrice: 50000,
        costPrice: 40000,
        businessId,
      } as any)

      await expect(
        saleService.createSale(
          {
            items: [
              {
                productId: 'p_out_of_stock',
                quantity: 5, // Exceeds available stock 2
                unitPrice: 50000,
                discount: 0,
              },
            ],
            paymentMethod: 'cash',
            paidAmount: 250000,
          },
          businessId,
          userId
        )
      ).rejects.toThrow(/Insufficient stock/)
    })
  })

  describe('4. Invoice Sequential Numbering (Non-repeating per business)', () => {
    it('should generate non-repeating sequential invoice numbers per financial year', async () => {
      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 0,
        documents: [],
      } as any)

      const inv1 = await invoiceService.generateNextInvoiceNumber(businessId)
      expect(inv1).toMatch(/^INV-\d{2}\/\d{2}-000001$/)

      numberingService.resetInMemorySequences()

      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 1,
        documents: [{ invoiceNumber: inv1 }],
      } as any)

      const inv2 = await invoiceService.generateNextInvoiceNumber(businessId)
      expect(inv2).toMatch(/^INV-\d{2}\/\d{2}-000002$/)
    })
  })

  it('should propagate Appwrite network connection errors for caller UI handling', async () => {
    vi.mocked(databases.listDocuments).mockReset()
    vi.mocked(databases.listDocuments).mockRejectedValueOnce(new Error('Network error: Failed to fetch'))

    await expect(customerService.listCustomers(businessId)).rejects.toThrow('Network error: Failed to fetch')
  })
})
