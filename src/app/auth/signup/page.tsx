"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '@/lib/validations'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { AuthLayout } from '@/components/auth/auth-layout'
import { ArrowRight, Lock, Mail, User, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

type SignupFormValues = z.infer<typeof registerSchema>

export default function SignupPage() {
  const { signup } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: SignupFormValues) => {
    try {
      setApiError(null)
      setIsSubmitting(true)
      await signup(data)
      toast({
        title: 'Account created successfully',
        description: 'Now complete your business onboarding profile.',
      })
      router.push('/onboarding')
    } catch (err: any) {
      let msg = err.message || 'Registration failed'
      if (msg.includes('user_already_exists') || msg.toLowerCase().includes('already exists')) {
        msg = 'An account with this email address already exists.'
      }
      setApiError(msg)
      toast({
        variant: 'destructive',
        title: 'Registration Error',
        description: msg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up Inventory Lite for your business."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        {apiError && (
          <div className="flex items-center gap-2 p-3.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-bold text-slate-700">
            Full Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="name"
              type="text"
              placeholder="Ram Sharma"
              className="pl-9 h-11 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-indigo-600 focus:ring-indigo-600"
              {...register('name')}
            />
          </div>
          {errors.name && (
            <p className="text-xs text-red-600 font-medium">{errors.name.message}</p>
          )}
        </div>

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
          <Label htmlFor="password" className="text-xs font-bold text-slate-700">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              className="pl-9 pr-10 h-11 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-sm focus:border-indigo-600 focus:ring-indigo-600"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-600 font-medium">{errors.password.message}</p>
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
              Creating account...
            </>
          ) : (
            <>
              Create Account <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <div className="pt-4 text-center text-xs text-slate-600 border-t border-slate-200">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}
