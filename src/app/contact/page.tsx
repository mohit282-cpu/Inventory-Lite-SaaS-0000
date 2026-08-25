"use client"

import React from 'react'
import Link from 'next/link'
import { AppLogo } from '@/components/ui/app-logo'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Phone, MapPin, Clock, MessageSquare } from 'lucide-react'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={32} />
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Link>
          </Button>
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
            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Direct Support Channels</h3>
              <ul className="space-y-4 text-sm text-slate-700">
                <li className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900">Email Support</span>
                    <span className="text-slate-600">support@inventorylite.app</span>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-900">Phone & Viber/WhatsApp</span>
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
            <h3 className="text-lg font-bold text-slate-900">Quick Inquiry</h3>
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  placeholder="Ram Sharma"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shop / Business Name</label>
                <input
                  type="text"
                  placeholder="Sharma Traders & Kirana"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="9800000000"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
                <textarea
                  rows={3}
                  placeholder="How can we help your business?"
                  className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <Button type="button" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm">
                Send Support Request
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
