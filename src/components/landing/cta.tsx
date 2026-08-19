"use client"

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function LandingCTA() {
  return (
    <section className="py-16 sm:py-24 bg-indigo-900 text-white text-left">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Spend less time managing records.
          </h2>
          <p className="text-base text-indigo-200">
            Start using Inventory Lite for free today.
          </p>
        </div>

        <div className="shrink-0">
          <Button
            asChild
            size="lg"
            className="h-12 px-8 bg-white hover:bg-slate-100 text-indigo-950 font-bold shadow-md text-base"
          >
            <Link href="/auth/signup">
              Start Free <ArrowRight className="ml-2 h-5 w-5 text-indigo-900" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
