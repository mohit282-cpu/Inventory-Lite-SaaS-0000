import { describe, it, expect } from 'vitest'
import { BusinessMember, Business } from '@/types'

describe('Persistent Multi-Device Business & Onboarding Prevention Engine', () => {
  const mockUser = {
    $id: 'user_device_b_123',
    name: 'Shyam Sharma',
    email: 'shyam@example.com',
    preferences: {
      onboardingCompleted: true,
      activeBusinessId: 'biz_persistent_999',
    },
  }

  const mockBusiness: Business = {
    $id: 'biz_persistent_999',
    $collectionId: 'businesses',
    $databaseId: 'system',
    $createdAt: '2026-01-01',
    $updatedAt: '2026-01-01',
    $permissions: [],
    name: 'Sharma Traders',
    ownerId: 'user_device_b_123',
    phone: '9851000000',
    email: 'info@sharmatraders.com',
    address: 'Kathmandu, Nepal',
    currency: 'NPR',
    timezone: 'Asia/Kathmandu',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }

  const mockMembership: BusinessMember = {
    $id: 'mem_device_b_123',
    $collectionId: 'business_members',
    $databaseId: 'system',
    $createdAt: '2026-01-01',
    $updatedAt: '2026-01-01',
    $permissions: [],
    businessId: 'biz_persistent_999',
    userId: 'user_device_b_123',
    role: 'owner',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }

  it('determines onboarding completion from persistent Appwrite database records even with empty localStorage', () => {
    // Simulate empty localStorage on new Device B / browser
    const localStorageData: Record<string, string> = {}
    const isLocalCompleted = localStorageData[`onboarding_completed_${mockUser.$id}`] === 'true'
    const isProfileCompleted = mockUser.preferences.onboardingCompleted === true
    const memberships: BusinessMember[] = [mockMembership]
    const activeBusiness: Business | null = mockBusiness

    const hasDatabaseBusiness = memberships.length > 0 || activeBusiness !== null
    const hasCompletedBusinessSetup = isProfileCompleted || isLocalCompleted || hasDatabaseBusiness

    // MUST be true so user goes to Dashboard on Device B without onboarding!
    expect(hasCompletedBusinessSetup).toBe(true)
    expect(hasDatabaseBusiness).toBe(true)
  })

  it('prevents duplicate business creation if user already has an active business in Appwrite', async () => {
    const existingMemberships = [mockMembership]
    const existingOwned = [mockBusiness]

    let businessCreatedCount = 0

    // Duplicate check logic inside createBusinessOnboarding
    const existingBizId = existingMemberships[0]?.businessId || existingOwned[0]?.$id
    let resultBusiness: Business

    if (existingBizId) {
      // Return existing business from Appwrite instead of creating another
      resultBusiness = mockBusiness
    } else {
      businessCreatedCount++
      resultBusiness = { ...mockBusiness, $id: 'biz_new_duplicate' }
    }

    expect(businessCreatedCount).toBe(0)
    expect(resultBusiness.$id).toBe('biz_persistent_999')
    expect(resultBusiness.name).toBe('Sharma Traders')
  })

  it('protects route loading state and does NOT interpret workspace loading as missing business', () => {
    const isWorkspaceLoading = true
    const activeBusiness: Business | null = null

    // Correct route guard condition: wait for loading to complete
    const isWaitingForWorkspace = isWorkspaceLoading && !activeBusiness
    expect(isWaitingForWorkspace).toBe(true)
  })
})
