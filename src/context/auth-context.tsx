"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Models } from 'appwrite'
import { AppUser, Business, BusinessMember, Currency } from '@/types'
import { authService } from '@/services/auth.service'
import { userService } from '@/services/user.service'
import { businessService } from '@/services/business.service'
import { businessMemberService } from '@/services/business-member.service'
import { handleApiError } from '@/lib/error-handler'

interface AuthContextType {
  user: Models.User<Models.Preferences> | null
  userProfile: AppUser | null
  activeBusiness: Business | null
  memberships: BusinessMember[]
  isLoading: boolean
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
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [userProfile, setUserProfile] = useState<AppUser | null>(null)
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null)
  const [memberships, setMemberships] = useState<BusinessMember[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const refreshAuth = useCallback(async () => {
    try {
      setIsLoading(true)
      const currentUser = await authService.getCurrentUser()
      
      if (!currentUser) {
        setUser(null)
        setUserProfile(null)
        setActiveBusiness(null)
        setMemberships([])
        return
      }

      setUser(currentUser)

      // Fetch user profile from 'users' collection
      let profile = await userService.getUserProfile(currentUser.$id)
      if (!profile) {
        profile = await userService.createUserProfile(currentUser.$id, {
          name: currentUser.name,
          email: currentUser.email,
        })
      }
      setUserProfile(profile)

      // Fetch memberships for this user
      const userMemberships = await businessMemberService.getUserMemberships(currentUser.$id)
      setMemberships(userMemberships)

      // Determine active business
      if (userMemberships.length > 0) {
        const preferredBusinessId = profile?.preferences?.activeBusinessId
        const targetMembership = userMemberships.find(m => m.businessId === preferredBusinessId) || userMemberships[0]
        
        try {
          const business = await businessService.getBusiness(targetMembership.businessId)
          setActiveBusiness(business)
        } catch {
          setActiveBusiness(null)
        }
      } else {
        setActiveBusiness(null)
      }
    } catch (err) {
      setUser(null)
      setUserProfile(null)
      setActiveBusiness(null)
      setMemberships([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const signup = async (data: { name: string; email: string; password: string }) => {
    try {
      setError(null)
      setIsLoading(true)
      
      // 1. Create Appwrite Account
      const newAcc = await authService.register(data.email, data.password, data.name)
      
      // 2. Create Email/Password Session
      await authService.login(data.email, data.password)
      
      // 3. Create extended User Profile in 'users' collection
      try {
        await userService.createUserProfile(newAcc.$id, {
          name: data.name,
          email: data.email,
        })
      } catch (profileError) {
        console.warn('User profile creation warning:', profileError)
      }

      // 4. Refresh auth state
      await refreshAuth()
    } catch (err: any) {
      const appErr = handleApiError(err)
      setError(appErr.message)
      setIsLoading(false)
      throw appErr
    }
  }

  const login = async (data: { email: string; password: string }) => {
    try {
      setError(null)
      setIsLoading(true)
      await authService.login(data.email, data.password)
      await refreshAuth()
    } catch (err: any) {
      const appErr = handleApiError(err)
      setError(appErr.message)
      setIsLoading(false)
      throw appErr
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      await authService.logout()
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null)
      setUserProfile(null)
      setActiveBusiness(null)
      setMemberships([])
      setIsLoading(false)
    }
  }

  const forgotPassword = async (email: string) => {
    try {
      setError(null)
      setIsLoading(true)
      await authService.recoverPassword(email)
    } catch (err: any) {
      const appErr = handleApiError(err)
      setError(appErr.message)
      throw appErr
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (password: string, userId: string, secret: string) => {
    try {
      setError(null)
      setIsLoading(true)
      await authService.completePasswordRecovery(userId, secret, password)
    } catch (err: any) {
      const appErr = handleApiError(err)
      setError(appErr.message)
      throw appErr
    } finally {
      setIsLoading(false)
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
  }) => {
    if (!user) {
      throw new Error('User must be authenticated to create a business')
    }

    try {
      setError(null)
      setIsLoading(true)

      // 1. Create Business Document
      const business = await businessService.createBusiness(data, user.$id)

      // 2. Create Membership with role 'owner'
      await businessMemberService.addMember(
        { userId: user.$id, role: 'owner' },
        business.$id,
        user.$id
      )

      // 3. Set Active Business in User Preferences
      await userService.setActiveBusiness(user.$id, business.$id)

      // 4. Refresh Auth Context
      await refreshAuth()

      return business
    } catch (err: any) {
      const appErr = handleApiError(err)
      setError(appErr.message)
      setIsLoading(false)
      throw appErr
    }
  }

  const switchActiveBusiness = async (businessId: string) => {
    if (!user) return
    try {
      setIsLoading(true)
      const hasMember = memberships.some(m => m.businessId === businessId)
      if (!hasMember) {
        throw new Error('Access denied: You are not a member of this business')
      }
      await userService.setActiveBusiness(user.$id, businessId)
      await refreshAuth()
    } catch (err: any) {
      const appErr = handleApiError(err)
      setError(appErr.message)
      setIsLoading(false)
      throw appErr
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        activeBusiness,
        memberships,
        isLoading,
        error,
        signup,
        login,
        logout,
        forgotPassword,
        resetPassword,
        createBusinessOnboarding,
        switchActiveBusiness,
        refreshAuth,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
