import { describe, it, expect } from 'vitest'

describe('POS Billing Terminal Logic', () => {
  describe('Cart Item Stock Limit Validation', () => {
    const mockProduct = {
      $id: 'prod-1',
      name: 'Ganga Jal',
      sku: 'SKU-001',
      barcode: '890123456789',
      sellingPrice: 100,
      stockQuantity: 5,
      unit: 'pcs',
    }

    it('prevents adding quantity beyond available stock', () => {
      let cartQuantity = 1
      const stockQuantity = mockProduct.stockQuantity

      const incrementQuantity = (requestedQty: number) => {
        if (requestedQty > stockQuantity) {
          return { success: false, qty: cartQuantity, error: `Only ${stockQuantity} pcs available` }
        }
        cartQuantity = requestedQty
        return { success: true, qty: cartQuantity }
      }

      expect(incrementQuantity(2).success).toBe(true)
      expect(incrementQuantity(5).success).toBe(true)
      const overflow = incrementQuantity(6)
      expect(overflow.success).toBe(false)
      expect(overflow.qty).toBe(5)
      expect(overflow.error).toBe('Only 5 pcs available')
    })
  })

  describe('Barcode & SKU Scanning Logic', () => {
    const catalog = [
      { $id: 'p1', name: 'Wai Wai Noodles', sku: 'SKU-WW01', barcode: '8901001001' },
      { $id: 'p2', name: 'Real Juice 1L', sku: 'SKU-RJ02', barcode: '8902002002' },
    ]

    const findByCode = (input: string) => {
      const code = input.trim().toLowerCase()
      return catalog.find(
        (p) => p.sku.toLowerCase() === code || (p.barcode && p.barcode.toLowerCase() === code)
      )
    }

    it('matches product by exact barcode or SKU', () => {
      expect(findByCode('8901001001')?.$id).toBe('p1')
      expect(findByCode('SKU-RJ02')?.$id).toBe('p2')
      expect(findByCode('   8901001001  ')?.$id).toBe('p1')
    })

    it('returns undefined for non-existent barcode/SKU', () => {
      expect(findByCode('9999999999')).toBeUndefined()
    })
  })

  describe('Financial Totals & VAT Calculations', () => {
    it('calculates Subtotal, Discount, Taxable Amount, VAT, and Grand Total correctly with VAT ON', () => {
      const items = [
        { quantity: 2, unitPrice: 100, discount: 0 }, // 200
        { quantity: 1, unitPrice: 300, discount: 20 }, // 280
      ]

      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) // 500
      const lineDiscounts = items.reduce((sum, i) => sum + i.discount, 0) // 20
      const subAfterLineDisc = subtotal - lineDiscounts // 480

      // Overall Discount 10%
      const discountVal = 10
      const overallDiscount = (subAfterLineDisc * discountVal) / 100 // 48

      const taxableSubtotal = subAfterLineDisc - overallDiscount // 432
      const isVatEnabled = true
      const taxRate = 13
      const vatAmount = isVatEnabled ? (taxableSubtotal * taxRate) / 100 : 0 // 56.16
      const grandTotal = taxableSubtotal + vatAmount // 488.16

      expect(subtotal).toBe(500)
      expect(subAfterLineDisc).toBe(480)
      expect(overallDiscount).toBe(48)
      expect(taxableSubtotal).toBe(432)
      expect(vatAmount).toBeCloseTo(56.16, 2)
      expect(grandTotal).toBeCloseTo(488.16, 2)
    })

    it('calculates totals correctly when VAT is OFF', () => {
      const subtotal = 1000
      const discount = 100
      const taxableSubtotal = subtotal - discount // 900
      const isVatEnabled = false
      const vatAmount = isVatEnabled ? (taxableSubtotal * 13) / 100 : 0 // 0
      const grandTotal = taxableSubtotal + vatAmount // 900

      expect(vatAmount).toBe(0)
      expect(grandTotal).toBe(900)
    })
  })

  describe('Payment Mode & Udhaar Validation Rules', () => {
    it('requires registered customer for Partial Udhaar and Full Udhaar', () => {
      const validateSaleSubmission = (mode: string, customerId: string) => {
        const isUdhaar = mode === 'partial_udhaar' || mode === 'full_udhaar'
        if (isUdhaar && (!customerId || customerId === 'guest')) {
          return { valid: false, error: 'Customer Required for Udhaar' }
        }
        return { valid: true }
      }

      expect(validateSaleSubmission('full_payment', 'guest').valid).toBe(true)
      expect(validateSaleSubmission('full_payment', 'cust-123').valid).toBe(true)

      expect(validateSaleSubmission('partial_udhaar', 'guest').valid).toBe(false)
      expect(validateSaleSubmission('partial_udhaar', 'cust-123').valid).toBe(true)

      expect(validateSaleSubmission('full_udhaar', 'guest').valid).toBe(false)
      expect(validateSaleSubmission('full_udhaar', 'cust-123').valid).toBe(true)
    })
  })
})
