'use client'

import { useEffect } from 'react'

export function SWRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Listen for service worker updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Trigger custom update notification event
                    window.dispatchEvent(new CustomEvent('pwa-update-available'))
                  }
                }
              }
            }
          })
          .catch((error) => {
            console.warn('PWA ServiceWorker registration notice:', error)
          })
      })
    }
  }, [])

  return null
}
