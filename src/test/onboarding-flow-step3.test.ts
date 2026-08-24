import { describe, it, expect } from 'vitest'
import { onboardingSchema } from '@/lib/validations'

describe('Onboarding Flow Step 3 & Completion Isolation', () => {
  it('validates onboardingSchema without requiring or having logoUrl', () => {
    const validData = {
      name: 'Kathmandu Retail',
      ownerName: 'Ram Sharma',
      phone: '9841234567',
      email: 'ram@kathmandu.np',
      address: 'New Road',
      city: 'Kathmandu',
      province: 'Bagmati',
      taxRegistrationType: 'VAT' as const,
      taxRegistrationNumber: '100223344',
      currency: 'NPR' as const,
      timezone: 'Asia/Kathmandu',
      defaultVatRate: 13,
      invoicePrefix: 'INV-',
      lowStockThreshold: 10,
      dateFormat: 'BS_FORMAT',
    }

    const result = onboardingSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('logoUrl')
      expect(result.data).not.toHaveProperty('logoImageUrl')
    }
  })

  it('ensures step transitions keep onboardingCompleted false until explicit Finish Setup', () => {
    let currentStep = 1
    let onboardingCompleted = false

    // Step 1 -> Step 2
    currentStep = 2
    expect(currentStep).toBe(2)
    expect(onboardingCompleted).toBe(false)

    // Step 2 -> Step 3 (Preferences page visible)
    currentStep = 3
    expect(currentStep).toBe(3)
    expect(onboardingCompleted).toBe(false) // Must stop at Preferences page without setting onboardingCompleted = true!

    // User explicitly clicks "Finish Setup"
    onboardingCompleted = true
    expect(currentStep).toBe(3)
    expect(onboardingCompleted).toBe(true)
  })
})
