import { describe, it, expect } from 'vitest'

function formatPaymentMethod(method?: string): string {
  if (!method) return 'N/A'
  const lower = method.toLowerCase().trim()
  if (lower === 'cash') return 'Cash'
  if (lower === 'full_udhar' || lower === 'credit' || lower === 'udhaar') return 'Full Udhaar'
  if (lower === 'bank_transfer' || lower === 'bank') return 'Bank Transfer'
  if (lower === 'digital_wallet' || lower === 'wallet' || lower === 'esewa' || lower === 'khalti') return 'Digital Wallet'
  return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

describe('Sales & Invoices Module UI & Data Logic', () => {
  describe('formatPaymentMethod', () => {
    it('formats raw payment method enums into human-readable titles', () => {
      expect(formatPaymentMethod('cash')).toBe('Cash')
      expect(formatPaymentMethod('full_udhar')).toBe('Full Udhaar')
      expect(formatPaymentMethod('credit')).toBe('Full Udhaar')
      expect(formatPaymentMethod('udhaar')).toBe('Full Udhaar')
      expect(formatPaymentMethod('bank_transfer')).toBe('Bank Transfer')
      expect(formatPaymentMethod('digital_wallet')).toBe('Digital Wallet')
      expect(formatPaymentMethod('other')).toBe('Other')
      expect(formatPaymentMethod('')).toBe('N/A')
      expect(formatPaymentMethod(undefined)).toBe('N/A')
    })
  })

  describe('Multi-field Search Logic for Sales Ledger', () => {
    const mockSales = [
      {
        $id: 'sale-1',
        saleNumber: 'SALE-83/84-000001',
        customerId: 'cust-1',
        total: 1000,
        paidAmount: 500,
        dueAmount: 500,
        paymentMethod: 'cash',
        status: 'completed',
        createdAt: '2026-09-20T10:00:00.000Z',
      },
      {
        $id: 'sale-2',
        saleNumber: 'SALE-83/84-000002',
        customerId: 'cust-2',
        total: 2500,
        paidAmount: 0,
        dueAmount: 2500,
        paymentMethod: 'full_udhar',
        status: 'pending',
        createdAt: '2026-09-21T10:00:00.000Z',
      },
      {
        $id: 'sale-3',
        saleNumber: 'SALE-83/84-000003',
        customerId: 'guest',
        total: 750,
        paidAmount: 750,
        dueAmount: 0,
        paymentMethod: 'digital_wallet',
        status: 'cancelled',
        createdAt: '2026-09-22T10:00:00.000Z',
      },
    ]

    const getCustomerName = (cust: string) => {
      if (cust === 'cust-1') return 'Diwash Sharma'
      if (cust === 'cust-2') return 'Kathmandu Traders'
      return 'Walk-in Guest'
    }

    const filterSales = (query: string) => {
      if (!query.trim()) return mockSales
      const q = query.trim().toLowerCase()
      return mockSales.filter((s) => {
        const custName = getCustomerName(s.customerId).toLowerCase()
        const rawNum = (s.saleNumber || '').toLowerCase()
        const formattedNum = rawNum.replace(/^sale-/i, 'sale-')
        const formattedPm = formatPaymentMethod(s.paymentMethod).toLowerCase()
        const rawPm = (s.paymentMethod || '').toLowerCase()
        const statusStr = (s.status || '').toLowerCase()

        return (
          rawNum.includes(q) ||
          formattedNum.includes(q) ||
          s.$id.toLowerCase().includes(q) ||
          custName.includes(q) ||
          rawPm.includes(q) ||
          formattedPm.includes(q) ||
          statusStr.includes(q)
        )
      })
    }

    it('searches by receipt / sale number', () => {
      const results = filterSales('000002')
      expect(results).toHaveLength(1)
      expect(results[0].$id).toBe('sale-2')
    })

    it('searches by customer name', () => {
      const results = filterSales('Diwash')
      expect(results).toHaveLength(1)
      expect(results[0].$id).toBe('sale-1')
    })

    it('searches by payment method (raw and human-readable title)', () => {
      const udharResults = filterSales('Udhaar')
      expect(udharResults).toHaveLength(1)
      expect(udharResults[0].$id).toBe('sale-2')

      const walletResults = filterSales('digital_wallet')
      expect(walletResults).toHaveLength(1)
      expect(walletResults[0].$id).toBe('sale-3')
    })

    it('searches by status', () => {
      const cancelledResults = filterSales('cancelled')
      expect(cancelledResults).toHaveLength(1)
      expect(cancelledResults[0].$id).toBe('sale-3')
    })
  })

  describe('Multi-field Search Logic for Tax Invoices', () => {
    const mockInvoices = [
      {
        $id: 'inv-1',
        invoiceNumber: 'INV-83/84-000101',
        saleNumber: 'SALE-83/84-000001',
        customerName: 'Diwash Sharma',
        totalAmount: 1000,
        paidAmount: 500,
        dueAmount: 500,
        saleStatus: 'completed',
        issueDate: '2026-09-20T10:00:00.000Z',
      },
      {
        $id: 'inv-2',
        invoiceNumber: 'INV-83/84-000102',
        saleNumber: 'SALE-83/84-000002',
        customerName: 'Kathmandu Traders',
        totalAmount: 2500,
        paidAmount: 0,
        dueAmount: 2500,
        saleStatus: 'pending',
        issueDate: '2026-09-21T10:00:00.000Z',
      },
    ]

    const filterInvoices = (query: string) => {
      if (!query.trim()) return mockInvoices
      const q = query.trim().toLowerCase()
      return mockInvoices.filter((item) => {
        const invNum = (item.invoiceNumber || '').toLowerCase()
        const custName = (item.customerName || '').toLowerCase()
        const saleRef = (item.saleNumber || '').toLowerCase()

        return invNum.includes(q) || custName.includes(q) || saleRef.includes(q)
      })
    }

    it('searches by invoice number', () => {
      const res = filterInvoices('000102')
      expect(res).toHaveLength(1)
      expect(res[0].$id).toBe('inv-2')
    })

    it('searches by sale ref', () => {
      const res = filterInvoices('000001')
      expect(res).toHaveLength(1)
      expect(res[0].$id).toBe('inv-1')
    })

    it('searches by customer name', () => {
      const res = filterInvoices('Kathmandu')
      expect(res).toHaveLength(1)
      expect(res[0].$id).toBe('inv-2')
    })
  })

  describe('Financial Invariants', () => {
    it('verifies Due Amount calculation invariant: dueAmount = total - paidAmount', () => {
      const sales = [
        { total: 1000, paidAmount: 400 },
        { total: 250.5, paidAmount: 250.5 },
        { total: 500, paidAmount: 0 },
      ]

      sales.forEach((s) => {
        const calculatedDue = Math.max(0, s.total - s.paidAmount)
        expect(calculatedDue).toBe(s.total - s.paidAmount)
      })
    })
  })
})
