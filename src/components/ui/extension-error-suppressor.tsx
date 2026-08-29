'use client'

import { useEffect } from 'react'

export function ExtensionErrorSuppressor() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleWindowError = (event: ErrorEvent) => {
      const isExtensionError =
        (event.filename &&
          (event.filename.includes('chrome-extension://') ||
            event.filename.includes('moz-extension://'))) ||
        (event.error?.stack &&
          (event.error.stack.includes('chrome-extension://') ||
            event.error.stack.includes('moz-extension://'))) ||
        (typeof event.message === 'string' &&
          (event.message.includes('chrome-extension://') ||
            event.message.includes('moz-extension://')))

      if (isExtensionError) {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const stack = reason?.stack || String(reason || '')
      if (stack.includes('chrome-extension://') || stack.includes('moz-extension://')) {
        event.stopImmediatePropagation()
        event.preventDefault()
      }
    }

    window.addEventListener('error', handleWindowError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true)

    return () => {
      window.removeEventListener('error', handleWindowError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
    }
  }, [])

  return null
}
