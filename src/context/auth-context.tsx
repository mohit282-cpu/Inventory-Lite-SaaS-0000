"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { Models } from 'appwrite'
import { AppUser, Business, BusinessMember, Currency, AuthStatus } from '@/types'
import { authService } from '@/services/auth.service'
import { userService } from '@/services/user.service'
import { businessService } from '@/services/business.service'
import { businessMemberService } from '@/services/business-member.service'
import { handleApiError } from '@/lib/error-handler'
import { withTimeout, TimeoutError } from '@/lib/async-utils'

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
  signup: (data: { name: string; email: string; password: string }) => Promise<void>
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
    logoUrl?: string
    currency?: Currency
    timezone?: string
  }) => Promise<Business>
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
   * Guaranteed termination path via withTimeout (10s max limit)
   */
  const refreshAuthInternal = useCallback(async () => {
    // 1. Check Offline Status
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine) {
      if (isMountedRef.current) {
        setUser(null)
        setUserProfile(null)
        setActiveBusiness(null)
        setMemberships([])
        setAuthStatus('OFFLINE')
        setAuthError('You are currently offline. Check your connection.')
      }
      return
    }

    try {
      if (isMountedRef.current) {
        setAuthStatus('INITIALIZING')
        setAuthError(null)
      }

      // 2. Wrap account.get() with guaranteed 10s timeout limit
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

      // 3. AUTHENTICATED! Unblock app immediately
      if (isMountedRef.current) {
        setUser(currentUser)
        setAuthStatus('AUTHENTICATED')
        setAuthError(null)
        setIsWorkspaceLoading(true)
        setWorkspaceError(null)
      }

      // 4. Load Workspace Data (Profile, Memberships, Business) asynchronously
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
            finalProfile = await userService.createUserProfile(currentUser.$id, {
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
      } else if (err?.message?.includes('Network') || err?.message?.includes('Fetch')) {
        setAuthStatus('OFFLINE')
        setAuthError('Network error connecting to authentication server.')
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

  // Attach window online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      if (authStatus === 'OFFLINE' || authStatus === 'TIMEOUT') {
        refreshAuth()
      }
    }

    const handleOffline = () => {
      if (isMountedRef.current) {
        setAuthStatus('OFFLINE')
        setAuthError('You are currently offline.')
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [authStatus, refreshAuth])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const signup = async (data: { name: string; email: string; password: string }) => {
    try {
      clearError()
      setAuthStatus('INITIALIZING')

      const newAcc = await authService.register(data.email, data.password, data.name)
      await authService.login(data.email, data.password)

      try {
        await userService.createUserProfile(newAcc.$id, {
          name: data.name,
          email: data.email,
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
      setAuthStatus('INITIALIZING')
      await authService.login(data.email, data.password)
      await refreshAuth()
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
          logoUrl: data.logoUrl,
          currency: data.currency || 'NPR',
          timezone: data.timezone || 'Asia/Kathmandu',
        },
        user.$id
      )

      const membership = await businessMemberService.addMember({ userId: user.$id, role: 'owner' }, business.$id, user.$id)

      try {
        await userService.updateUserPreferences(user.$id, {
          activeBusinessId: business.$id,
        })
      } catch {
        // Preference update warning
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

  const isAuthLoading = authStatus === 'INITIALIZING'

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
