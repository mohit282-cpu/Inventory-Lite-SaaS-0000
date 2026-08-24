"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { Models } from 'appwrite'
import { AppUser, Business, BusinessMember, Currency, AuthStatus, TaxRegistrationType } from '@/types'
import { authService } from '@/services/auth.service'
import { userService } from '@/services/user.service'
import { businessService } from '@/services/business.service'
import { businessMemberService } from '@/services/business-member.service'
import { handleApiError } from '@/lib/error-handler'
import { withTimeout, TimeoutError } from '@/lib/async-utils'
import { formatE164Phone } from '@/lib/utils'

interface AuthContextType {
  user: Models.User<Models.Preferences> | null
  userProfile: AppUser | null
  activeBusiness: Business | null
  memberships: BusinessMember[]
  authStatus: AuthStatus
  isLoading: boolean
  isAuthLoading: boolean
  isWorkspaceLoading: boolean
  authError: string | null
  workspaceError: string | null
  error: string | null
  signup: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>
  login: (data: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (password: string, userId: string, secret: string) => Promise<void>
  createBusinessOnboarding: (data: {
    name: string
    phone?: string
    email?: string
    address?: string
    panNumber?: string
    vatNumber?: string
    taxRegistrationType?: TaxRegistrationType
    taxRegistrationNumber?: string
    logoUrl?: string
    currency?: Currency
    timezone?: string
  }) => Promise<Business>
  completeOnboarding: (businessId?: string) => Promise<void>
  switchActiveBusiness: (businessId: string) => Promise<void>
  refreshAuth: () => Promise<void>
  retryAuth: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [userProfile, setUserProfile] = useState<AppUser | null>(null)
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null)
  const [memberships, setMemberships] = useState<BusinessMember[]>([])

  const [authStatus, setAuthStatus] = useState<AuthStatus>('INITIALIZING')
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState<boolean>(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

  const isMountedRef = useRef<boolean>(true)
  const authInFlightRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const clearError = useCallback(() => {
    setAuthError(null)
    setWorkspaceError(null)
  }, [])

  /**
   * Primary Authentication Bootstrap
   */
  const refreshAuthInternal = useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setAuthStatus('ONLINE_AUTHENTICATING')
        setAuthError(null)
      }

      // Wrap account.get() with guaranteed 10s timeout limit
      const currentUser = await withTimeout(
        authService.getCurrentUser(),
        10000,
        'Authentication request timed out'
      )

      if (!currentUser) {
        if (isMountedRef.current) {
          setUser(null)
          setUserProfile(null)
          setActiveBusiness(null)
          setMemberships([])
          setAuthStatus('UNAUTHENTICATED')
        }
        return
      }

      // AUTHENTICATED! Unblock app immediately
      if (isMountedRef.current) {
        setUser(currentUser)
        setAuthStatus('ONLINE_AUTHENTICATED')
        setAuthError(null)
        setIsWorkspaceLoading(true)
        setWorkspaceError(null)
      }

      // Load Workspace Data (Profile, Memberships, Business) asynchronously
      try {
        const [profileRes, membershipsRes] = await Promise.all([
          withTimeout(userService.getUserProfile(currentUser.$id), 6000, 'User profile fetch timed out').catch((err) => {
            console.warn('User profile fetch warning:', err)
            return null
          }),
          withTimeout(businessMemberService.getUserMemberships(currentUser.$id), 6000, 'Memberships fetch timed out').catch((err) => {
            console.warn('Memberships fetch warning:', err)
            return []
          }),
        ])

        if (!isMountedRef.current) return

        let finalProfile = profileRes
        if (!finalProfile) {
          try {
            finalProfile = await userService.getOrCreateUserProfile(currentUser.$id, {
              name: currentUser.name,
              email: currentUser.email,
            })
          } catch {
            // Non-fatal
          }
        }
        setUserProfile(finalProfile)
        setMemberships(membershipsRes)

        // Determine Active Business
        if (membershipsRes.length > 0) {
          const preferredId = finalProfile?.preferences?.activeBusinessId
          const targetMembership = membershipsRes.find((m) => m.businessId === preferredId) || membershipsRes[0]

          try {
            const biz = await withTimeout(
              businessService.getBusiness(targetMembership.businessId),
              5000,
              'Business fetch timed out'
            )
            if (isMountedRef.current) {
              setActiveBusiness(biz)
            }
          } catch (bizErr) {
            console.warn('Active business fetch warning:', bizErr)
            if (isMountedRef.current) {
              setActiveBusiness(null)
            }
          }
        } else if (isMountedRef.current) {
          setActiveBusiness(null)
        }
      } catch (wsErr: any) {
        if (isMountedRef.current) {
          setWorkspaceError(wsErr.message || 'Failed to load workspace data')
        }
      } finally {
        if (isMountedRef.current) {
          setIsWorkspaceLoading(false)
        }
      }
    } catch (err: any) {
      if (!isMountedRef.current) return

      setUser(null)
      setUserProfile(null)
      setActiveBusiness(null)
      setMemberships([])
      setIsWorkspaceLoading(false)

      if (err instanceof TimeoutError) {
        setAuthStatus('TIMEOUT')
        setAuthError('Authentication verification timed out after 10s.')
      } else {
        setAuthStatus('ERROR')
        setAuthError(err.message || 'An error occurred while verifying your session.')
      }
    }
  }, [])

  /**
   * Concurrency Guarded Auth Refresh
   */
  const refreshAuth = useCallback(async () => {
    if (authInFlightRef.current) {
      return authInFlightRef.current
    }

    const promise = refreshAuthInternal().finally(() => {
      authInFlightRef.current = null
    })

    authInFlightRef.current = promise
    return promise
  }, [refreshAuthInternal])

  const retryAuth = useCallback(async () => {
    clearError()
    return refreshAuth()
  }, [clearError, refreshAuth])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const signup = async (data: { name: string; email: string; password: string; phone?: string }) => {
    try {
      clearError()
      setAuthStatus('ONLINE_AUTHENTICATING')

      const formattedPhone = data.phone ? formatE164Phone(data.phone) : ''
      const newAcc = await authService.register(data.email, data.password, data.name, formattedPhone || data.phone)
      await authService.login(data.email, data.password)

      // Sync native Appwrite Auth Phone attribute once session is established
      if (formattedPhone) {
        try {
          await authService.updatePhone(formattedPhone, data.password)
        } catch (phoneErr) {
          console.warn('[AuthContext] Update native Appwrite Auth phone warning:', phoneErr)
        }
      }

      try {
        await userService.getOrCreateUserProfile(newAcc.$id, {
          name: data.name,
          email: data.email,
          phone: formattedPhone || data.phone,
        })
      } catch (pErr) {
        console.warn('Profile setup warning:', pErr)
      }

      await refreshAuth()
    } catch (err: any) {
      const appErr = handleApiError(err)
      setAuthError(appErr.message)
      setAuthStatus('ERROR')
      throw appErr
    }
  }

  const login = async (data: { email: string; password: string }) => {
    try {
      clearError()

      // Online Login
      setAuthStatus('ONLINE_AUTHENTICATING')
      await authService.login(data.email, data.password)
      await refreshAuth()
      setAuthStatus('ONLINE_AUTHENTICATED')
    } catch (err: any) {
      const appErr = handleApiError(err)
      setAuthError(appErr.message)
      setAuthStatus('ERROR')
      throw appErr
    }
  }

  const logout = async () => {
    try {
      setAuthStatus('INITIALIZING')
      await authService.logout()
    } catch {
      // Ignore logout errors
    } finally {
      if (isMountedRef.current) {
        setUser(null)
        setUserProfile(null)
        setActiveBusiness(null)
        setMemberships([])
        setAuthStatus('UNAUTHENTICATED')
        setIsWorkspaceLoading(false)
      }
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      clearError()
      await authService.recoverPassword(email)
    } catch (err: any) {
      const appErr = handleApiError(err)
      setAuthError(appErr.message)
      throw appErr
    }
  }

  const resetPassword = async (password: string, userId: string, secret: string) => {
    try {
      clearError()
      await authService.completePasswordRecovery(userId, secret, password)
    } catch (err: any) {
      const appErr = handleApiError(err)
      setAuthError(appErr.message)
      throw appErr
    }
  }

  const createBusinessOnboarding = async (data: {
    name: string
    phone?: string
    email?: string
    address?: string
    panNumber?: string
    vatNumber?: string
    taxRegistrationType?: TaxRegistrationType
    taxRegistrationNumber?: string
    logoUrl?: string
    currency?: Currency
    timezone?: string
  }): Promise<Business> => {
    if (!user) {
      throw new Error('User must be authenticated to create a business')
    }

    try {
      clearError()

      const business = await businessService.createBusiness(
        {
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          panNumber: data.panNumber,
          vatNumber: data.vatNumber,
          taxRegistrationType: data.taxRegistrationType,
          taxRegistrationNumber: data.taxRegistrationNumber,
          logoUrl: data.logoUrl,
          currency: data.currency || 'NPR',
          timezone: data.timezone || 'Asia/Kathmandu',
        },
        user.$id
      )

      const membership = await businessMemberService.createInitialOwnerMember(user.$id, business.$id)

      try {
        const updatedUser = await userService.updateUserPreferences(user.$id, {
          activeBusinessId: business.$id,
          onboardingCompleted: false,
        })
        setUserProfile(updatedUser)
      } catch {
        // Fallback
      }

      setActiveBusiness(business)
      setMemberships((prev) => [...prev, membership])
      return business
    } catch (err: any) {
      const appErr = handleApiError(err)
      setAuthError(appErr.message)
      throw appErr
    }
  }

  const completeOnboarding = async (businessId?: string): Promise<void> => {
    if (!user) return
    try {
      const prefs: any = { onboardingCompleted: true }
      if (businessId) prefs.activeBusinessId = businessId
      const updatedUser = await userService.updateUserPreferences(user.$id, prefs)
      if (isMountedRef.current) {
        setUserProfile(updatedUser)
      }
    } catch {
      // Fallback
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`onboarding_completed_${user.$id}`, 'true')
      }
    }
  }

  const switchActiveBusiness = async (businessId: string) => {
    if (!user) return

    try {
      clearError()
      setIsWorkspaceLoading(true)
      const business = await businessService.getBusiness(businessId)

      try {
        await userService.updateUserPreferences(user.$id, {
          activeBusinessId: businessId,
        })
      } catch {
        // Preference update warning
      }

      setActiveBusiness(business)
    } catch (err: any) {
      const appErr = handleApiError(err)
      setWorkspaceError(appErr.message)
    } finally {
      setIsWorkspaceLoading(false)
    }
  }

  const isAuthLoading = authStatus === 'INITIALIZING' || authStatus === 'ONLINE_AUTHENTICATING'

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        activeBusiness,
        memberships,
        authStatus,
        isLoading: isAuthLoading,
        isAuthLoading,
        isWorkspaceLoading,
        authError,
        workspaceError,
        error: authError || workspaceError,
        signup,
        login,
        logout,
        forgotPassword,
        resetPassword,
        createBusinessOnboarding,
        completeOnboarding,
        switchActiveBusiness,
        refreshAuth,
        retryAuth,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
