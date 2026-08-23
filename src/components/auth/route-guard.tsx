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
  const { user, activeBusiness, memberships, authStatus, isAuthLoading, isWorkspaceLoading, authError, retryAuth } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // 1. Wait until initial session verification AND workspace initialization finish
    if (isAuthLoading || authStatus === 'INITIALIZING' || authStatus === 'ONLINE_AUTHENTICATING') return
    if (user && isWorkspaceLoading) return

    const isAuthRoute = pathname.startsWith('/auth')
    const isAppRoute = pathname.startsWith('/app')
    const isOnboardingRoute = pathname === '/onboarding'

    // 2. Unauthenticated users cannot access /app or /onboarding
    if (authStatus === 'UNAUTHENTICATED' || !user) {
      if (isAppRoute || isOnboardingRoute) {
        router.replace('/auth/login')
      }
      return
    }

    // 3. Authenticated user state machine
    if (authStatus === 'AUTHENTICATED' || authStatus === 'ONLINE_AUTHENTICATED' || authStatus === 'OFFLINE_AUTHORIZED') {
      const hasBusiness = activeBusiness !== null || (memberships?.length ?? 0) > 0

      // Authenticated user has NO business membership & route requires business -> redirect to /onboarding
      if (requireBusiness && !hasBusiness) {
        if ((isAppRoute || isAuthRoute) && !isOnboardingRoute) {
          router.replace('/onboarding')
        }
        return
      }

      // Authenticated user WITH a business accessing /auth or /onboarding -> redirect to /app/dashboard
      if (hasBusiness && (isAuthRoute || isOnboardingRoute)) {
        router.replace('/app/dashboard')
      }
    }
  }, [user, activeBusiness, memberships, authStatus, isAuthLoading, isWorkspaceLoading, pathname, router, requireBusiness])

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
