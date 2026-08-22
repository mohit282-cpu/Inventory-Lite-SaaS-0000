"use client"

import React, { useState, useEffect } from 'react'
import { RouteGuard } from '@/components/auth/route-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { TopNav } from '@/components/layout/top-nav'
import { MobileNav } from '@/components/layout/mobile-nav'
import { MobileBottomBar } from '@/components/layout/mobile-bottom-bar'
import { WifiOff } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <RouteGuard requireBusiness={true}>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100/70 text-slate-900 font-sans antialiased">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Navigation Drawer */}
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden pb-16 md:pb-0">
          {/* Top Bar */}
          <TopNav onOpenMobileNav={() => setMobileNavOpen(true)} />

          {/* Non-Blocking Offline Notification Banner */}
          {!isOnline && (
            <div className="bg-amber-500 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 shrink-0" />
                <span>You&apos;re offline. Inventory Lite is running in offline mode. Changes will sync automatically when back online.</span>
              </div>
              <span className="bg-amber-600/90 px-2 py-0.5 rounded text-[10px] tracking-wide uppercase font-extrabold hidden sm:inline-block">
                Offline Mode
              </span>
            </div>
          )}

          {/* Responsive Page Viewport */}
          <main className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12 md:pb-0">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation Bar */}
          <MobileBottomBar onOpenMore={() => setMobileNavOpen(true)} />
        </div>
      </div>
    </RouteGuard>
  )
}
