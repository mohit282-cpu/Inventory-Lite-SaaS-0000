'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [correlationId, setCorrelationId] = useState<string>('')

  useEffect(() => {
    const id = logger.error('Dashboard view error boundary caught error', error, {
      category: 'RUNTIME',
      digest: error.digest,
    })
    setCorrelationId(id)
  }, [error])

  return (
    <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xs max-w-lg mx-auto text-center space-y-4 my-8">
      <div className="h-12 w-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
        <AlertTriangle className="h-6 w-6" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900">
          Unable to load dashboard module
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          A temporary error occurred while fetching your inventory or financial data. Please try reloading this section.
        </p>
      </div>

      {correlationId && (
        <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 inline-block">
          Error Ref: {correlationId}
        </div>
      )}

      <div className="flex justify-center gap-3 pt-2">
        <Button onClick={() => reset()} className="h-9 px-4 bg-indigo-600 text-white text-xs font-bold gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Retry Section
        </Button>
        <Button variant="outline" asChild className="h-9 px-4 text-xs font-bold border-slate-300">
          <Link href="/app/dashboard">
            <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> Dashboard Main
          </Link>
        </Button>
      </div>
    </div>
  )
}
