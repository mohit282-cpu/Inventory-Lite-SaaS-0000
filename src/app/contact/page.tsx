"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { AppLogo } from '@/components/ui/app-logo'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Mail, Phone, MapPin, Clock, MessageSquare, Loader2, CheckCircle2, AlertCircle, Play } from 'lucide-react'
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon'

const WHATSAPP_URL = "https://wa.me/9779805330808?text=Hello%2C%20I%27m%20interested%20in%20Inventory%20Lite%20for%20my%20business.%20I%20would%20like%20to%20know%20more%20about%20the%20software%20and%20how%20I%20can%20get%20an%20account."

export default function ContactPage() {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }

    if (!phone.trim() || phone.trim().length < 7) {
      setError('Please enter a valid phone number or email (at least 7 characters).')
      return
    }

    if (!message.trim() || message.trim().length < 5) {
      setError('Please enter your message (at least 5 characters).')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
          message: message.trim(),
          website,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit inquiry.')
      }

      setIsSuccess(true)
      toast({
        title: 'Support Request Sent!',
        description: 'Thank you for reaching out. Our support team will get back to you shortly.',
      })
    } catch (err: any) {
      setError(err?.message || 'Failed to submit inquiry. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={32} />
          </Link>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold" asChild>
              <Link href="/demo">
                <Play className="mr-1.5 h-3.5 w-3.5 fill-current" /> Try Interactive Demo
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="space-y-3 border-b border-slate-200 pb-6">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            Support & Help Desk
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Contact Inventory Lite
          </h1>
          <p className="text-base text-slate-600">
            We are here to help your shop set up digital inventory and POS billing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* WhatsApp - Primary Channel */}
            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
              <h3 className="text-base font-bold text-emerald-900">WhatsApp — Fastest Way to Reach Us</h3>
              <p className="text-sm text-emerald-800 leading-relaxed">
                Get instant support, ask questions, or request your Inventory Lite account setup.
              </p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl shadow-md transition-colors text-sm min-h-[48px]"
              >
                <WhatsAppIcon className="h-5 w-5 shrink-0" />
                Chat on WhatsApp
              </a>
              <p className="text-xs text-emerald-700 font-mono">+977 9805330808</p>
            </div>

            {/* Other Contact Channels */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Other Contact Channels</h3>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900">Email</span>
                    <a href="mailto:support@inventorylite.app" className="text-indigo-600 hover:underline">support@inventorylite.app</a>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900">Phone & Viber</span>
                    <span className="text-slate-600">+977 9805330808</span>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900">Office Location</span>
                    <span className="text-slate-600">Kathmandu, Nepal</span>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900">Operating Hours</span>
                    <span className="text-slate-600">Sun – Fri: 9:00 AM – 6:00 PM (NPT)</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Send Us a Message</h3>

            {isSuccess ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-slate-900 text-base">Inquiry Submitted!</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Thank you, <strong>{name}</strong>. Our support team has received your message and will reach out to <strong>{phone}</strong> soon.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsSuccess(false)
                    setName('')
                    setPhone('')
                    setBusinessName('')
                    setMessage('')
                  }}
                  className="text-xs mt-2"
                >
                  Send Another Inquiry
                </Button>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={handleSubmit} noValidate>
                {error && (
                  <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Honeypot */}
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />

                <div>
                  <label htmlFor="contact-name" className="block text-xs font-bold text-slate-700 mb-1">
                    Your Name <span className="text-rose-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    aria-required="true"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="contact-business" className="block text-xs font-bold text-slate-700 mb-1">
                    Shop / Business Name
                  </label>
                  <input
                    id="contact-business"
                    type="text"
                    placeholder="Your shop name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number or Email <span className="text-rose-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="contact-phone"
                    type="text"
                    placeholder="98XXXXXXXX or you@example.com"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    aria-required="true"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-xs font-bold text-slate-700 mb-1">
                    Message <span className="text-rose-500" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    rows={3}
                    placeholder="How can we help your business?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    aria-required="true"
                    className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    'Send Support Request'
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
