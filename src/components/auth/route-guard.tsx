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
  const { user, activeBusiness, memberships, authStatus, isAuthLoading, authError, retryAuth } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Wait until initial session verification finishes
    if (isAuthLoading || authStatus === 'INITIALIZING') return

    const isAuthRoute = pathname.startsWith('/auth')
    const isAppRoute = pathname.startsWith('/app')
    const isOnboardingRoute = pathname === '/onboarding'

    // 1. Unauthenticated users cannot access /app or /onboarding
    if (authStatus === 'UNAUTHENTICATED' || !user) {
      if (isAppRoute || isOnboardingRoute) {
        router.push('/auth/login')
      }
      return
    }

    // 2. Authenticated user has NO business membership & route requires business -> redirect to /onboarding
    if (authStatus === 'AUTHENTICATED' || authStatus === 'ONLINE_AUTHENTICATED' || authStatus === 'OFFLINE_AUTHORIZED') {
      const hasBusiness = activeBusiness !== null || (memberships?.length ?? 0) > 0
      if (requireBusiness && !hasBusiness) {
        if (isAppRoute || isAuthRoute) {
          router.push('/onboarding')
        }
        return
      }

      // 3. Authenticated user WITH a business accessing /auth or /onboarding -> redirect to /app/dashboard
      if (isAuthRoute || isOnboardingRoute) {
        router.push('/app/dashboard')
      }
    }
  }, [user, activeBusiness, memberships, authStatus, isAuthLoading, pathname, router, requireBusiness])

  const isPublicRoute = pathname === '/' || pathname.startsWith('/auth')

  // 1. Loading State - Only block protected app routes, allow public marketing pages to render static HTML immediately
  if ((isAuthLoading || authStatus === 'INITIALIZING') && !isPublicRoute) {
    return <AuthLoadingScreen message="Authenticating session..." />
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
