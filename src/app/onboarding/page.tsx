"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { OnboardingForm } from '@/components/features/onboarding/onboarding-form'
import { LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/ui/app-logo'

export default function OnboardingPage() {
  const { user, userProfile, activeBusiness, memberships, logout, isWorkspaceLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || isWorkspaceLoading) return

    const isLocalCompleted = typeof window !== 'undefined' && user ? localStorage.getItem(`onboarding_completed_${user.$id}`) === 'true' : false
    const isProfileCompleted = userProfile?.preferences?.onboardingCompleted === true
    const hasDatabaseBusiness = memberships.length > 0 || activeBusiness !== null || !!userProfile?.preferences?.activeBusinessId
    const isOnboardingCompleted = isProfileCompleted || isLocalCompleted || hasDatabaseBusiness

    if (isOnboardingCompleted) {
      router.replace('/app/dashboard')
    }
  }, [user, userProfile, activeBusiness, memberships, isWorkspaceLoading, router])

  if (isWorkspaceLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex items-center gap-3 text-slate-600 text-sm font-semibold">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          Loading your business...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 1. TOP BRAND HEADER AREA */}
      <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AppLogo size={32} />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline font-medium">
              Signed in as <span className="font-semibold text-slate-700">{user?.email}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold h-8"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* 2. FORM BODY AREA */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 my-4">
        <OnboardingForm />
      </main>
    </div>
  )
}
