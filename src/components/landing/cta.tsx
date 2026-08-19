"use client"

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function LandingCTA() {
  return (
    <section className="py-16 sm:py-24 border-b border-slate-800/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-indigo-950/40 p-8 sm:p-14 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to simplify your inventory?
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Start managing your products, sales, and customers in one place.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 relative z-10">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 text-base"
            >
              <Link href="/auth/signup">
                Start Free <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12 px-7 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-base"
            >
              <a href="#pricing">View Pricing</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
