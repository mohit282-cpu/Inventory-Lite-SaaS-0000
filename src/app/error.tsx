'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [correlationId, setCorrelationId] = useState<string>('')

  useEffect(() => {
    const id = logger.error('Uncaught error caught by App level error boundary', error, {
      category: 'RUNTIME',
      digest: error.digest,
    })
    setCorrelationId(id)
  }, [error])

  const isChunkError =
    error.message?.includes('ChunkLoadError') ||
    error.message?.includes('Loading chunk') ||
    error.name === 'ChunkLoadError'

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50/50">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-5">
        <div className="h-12 w-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isChunkError ? 'Application Update Available' : 'Something went wrong'}
          </h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {isChunkError
              ? 'A new version of Inventory Lite was deployed. Please refresh to load the latest application assets.'
              : 'An error occurred while displaying this page. Your data remains secure.'}
          </p>
        </div>

        {correlationId && (
          <div className="text-[11px] font-mono text-slate-500 bg-slate-100 p-2 rounded-md inline-block">
            Reference ID: {correlationId}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => {
              if (isChunkError) {
                window.location.reload()
              } else {
                reset()
              }
            }}
            className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-2"
          >
            <RefreshCw className="h-4 w-4" /> {isChunkError ? 'Reload Page' : 'Try Again'}
          </Button>

          <Button
            variant="outline"
            onClick={() => { window.location.href = '/app/dashboard' }}
            className="h-10 px-5 border-slate-300 text-slate-900 font-bold text-xs gap-2"
          >
            <Home className="h-4 w-4" /> Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
