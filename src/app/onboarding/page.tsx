"use client"

import React from 'react'
import { OnboardingForm } from '@/components/features/onboarding/onboarding-form'
import { Store } from 'lucide-react'

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 py-12 px-4 flex flex-col justify-center">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-2xl font-extrabold text-white">
            Inventory <span className="text-indigo-400">Lite</span>
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Set Up Your Business Profile
        </h1>
        <p className="mt-2 text-slate-400 max-w-md mx-auto">
          Welcome! Provide your business details to configure tenant isolation and billing defaults.
        </p>
      </div>

      <OnboardingForm />
    </div>
  )
}
