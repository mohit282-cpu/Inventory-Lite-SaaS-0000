"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Mail, CheckCircle2, AlertCircle } from 'lucide-react'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export function NewsletterForm() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setEmail(val)
    if (validationError) {
      setValidationError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setValidationError('Please enter your email address')
      return
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setValidationError('Please enter a valid email address (e.g. name@company.com)')
      return
    }

    try {
      setIsSubmitting(true)
      setValidationError(null)

      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to subscribe')
      }

      setIsSuccess(true)
      setEmail('')
      toast({
        title: 'Subscribed Successfully!',
        description: 'Thank you for joining our product update list.',
      })
    } catch (err: any) {
      const msg = err.message || 'Subscription failed. Please try again.'
      setValidationError(msg)
      toast({
        variant: 'destructive',
        title: 'Subscription Failed',
        description: msg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-3">
      {isSuccess ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="font-bold text-white">You are on the list!</p>
            <p className="text-xs text-emerald-300">We will notify you with major product updates and features.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} method="POST" className="space-y-2">
          <label htmlFor="newsletter-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Subscribe for Product Updates
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                id="newsletter-email"
                type="email"
                placeholder="your.email@business.com"
                value={email}
                onChange={handleEmailChange}
                disabled={isSubmitting}
                className="pl-10 h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 text-sm focus:border-indigo-500 focus:ring-indigo-500 rounded-xl"
                aria-invalid={!!validationError}
                aria-describedby={validationError ? 'newsletter-error' : undefined}
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all rounded-xl shrink-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subscribing...
                </>
              ) : (
                'Subscribe'
              )}
            </Button>
          </div>

          {validationError && (
            <p id="newsletter-error" className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold pt-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{validationError}</span>
            </p>
          )}
        </form>
      )}
    </div>
  )
}
