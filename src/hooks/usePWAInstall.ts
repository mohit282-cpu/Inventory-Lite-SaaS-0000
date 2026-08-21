'use client'

import { useState, useEffect } from 'react'

export interface PWAInstallState {
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  promptInstall: () => Promise<boolean>
}

let deferredPrompt: any = null

export function usePWAInstall(): PWAInstallState {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Detect standalone installed mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    setIsInstalled(isStandalone)

    // 2. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // 3. Listen for browser beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      deferredPrompt = null
      setIsInstallable(false)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // If deferredPrompt was already captured globally
    if (deferredPrompt) {
      setIsInstallable(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false

    try {
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
        deferredPrompt = null
        return true
      }
    } catch (err) {
      console.warn('PWA install prompt notice:', err)
    }
    return false
  }

  return {
    isInstallable,
    isInstalled,
    isIOS,
    promptInstall,
  }
}
