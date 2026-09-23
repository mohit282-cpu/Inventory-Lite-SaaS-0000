import { describe, it, expect } from 'vitest'
import { formatMoney } from '@/lib/money'

describe('Supplier Management Logic & Rule Enforcement', () => {
  const mockSuppliers = [
    {
      $id: 'sup-1',
      name: 'Pani Thanda Cold Store',
      phone: '9841000000',
      email: 'panithanda@gmail.com',
      panVatNumber: '300123456',
      address: 'Biratnagar-4',
      totalPurchases: 5000,
      totalPaid: 3000,
      outstandingPayable: 2000,
    },
    {
      $id: 'sup-2',
      name: 'AJX Electronics',
      phone: '9801112233',
      email: 'info@ajx.com',
      panVatNumber: '600987654',
      address: 'Kathmandu-10',
      totalPurchases: 1200,
      totalPaid: 1200,
      outstandingPayable: 0,
    },
    {
      $id: 'sup-3',
      name: 'New Hardware Vendor',
      phone: '',
      email: '',
      panVatNumber: '',
      address: '',
      totalPurchases: 0,
      totalPaid: 0,
      outstandingPayable: 0,
    },
  ]

  describe('Multi-field Search Logic', () => {
    const filterSuppliers = (query: string) => {
      if (!query.trim()) return mockSuppliers
      const q = query.trim().toLowerCase()
      return mockSuppliers.filter((s) => {
        const nameMatch = (s.name || '').toLowerCase().includes(q)
        const phoneMatch = (s.phone || '').toLowerCase().includes(q)
        const emailMatch = (s.email || '').toLowerCase().includes(q)
        const panMatch = (s.panVatNumber || '').toLowerCase().includes(q)
        const addressMatch = (s.address || '').toLowerCase().includes(q)
        return nameMatch || phoneMatch || emailMatch || panMatch || addressMatch
      })
    }

    it('searches suppliers by name', () => {
      const res = filterSuppliers('Pani Thanda')
      expect(res).toHaveLength(1)
      expect(res[0].$id).toBe('sup-1')
    })

    it('searches suppliers by phone number', () => {
      const res = filterSuppliers('9801112233')
      expect(res).toHaveLength(1)
      expect(res[0].$id).toBe('sup-2')
    })

    it('searches suppliers by email address', () => {
      const res = filterSuppliers('panithanda@gmail.com')
      expect(res).toHaveLength(1)
      expect(res[0].$id).toBe('sup-1')
    })

    it('searches suppliers by PAN/VAT number', () => {
      const res = filterSuppliers('600987654')
      expect(res).toHaveLength(1)
      expect(res[0].$id).toBe('sup-2')
    })

    it('returns empty array for non-matching queries', () => {
      const res = filterSuppliers('NonExistentVendor999')
      expect(res).toHaveLength(0)
    })
  })

  describe('Summary Metric Aggregations', () => {
    it('aggregates total purchases, total paid, and total payable correctly', () => {
      const totalPurchases = mockSuppliers.reduce((sum, s) => sum + s.totalPurchases, 0)
      const totalPaid = mockSuppliers.reduce((sum, s) => sum + s.totalPaid, 0)
      const totalPayable = mockSuppliers.reduce((sum, s) => sum + s.outstandingPayable, 0)

      expect(totalPurchases).toBe(6200)
      expect(totalPaid).toBe(4200)
      expect(totalPayable).toBe(2000)
      expect(formatMoney(totalPayable)).toBe('2,000.00')
    })
  })

  describe('Pay Button & Deletion Safety Rules', () => {
    it('determines Pay button disabled state based on outstanding payable balance', () => {
      const isPayEnabled = (payable: number) => payable > 0

      expect(isPayEnabled(mockSuppliers[0].outstandingPayable)).toBe(true) // 2000 > 0
      expect(isPayEnabled(mockSuppliers[1].outstandingPayable)).toBe(false) // 0
      expect(isPayEnabled(mockSuppliers[2].outstandingPayable)).toBe(false) // 0
    })

    it('prohibits deleting suppliers with active transaction history', () => {
      const isDeletionAllowed = (s: typeof mockSuppliers[0]) => {
        const hasHistory =
          (s.totalPurchases || 0) > 0 ||
          (s.totalPaid || 0) > 0 ||
          (s.outstandingPayable || 0) > 0
        return !hasHistory
      }

      expect(isDeletionAllowed(mockSuppliers[0])).toBe(false) // Has purchases & payable
      expect(isDeletionAllowed(mockSuppliers[1])).toBe(false) // Has purchases & paid history
      expect(isDeletionAllowed(mockSuppliers[2])).toBe(true)  // Clean supplier with 0 history
    })
  })
})
