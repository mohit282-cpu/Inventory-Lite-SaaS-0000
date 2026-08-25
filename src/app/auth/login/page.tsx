"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '@/lib/validations'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { AuthLayout } from '@/components/auth/auth-layout'
import { ArrowRight, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const isOffline = typeof window !== 'undefined' && !navigator.onLine

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const [rememberSession, setRememberSession] = useState(true)

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setApiError(null)
      setIsSubmitting(true)
      await login(data)
      toast({
        title: isOffline ? 'Offline Session Started' : 'Logged in successfully',
        description: isOffline ? 'Working in Offline Mode. Local data loaded.' : 'Welcome back to Inventory Lite',
      })
      router.push('/app/dashboard')
    } catch (err: any) {
      const msg = err?.message || 'Invalid email or password.'
      setApiError(msg)
      toast({
        variant: 'destructive',
        title: 'Authentication Failed',
        description: msg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your business.">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 text-left"
      >
        {isOffline && (
          <div className="flex items-center gap-2 p-3.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <span className="font-bold">Offline Mode:</span> Previously authorized accounts on this device can sign in offline. First-time sign in requires internet.
            </div>
          </div>
        )}

        {apiError && (
          <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-bold text-slate-700">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="owner@business.com"
              className="pl-9 h-11 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-indigo-600 focus:ring-indigo-600"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-600 font-medium">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-bold text-slate-700">
              Password
            </Label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
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
          {errors.password && (
            <p className="text-xs text-red-600 font-medium">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between py-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 font-medium">
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(e) => setRememberSession(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Remember session
          </label>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <div className="pt-4 text-center text-xs text-slate-600 border-t border-slate-200">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Create one
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
