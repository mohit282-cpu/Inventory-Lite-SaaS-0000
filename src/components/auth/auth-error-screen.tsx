"use client"

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AuthStatus } from '@/types'
import { AlertCircle, WifiOff, Clock, RotateCcw, LogIn, Store } from 'lucide-react'

interface AuthErrorScreenProps {
  status: AuthStatus
  error: string | null
  onRetry: () => void
}

export function AuthErrorScreen({ status, error, onRetry }: AuthErrorScreenProps) {
  const router = useRouter()

  const isOffline = status === 'OFFLINE'
  const isTimeout = status === 'TIMEOUT'

  const title = isOffline
    ? 'You are currently offline'
    : isTimeout
    ? 'Session verification timed out'
    : 'Unable to verify your session'

  const description = isOffline
    ? 'Check your internet connection and try again.'
    : error || 'Authentication server took too long to respond. Please check your connection.'

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-4 font-sans antialiased">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-center animate-fade-in">
        {/* Error Header Icon */}
        <div className="flex justify-center">
          <div
            className={`h-14 w-14 rounded-2xl flex items-center justify-center border shadow-xs ${
              isOffline
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : isTimeout
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {isOffline ? (
              <WifiOff className="h-7 w-7" />
            ) : isTimeout ? (
              <Clock className="h-7 w-7" />
            ) : (
              <AlertCircle className="h-7 w-7" />
            )}
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Store className="h-3.5 w-3.5" /> Inventory Lite
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={onRetry}
            className="w-full sm:w-auto h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" /> Retry Verification
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push('/auth/login')}
            className="w-full sm:w-auto h-11 px-6 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2"
          >
            <LogIn className="h-4 w-4 text-slate-500" /> Go to Login
          </Button>
        </div>
      </div>
    </div>
  )
}
