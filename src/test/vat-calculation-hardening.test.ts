import { describe, it, expect } from 'vitest'
import { calculateSaleTotals, validateFinancialInvariants } from '@/lib/money'

describe('VAT Calculation Hardening & Financial Invariants', () => {
  it('should calculate 0 tax when vatEnabled is false even if taxRate is 13%', () => {
    const totals = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 2, unitPrice: 500 }],
      vatEnabled: false,
      taxRate: 13,
      paidAmount: 1000,
    })

    expect(totals.subtotal).toBe(1000)
    expect(totals.taxableAmount).toBe(1000)
    expect(totals.taxAmount).toBe(0)
    expect(totals.total).toBe(1000)
    expect(totals.dueAmount).toBe(0)
    expect(totals.changeAmount).toBe(0)
  })

  it('should calculate 13% VAT when vatEnabled is true', () => {
    const totals = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 2, unitPrice: 500 }],
      vatEnabled: true,
      taxRate: 13,
      paidAmount: 1130,
    })

    expect(totals.subtotal).toBe(1000)
    expect(totals.taxableAmount).toBe(1000)
    expect(totals.taxAmount).toBe(130)
    expect(totals.total).toBe(1130)
    expect(totals.dueAmount).toBe(0)
    expect(totals.changeAmount).toBe(0)
  })

  it('should handle overall discount before VAT calculation correctly', () => {
    const totals = calculateSaleTotals({
      items: [{ productId: 'p1', quantity: 2, unitPrice: 500 }],
      discount: 200,
      vatEnabled: true,
      taxRate: 13,
      paidAmount: 904,
    })

    expect(totals.subtotal).toBe(1000)
    expect(totals.overallDiscount).toBe(200)
    expect(totals.taxableAmount).toBe(800)
    expect(totals.taxAmount).toBe(104) // 13% of 800
    expect(totals.total).toBe(904)
    expect(totals.dueAmount).toBe(0)
    expect(totals.changeAmount).toBe(0)
  })

  it('should validate financial invariants for underpayment', () => {
    expect(() =>
      validateFinancialInvariants({
        total: 1000,
        paidAmount: 600,
        dueAmount: 400,
        changeAmount: 0,
      })
    ).not.toThrow()
  })

  it('should validate financial invariants for overpayment', () => {
    expect(() =>
      validateFinancialInvariants({
        total: 1000,
        paidAmount: 1200,
        dueAmount: 0,
        changeAmount: 200,
      })
    ).not.toThrow()
  })
})
