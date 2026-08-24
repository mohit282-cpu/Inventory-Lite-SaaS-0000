"use client"

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { OnboardingForm } from '@/components/features/onboarding/onboarding-form'
import { LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/ui/app-logo'

export default function OnboardingPage() {
  const { user, userProfile, logout, isWorkspaceLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || isWorkspaceLoading) return

    const isLocalCompleted = typeof window !== 'undefined' && user ? localStorage.getItem(`onboarding_completed_${user.$id}`) === 'true' : false
    const isProfileCompleted = userProfile?.preferences?.onboardingCompleted === true
    const isOnboardingCompleted = isProfileCompleted || isLocalCompleted

    if (isOnboardingCompleted) {
      router.replace('/app/dashboard')
    }
  }, [user, userProfile, isWorkspaceLoading, router])

  if (isWorkspaceLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 text-sm font-semibold">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          Loading workspace...
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

      {/* 2. MAIN ONBOARDING AREA */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 flex flex-col items-center">
        <div className="w-full max-w-[720px] mx-auto">
          {/* Onboarding Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Set up your business
            </h1>
            <p className="mt-2 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
              Tell us a few things about your business. You can change these details later from Settings.
            </p>
          </div>

          {/* Wizard Form */}
          <OnboardingForm />
        </div>
      </main>

      {/* Footer copyright note */}
      <footer className="py-4 text-center text-xs text-slate-400 font-medium border-t border-slate-200/50">
        Inventory Lite SaaS &copy; {new Date().getFullYear()} — Multi-tenant Inventory & Billing Setup
      </footer>
    </div>
  )
}
