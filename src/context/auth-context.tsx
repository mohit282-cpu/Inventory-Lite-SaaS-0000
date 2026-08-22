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
import { offlineAuthService } from '@/lib/offline/offline-auth.service'
import { syncEngine } from '@/lib/offline/sync-engine'
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
   * Includes Offline Authorization Check
   */
  const refreshAuthInternal = useCallback(async () => {
    // 1. Check Offline Status
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineRecord = await offlineAuthService.getAuthorizedOfflineRecord()
      if (offlineRecord && isMountedRef.current) {
        const mockUser: Models.User<Models.Preferences> = {
          $id: offlineRecord.userId,
          $createdAt: offlineRecord.authorizedAt,
          $updatedAt: offlineRecord.lastValidatedAt,
          name: offlineRecord.userProfile?.name || offlineRecord.email,
          registration: offlineRecord.authorizedAt,
          status: true,
          labels: [],
          passwordUpdate: '',
          email: offlineRecord.email,
          phone: '',
          emailVerification: true,
          phoneVerification: false,
          mfa: false,
          prefs: {},
          accessedAt: offlineRecord.lastValidatedAt,
          targets: [],
        }

        setUser(mockUser)
        setUserProfile(offlineRecord.userProfile)
        setActiveBusiness(offlineRecord.activeBusiness)
        setMemberships(offlineRecord.memberships || [])
        setAuthStatus('OFFLINE_AUTHORIZED')
        setAuthError(null)
      } else if (isMountedRef.current) {
        setUser(null)
        setUserProfile(null)
        setActiveBusiness(null)
        setMemberships([])
        setAuthStatus('OFFLINE_NOT_AUTHORIZED')
        setAuthError(
          'First-time login requires an internet connection. Connect to the internet and sign in once to enable offline access on this device.'
        )
      }
      return
    }

    try {
      if (isMountedRef.current) {
        setAuthStatus('ONLINE_AUTHENTICATING')
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
        setAuthStatus('ONLINE_AUTHENTICATED')
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

      // PRESERVE AUTHENTICATED SESSION FOR ACTIVE USERS
      if (user) {
        setAuthStatus('OFFLINE_AUTHORIZED')
        setIsWorkspaceLoading(false)
        return
      }

      setUser(null)
      setUserProfile(null)
      setActiveBusiness(null)
      setMemberships([])
      setIsWorkspaceLoading(false)

      if (err instanceof TimeoutError) {
        setAuthStatus('TIMEOUT')
        setAuthError('Authentication verification timed out after 10s.')
      } else if (err?.message?.includes('Network') || err?.message?.includes('Fetch')) {
        const offlineRecord = await offlineAuthService.getAuthorizedOfflineRecord()
        if (offlineRecord) {
          setAuthStatus('OFFLINE_AUTHORIZED')
        } else {
          setAuthStatus('OFFLINE_NOT_AUTHORIZED')
          setAuthError('Network error connecting to authentication server.')
        }
      } else {
        setAuthStatus('ERROR')
        setAuthError(err.message || 'An error occurred while verifying your session.')
      }
    }
  }, [user])

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
    const handleOnline = async () => {
      if (
        authStatus === 'OFFLINE_AUTHORIZED' ||
        authStatus === 'OFFLINE' ||
        authStatus === 'TIMEOUT' ||
        authStatus === 'SYNC_FAILED'
      ) {
        setAuthStatus('SYNCING')
        try {
          const currentUser = await authService.getCurrentUser()
          if (currentUser) {
            setAuthStatus('ONLINE_AUTHENTICATED')
            if (activeBusiness?.$id) {
              await syncEngine.processSyncQueue(activeBusiness.$id)
            }
          } else {
            // Appwrite cloud session was revoked or invalidated
            await offlineAuthService.clearOfflineRecord()
            if (isMountedRef.current) {
              setUser(null)
              setUserProfile(null)
              setActiveBusiness(null)
              setMemberships([])
              setAuthStatus('SESSION_EXPIRED')
              setAuthError('Your session has expired or was revoked. Please sign in again.')
            }
          }
        } catch {
          setAuthStatus('SYNC_FAILED')
        }
      }
    }

    const handleOffline = () => {
      if (isMountedRef.current) {
        if (user && activeBusiness) {
          setAuthStatus('OFFLINE_AUTHORIZED')
        } else {
          setAuthStatus('OFFLINE_NOT_AUTHORIZED')
          setAuthError('You are currently offline.')
        }
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [authStatus, user, activeBusiness])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const signup = async (data: { name: string; email: string; password: string; phone?: string }) => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      throw new Error('Account registration requires an active internet connection.')
    }

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
        await userService.createUserProfile(newAcc.$id, {
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

      // Handle Offline Login
      if (typeof window !== 'undefined' && !navigator.onLine) {
        setAuthStatus('INITIALIZING')
        const verifyRes = await offlineAuthService.verifyOfflineCredentials(data.email, data.password)
        if (!verifyRes.success || !verifyRes.record) {
          const errMsg =
            verifyRes.code === 'OFFLINE_NOT_AUTHORIZED'
              ? 'First-time login requires an internet connection. Connect to the internet and sign in once to enable offline access on this device.'
              : 'Invalid email or password.'
          setAuthStatus('OFFLINE_NOT_AUTHORIZED')
          setAuthError(errMsg)
          throw new Error(errMsg)
        }

        const offlineRecord = verifyRes.record
        const mockUser: Models.User<Models.Preferences> = {
          $id: offlineRecord.userId,
          $createdAt: offlineRecord.authorizedAt,
          $updatedAt: offlineRecord.lastValidatedAt,
          name: offlineRecord.userProfile?.name || offlineRecord.email,
          registration: offlineRecord.authorizedAt,
          status: true,
          labels: [],
          passwordUpdate: '',
          email: offlineRecord.email,
          phone: '',
          emailVerification: true,
          phoneVerification: false,
          mfa: false,
          prefs: {},
          accessedAt: offlineRecord.lastValidatedAt,
          targets: [],
        }

        setUser(mockUser)
        setUserProfile(offlineRecord.userProfile)
        setActiveBusiness(offlineRecord.activeBusiness)
        setMemberships(offlineRecord.memberships || [])
        setAuthStatus('OFFLINE_AUTHORIZED')
        setAuthError(null)
        return
      }

      // Online Login
      setAuthStatus('ONLINE_AUTHENTICATING')
      await authService.login(data.email, data.password)
      await refreshAuth()

      // Record offline authorization after successful online refresh
      const currentUser = await authService.getCurrentUser()
      if (currentUser) {
        const profile = await userService.getUserProfile(currentUser.$id).catch(() => null)
        const mems = await businessMemberService.getUserMemberships(currentUser.$id).catch(() => [])
        let biz: Business | null = null
        if (mems.length > 0) {
          biz = await businessService.getBusiness(mems[0].businessId).catch(() => null)
        }
        if (biz) {
          await offlineAuthService.recordOnlineLogin(data.email, data.password, currentUser, profile, biz, mems)
          syncEngine.initialSync(biz.$id)
        }
      }
      setAuthStatus('ONLINE_AUTHENTICATED')
    } catch (err: any) {
      const appErr = handleApiError(err)
      setAuthError(appErr.message)
      setAuthStatus('ERROR')
      throw appErr
    }
  }

  const logout = async (force: boolean = false) => {
    if (activeBusiness?.$id && !force && typeof window !== 'undefined') {
      try {
        const { localDB } = await import('@/lib/offline/db')
        const pendingItems = await localDB.syncQueue
          .where('businessId')
          .equals(activeBusiness.$id)
          .and((item) => item.status === 'PENDING' || item.status === 'FAILED')
          .toArray()

        if (pendingItems.length > 0) {
          const confirmed = window.confirm(
            `Warning: You have ${pendingItems.length} unsynchronized transaction(s). Signing out will leave them pending locally. Are you sure you want to sign out?`
          )
          if (!confirmed) return
        }
      } catch {
        // Non-fatal warning check
      }
    }

    try {
      setAuthStatus('INITIALIZING')
      if (user?.$id) {
        await offlineAuthService.clearOfflineRecord(user.$id)
      } else {
        await offlineAuthService.clearOfflineRecord()
      }
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
    if (typeof window !== 'undefined' && !navigator.onLine) {
      throw new Error('Password reset requires an active internet connection.')
    }
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
    if (typeof window !== 'undefined' && !navigator.onLine) {
      throw new Error('Password reset requires an active internet connection.')
    }
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

      const membership = await businessMemberService.createInitialOwnerMember(user.$id, business.$id)

      try {
        await userService.updateUserPreferences(user.$id, {
          activeBusinessId: business.$id,
        })
      } catch {
        // Preference update warning
      }

      setActiveBusiness(business)
      setMemberships((prev) => [...prev, membership])
      if (typeof window !== 'undefined' && navigator.onLine) {
        syncEngine.initialSync(business.$id)
      }
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
      if (typeof window !== 'undefined' && navigator.onLine) {
        syncEngine.initialSync(businessId)
      }
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
