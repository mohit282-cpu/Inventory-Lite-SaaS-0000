"use client"

import { useAuth } from '@/context/auth-context'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LoadingPage } from '@/components/ui/loading'

interface RouteGuardProps {
  children: React.ReactNode
  requireBusiness?: boolean
}

export function RouteGuard({ children, requireBusiness = true }: RouteGuardProps) {
  const { user, activeBusiness, memberships, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const isAuthRoute = pathname.startsWith('/auth')
    const isAppRoute = pathname.startsWith('/app')
    const isOnboardingRoute = pathname === '/onboarding'

    // 1. Unauthenticated users cannot access /app or /onboarding
    if (!user) {
      if (isAppRoute || isOnboardingRoute) {
        router.push('/auth/login')
      }
      return
    }

    // 2. Authenticated user has NO business membership & route requires business -> redirect to /onboarding
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
  }, [user, activeBusiness, memberships, isLoading, pathname, router])

  if (isLoading) {
    return <LoadingPage message="Authenticating session..." />
  }

  return <>{children}</>
}
