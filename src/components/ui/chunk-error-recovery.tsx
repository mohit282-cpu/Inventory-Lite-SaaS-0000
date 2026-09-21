'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

const CHUNK_RELOAD_KEY = 'inventory_lite_chunk_reload_ts'
const RELOAD_COOLDOWN_MS = 10000 // 10s cooldown to prevent infinite reload loops

export function ChunkErrorRecovery() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    function isChunkError(err: any): boolean {
      if (!err) return false
      const message = typeof err === 'string' ? err : err.message || err.name || String(err)
      return (
        message.includes('ChunkLoadError') ||
        message.includes('Loading chunk') ||
        message.includes('failed to load script') ||
        message.includes('Failed to fetch dynamically imported module')
      )
    }

    function handleChunkFailure(error: any) {
      if (!isChunkError(error)) return

      const correlationId = logger.error('Chunk loading failure detected', error, {
        category: 'CHUNK_LOAD',
      })

      const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0')
      const now = Date.now()

      if (now - lastReload > RELOAD_COOLDOWN_MS) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
        logger.warn('Triggering automatic chunk reload recovery', { correlationId })
        window.location.reload()
      } else {
        logger.warn('Chunk reload suppressed due to recent reload cooldown', { correlationId })
      }
    }

    const handleError = (event: ErrorEvent) => {
      if (isChunkError(event.error) || isChunkError(event.message)) {
        handleChunkFailure(event.error || event.message)
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason)) {
        handleChunkFailure(event.reason)
      }
    }

    window.addEventListener('error', handleError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true)

    return () => {
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
    }
  }, [])

  return null
}
