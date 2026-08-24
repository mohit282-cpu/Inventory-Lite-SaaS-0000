"use client"

import React, { useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import { AuthLoadingScreen } from '@/components/auth/auth-loading-screen'
import { AuthErrorScreen } from '@/components/auth/auth-error-screen'

interface RouteGuardProps {
  children: React.ReactNode
  requireBusiness?: boolean
}

export function RouteGuard({ children, requireBusiness = true }: RouteGuardProps) {
  const { user, userProfile, activeBusiness, memberships, authStatus, isAuthLoading, isWorkspaceLoading, authError, retryAuth } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // 1. Wait until initial session verification AND workspace initialization finish
    if (isAuthLoading || authStatus === 'INITIALIZING' || authStatus === 'ONLINE_AUTHENTICATING') return
    if (user && isWorkspaceLoading) return

    const currentPath = pathname || ''
    const isAuthRoute = currentPath.startsWith('/auth')
    const isAppRoute = currentPath.startsWith('/app')
    const isOnboardingRoute = currentPath === '/onboarding'
    const isAccountBlockedRoute = currentPath === '/account-blocked'

    const isUserBlocked =
      userProfile?.accountStatus === 'BLOCKED' ||
      userProfile?.isBlocked === true ||
      userProfile?.preferences?.accountStatus === 'BLOCKED' ||
      userProfile?.preferences?.isBlocked === true ||
      (typeof window !== 'undefined' && user ? localStorage.getItem(`account_blocked_${user.$id}`) === 'true' : false)

    if (user && isUserBlocked) {
      if (!isAccountBlockedRoute) {
        router.replace('/account-blocked')
      }
      return
    }

    if (user && isAccountBlockedRoute && !isUserBlocked) {
      router.replace('/app/dashboard')
      return
    }

    // 2. Unauthenticated users cannot access /app or /onboarding
    if (authStatus === 'UNAUTHENTICATED' || !user) {
      if (isAppRoute || isOnboardingRoute) {
        router.replace('/auth/login')
      }
      return
    }

    // 3. Authenticated user state machine
    if (authStatus === 'AUTHENTICATED' || authStatus === 'ONLINE_AUTHENTICATED' || authStatus === 'OFFLINE_AUTHORIZED') {
      const isLocalCompleted = typeof window !== 'undefined' && user ? localStorage.getItem(`onboarding_completed_${user.$id}`) === 'true' : false
      const isProfileCompleted = userProfile?.preferences?.onboardingCompleted === true

      // Onboarding is ONLY completed if explicitly marked in profile or localStorage
      const isOnboardingCompleted = isProfileCompleted || isLocalCompleted

      // Authenticated user with incomplete onboarding accessing /app -> redirect to /onboarding
      if (requireBusiness && !isOnboardingCompleted) {
        if (isAppRoute && !isOnboardingRoute) {
          router.replace('/onboarding')
        }
        return
      }

      // Authenticated user WITH completed onboarding accessing /auth or /onboarding -> redirect to /app/dashboard
      if (isOnboardingCompleted && (isAuthRoute || isOnboardingRoute)) {
        router.replace('/app/dashboard')
      }
    }
  }, [user, userProfile, activeBusiness, memberships, authStatus, isAuthLoading, isWorkspaceLoading, pathname, router, requireBusiness])

  const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '')
  const isPublicRoute = currentPath === '/' || currentPath.startsWith('/auth')

  // Loading State - Allow public marketing pages to render immediately; show loading screen for protected routes while authenticating or fetching initial workspace
  if ((isAuthLoading || authStatus === 'INITIALIZING' || (user && isWorkspaceLoading && requireBusiness && !activeBusiness)) && !isPublicRoute) {
    return <AuthLoadingScreen message="Loading workspace..." />
  }

  // 2. Authenticated user (online or offline mode) -> ALWAYS render children, NEVER block with full-page error!
  if (user) {
    return <>{children}</>
  }

  // 3. Error / Timeout / Offline State ONLY for unauthenticated users on protected routes
  if ((authStatus === 'TIMEOUT' || authStatus === 'ERROR' || authStatus === 'OFFLINE_NOT_AUTHORIZED') && !isPublicRoute) {
    return <AuthErrorScreen status={authStatus} error={authError} onRetry={retryAuth} />
  }


  return <>{children}</>
}
