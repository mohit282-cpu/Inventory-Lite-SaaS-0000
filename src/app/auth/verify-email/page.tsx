"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId') || ''
  const secret = searchParams.get('secret') || ''
  const { toast } = useToast()

  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)

  // Auto-verify if userId and secret exist in query parameters
  useEffect(() => {
    if (userId && secret) {
      const verifyToken = async () => {
        try {
          setIsVerifying(true)
          await authService.updateVerification(userId, secret)
          setIsVerified(true)
          toast({
            title: 'Email Verified',
            description: 'Your email address has been successfully verified.',
          })
        } catch (err: any) {
          setErrorMsg(err.message || 'Email verification link is invalid or expired.')
        } finally {
          setIsVerifying(false)
        }
      }
      verifyToken()
    }
  }, [userId, secret, toast])

  // Cooldown countdown timer for resend button
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return

    try {
      setIsResending(true)
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      await authService.createVerification(`${origin}/auth/verify-email`)
      setCooldown(60)
      toast({
        title: 'Verification Email Sent',
        description: 'Check your email to verify your account.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Resend Failed',
        description: err.message || 'Unable to send verification email. Please try again later.',
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AuthLayout
      title="Email Verification"
      subtitle="Confirm your email address to access Inventory Lite."
    >
      <div className="space-y-4 text-center py-2">
        {isVerifying ? (
          <div className="py-6 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
            <p className="text-sm font-semibold text-slate-700">Verifying your email address...</p>
          </div>
        ) : isVerified ? (
          <div className="space-y-4 animate-fade-in">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">Your email has been verified!</p>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Your account is now fully active. You can proceed to your dashboard.
            </p>
            <Button
              asChild
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm mt-4"
            >
              <Link href="/app/dashboard">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
              <Mail className="h-6 w-6" />
            </div>

            {errorMsg ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200 text-left">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Check your email to verify your account. Please click the link sent to your email to complete verification.
              </p>
            )}

            <div className="pt-2">
              <Button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isResending}
                variant="outline"
                className="w-full h-11 border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : cooldown > 0 ? (
                  `Resend Verification Email (${cooldown}s)`
                ) : (
                  'Resend Verification Email'
                )}
              </Button>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <Link href="/auth/login" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
