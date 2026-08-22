"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema } from '@/lib/validations'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'

import { PasswordStrengthMeter } from '@/components/auth/password-strength-meter'

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
  const { resetPassword } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId') || ''
  const secret = searchParams.get('secret') || ''

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const passwordValue = watch('password')

  const onSubmit = async (data: ResetPasswordValues) => {
    if (!userId || !secret) {
      setErrorMsg('Invalid or expired password reset link.')
      return
    }

    try {
      setErrorMsg(null)
      setIsSubmitting(true)
      await resetPassword(data.password, userId, secret)
      setIsSuccess(true)
      toast({
        title: 'Password updated',
        description: 'Your password has been updated. Please sign in again.',
      })
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password'
      setErrorMsg(msg)
      toast({
        variant: 'destructive',
        title: 'Reset Password Failed',
        description: msg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a new password for your Inventory Lite account."
    >
      {isSuccess ? (
        <div className="space-y-4 text-center py-4 animate-fade-in">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            Your password has been updated. Please sign in again.
          </p>
          <Button
            asChild
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm mt-4"
          >
            <Link href="/auth/login">Proceed to Sign In</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-bold text-slate-700">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 chars (upper, lower, num, symbol)"
                className="pl-9 pr-10 h-11 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-indigo-600 focus:ring-indigo-600"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={passwordValue} />
            {errors.password && (
              <p className="text-xs text-red-600 font-medium mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700">
              Confirm New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter your new password"
                className="pl-9 pr-10 h-11 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-indigo-600 focus:ring-indigo-600"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 font-medium">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting password...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>

          <div className="pt-4 text-center text-xs text-slate-600 border-t border-slate-200">
            Remember your password?{' '}
            <Link
              href="/auth/login"
              className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading...</div>}>
      <ResetPasswordForm />
    </React.Suspense>
  )
}
