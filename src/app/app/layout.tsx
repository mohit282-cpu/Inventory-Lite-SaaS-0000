"use client"

import React, { useState } from 'react'
import { RouteGuard } from '@/components/auth/route-guard'
import { Sidebar } from '@/components/layout/sidebar'
import { TopNav } from '@/components/layout/top-nav'
import { MobileNav } from '@/components/layout/mobile-nav'
import { MobileBottomBar } from '@/components/layout/mobile-bottom-bar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
