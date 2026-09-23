'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function getModuleTitle(pathname: string): string {
  if (!pathname) return 'Unable to load page'
  if (pathname.includes('/sales/new')) return 'Unable to load Sales Terminal'
  if (pathname.includes('/sales')) return 'Unable to load Sales Module'
  if (pathname.includes('/products')) return 'Unable to load Products Module'
  if (pathname.includes('/customers')) return 'Unable to load Customers Module'
  if (pathname.includes('/purchases')) return 'Unable to load Purchases Module'
  if (pathname.includes('/suppliers')) return 'Unable to load Suppliers Module'
  if (pathname.includes('/credit')) return 'Unable to load Credit / Udhar Module'
  if (pathname.includes('/expenses')) return 'Unable to load Expenses Module'
  if (pathname.includes('/stock')) return 'Unable to load Inventory Stock Module'
  if (pathname.includes('/audit')) return 'Unable to load Audit & Compliance Module'
  if (pathname.includes('/settings')) return 'Unable to load Settings Module'
  return 'Unable to load page'
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [correlationId, setCorrelationId] = useState<string>('')
  const [currentPath, setCurrentPath] = useState<string>('')

  useEffect(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : ''
    setCurrentPath(path)

    const id = logger.error('Application view error boundary caught error', error, {
      category: 'RUNTIME',
      digest: error.digest,
      path,
    })
    setCorrelationId(id)
  }, [error])

  const moduleTitle = getModuleTitle(currentPath)

  return (
    <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xs max-w-lg mx-auto text-center space-y-4 my-8">
      <div className="h-12 w-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
        <AlertTriangle className="h-6 w-6" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {moduleTitle}
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          An unexpected error occurred while processing your request. Please try reloading this section or return to the main dashboard.
        </p>
      </div>

      {correlationId && (
        <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 inline-block">
          Error Ref: {correlationId}
        </div>
      )}

      <div className="flex justify-center gap-3 pt-2">
        <Button onClick={() => reset()} className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Retry Page
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
