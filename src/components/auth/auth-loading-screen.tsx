"use client"

import React from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { AppLogo } from '@/components/ui/app-logo'

interface AuthLoadingScreenProps {
  message?: string
}

export function AuthLoadingScreen({ message = 'Authenticating session...' }: AuthLoadingScreenProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-4 font-sans antialiased">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6 animate-fade-in">
        {/* Brand Logo & Icon */}
        <div className="relative">
          <AppLogo iconOnly size={56} />
          <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-slate-50 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Text Header */}
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Inventory<span className="text-indigo-600">Lite</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            SaaS Platform
          </p>
        </div>

        {/* Loading Spinner & Status Indicator */}
        <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm w-full">
          <Loader2 className="h-7 w-7 text-indigo-600 animate-spin" />
          <div className="space-y-1">
            <div className="text-sm font-extrabold text-slate-800">{message}</div>
            <div className="text-xs text-slate-500 font-medium">Verifying your account credentials securely...</div>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
          <span>Protected by 256-bit encrypted authentication</span>
        </div>
      </div>
    </div>
  )
}
