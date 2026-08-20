"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema } from '@/lib/validations'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordValues) => {
    try {
      setIsSubmitting(true)
      await forgotPassword(data.email)
    } catch {
      // Ignore errors silently to avoid exposing whether an email exists
    } finally {
      setIsSuccess(true)
      setIsSubmitting(false)
      toast({
        title: 'Recovery Request Received',
        description: 'If an account exists for this email, you will receive password reset instructions.',
      })
    }
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you instructions to reset your password."
    >
      {isSuccess ? (
        <div className="space-y-4 text-center py-4 animate-fade-in">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            Password recovery link has been sent to your email address if an account exists.
          </p>
          <Button
            asChild
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm mt-4"
          >
            <Link href="/auth/login">Back to Sign In</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
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

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending instructions...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <div className="pt-4 text-center text-xs border-t border-slate-200">
            <Link
              href="/auth/login"
              className="inline-flex items-center text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
