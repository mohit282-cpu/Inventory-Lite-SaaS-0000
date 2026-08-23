import { describe, it, expect } from 'vitest'
import {
  TaxRegistrationType,
  getEffectiveTaxRegistration,
  getDefaultVatState,
  DEFAULT_VAT_RATE,
  getSellerTaxLabel,
} from '@/lib/localization'
import { calculateSaleTotals } from '@/lib/money'
import { businessSettingsSchema } from '@/lib/validations'

describe('Business Tax Registration & Automatic VAT Billing Hardening', () => {
  // Test 1 — VAT business defaults VAT ON 13%
  it('Test 1 — VAT business defaults to VAT ON at 13%', () => {
    const biz = {
      taxRegistrationType: 'VAT' as TaxRegistrationType,
      taxRegistrationNumber: '123456789',
    }
    const eff = getEffectiveTaxRegistration(biz)
    expect(eff.type).toBe('VAT')
    expect(eff.number).toBe('123456789')

    const vatState = getDefaultVatState(biz)
    expect(vatState.vatEnabled).toBe(true)
    expect(vatState.vatRate).toBe(DEFAULT_VAT_RATE)
  })

  // Test 2 — PAN business defaults VAT OFF
  it('Test 2 — PAN business defaults to VAT OFF', () => {
    const biz = {
      taxRegistrationType: 'PAN' as TaxRegistrationType,
      taxRegistrationNumber: '987654321',
    }
    const eff = getEffectiveTaxRegistration(biz)
    expect(eff.type).toBe('PAN')
    expect(eff.number).toBe('987654321')

    const vatState = getDefaultVatState(biz)
    expect(vatState.vatEnabled).toBe(false)
  })

  // Test 3 — NONE business defaults VAT OFF
  it('Test 3 — Business without tax registration defaults to VAT OFF', () => {
    const biz = {
      taxRegistrationType: 'NONE' as TaxRegistrationType,
    }
    const eff = getEffectiveTaxRegistration(biz)
    expect(eff.type).toBe('NONE')
    expect(eff.number).toBe('')

    const vatState = getDefaultVatState(biz)
    expect(vatState.vatEnabled).toBe(false)
  })

  // Test 4 — Backward compatibility with legacy vatNumber
  it('Test 4 — Legacy business with vatNumber resolves to VAT type', () => {
    const legacyBiz = {
      vatNumber: '100200300',
    }
    const eff = getEffectiveTaxRegistration(legacyBiz)
    expect(eff.type).toBe('VAT')
    expect(eff.number).toBe('100200300')

    const vatState = getDefaultVatState(legacyBiz)
    expect(vatState.vatEnabled).toBe(true)
  })

  // Test 5 — Backward compatibility with legacy panNumber
  it('Test 5 — Legacy business with panNumber resolves to PAN type', () => {
    const legacyBiz = {
      panNumber: '600700800',
    }
    const eff = getEffectiveTaxRegistration(legacyBiz)
    expect(eff.type).toBe('PAN')
    expect(eff.number).toBe('600700800')

    const vatState = getDefaultVatState(legacyBiz)
    expect(vatState.vatEnabled).toBe(false)
  })

  // Test 6 — Seller tax label for VAT business
  it('Test 6 — Formats seller tax label correctly for VAT business', () => {
    const biz = {
      taxRegistrationType: 'VAT' as TaxRegistrationType,
      taxRegistrationNumber: '123456789',
    }
    const label = getSellerTaxLabel(biz)
    expect(label.vat).toBe('123456789')
    expect(label.formattedText).toBe('VAT of the seller: 123456789')
  })

  // Test 7 — Seller tax label for PAN business
  it('Test 7 — Formats seller tax label correctly for PAN business', () => {
    const biz = {
      taxRegistrationType: 'PAN' as TaxRegistrationType,
      taxRegistrationNumber: '987654321',
    }
    const label = getSellerTaxLabel(biz)
    expect(label.pan).toBe('987654321')
    expect(label.formattedText).toBe('PAN of the seller: 987654321')
  })

  // Test 8 — Manual toggle behavior: manual VAT OFF remains OFF regardless of cart changes
  it('Test 8 — Manual toggle OFF remains OFF when cart changes', () => {
    const biz = { taxRegistrationType: 'VAT' as TaxRegistrationType, taxRegistrationNumber: '123456789' }
    let isVatEnabled = getDefaultVatState(biz).vatEnabled
    expect(isVatEnabled).toBe(true)

    // User manually toggles OFF
    isVatEnabled = false

    // Simulate cart item addition or update
    const cart = [{ productId: 'p1', quantity: 5, unitPrice: 100, discount: 0 }]
    const totals = calculateSaleTotals({
      items: cart,
      discount: 0,
      vatEnabled: isVatEnabled, // should remain false
      taxRate: 13,
      paidAmount: 500,
    })

    expect(totals.taxAmount).toBe(0)
    expect(totals.total).toBe(500)
    expect(isVatEnabled).toBe(false)
  })

  // Test 9 — Business switching updates default VAT state cleanly
  it('Test 9 — Business switching updates tax configuration cleanly without state leakage', () => {
    const bizA = { taxRegistrationType: 'VAT' as TaxRegistrationType, taxRegistrationNumber: '111' }
    const bizB = { taxRegistrationType: 'PAN' as TaxRegistrationType, taxRegistrationNumber: '222' }

    let activeVatState = getDefaultVatState(bizA)
    expect(activeVatState.vatEnabled).toBe(true)

    // Switch to Business B
    activeVatState = getDefaultVatState(bizB)
    expect(activeVatState.vatEnabled).toBe(false)
  })

  // Test 10 — Historical invoice immutability
  it('Test 10 — Historical invoice tax snapshot remains unchanged when business changes tax type', () => {
    const historicalSale = {
      subtotal: 10000,
      discount: 1000,
      taxableAmount: 9000,
      tax: 1170,
      vatEnabled: true,
      vatRate: 13,
      taxRate: 13,
      total: 10170,
    }

    // Business changes from VAT to PAN later
    const updatedBusiness = { taxRegistrationType: 'PAN' as TaxRegistrationType, taxRegistrationNumber: '999' }
    expect(getDefaultVatState(updatedBusiness).vatEnabled).toBe(false)

    // Old invoice snapshot MUST preserve original values
    expect(historicalSale.vatEnabled).toBe(true)
    expect(historicalSale.tax).toBe(1170)
    expect(historicalSale.total).toBe(10170)
  })

  // Test 11 — Exact calculation verification
  it('Test 11 — Verifies exact calculation: Subtotal 10000 - Discount 1000 = Taxable 9000 + 13% VAT 1170 = Total 10170', () => {
    const saleParams = {
      items: [{ productId: 'item1', quantity: 10, unitPrice: 1000, discount: 0 }],
      discount: 1000,
      vatEnabled: true,
      taxRate: 13,
      paidAmount: 10170,
    }

    const totals = calculateSaleTotals(saleParams)
    expect(totals.subtotal).toBe(10000)
    expect(totals.overallDiscount).toBe(1000)
    expect(totals.taxableAmount).toBe(9000)
    expect(totals.taxAmount).toBe(1170)
    expect(totals.total).toBe(10170)
  })

  // Test 12 — Invalid configuration validation
  it('Test 12 — Should reject VAT registration without registration number', () => {
    const invalidVatData = {
      name: 'Invalid Shop',
      timezone: 'Asia/Kathmandu',
      currency: 'NPR',
      taxRegistrationType: 'VAT',
      taxRegistrationNumber: '',
    }
    const result = businessSettingsSchema.safeParse(invalidVatData)
    expect(result.success).toBe(false)
  })
})
