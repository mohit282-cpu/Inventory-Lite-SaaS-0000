"use client"

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAVIGATION_GROUPS, NAVIGATION_ITEMS, canRoleAccessRoute } from '@/components/layout/sidebar'
import { isRouteActive } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { X, LogOut, Building } from 'lucide-react'
import { InstallAppButton } from '@/components/pwa/install-prompt'
import { AppLogo } from '@/components/ui/app-logo'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const { activeBusiness, memberships, logout } = useAuth()
  const currentRole = memberships?.find((m) => m.businessId === activeBusiness?.$id)?.role || 'owner'

  useEffect(() => {
    if (!isOpen) return

    // 1. Lock Body Scroll
    const originalStyle = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // 2. Escape Key Listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalStyle
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation menu drawer"
      className="fixed inset-0 z-50 md:hidden flex animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Content */}
      <div className="relative max-w-[280px] w-full bg-white border-r border-slate-200 flex flex-col h-full z-10 shadow-2xl text-slate-900 animate-slide-in-right">
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <Link href="/app/dashboard" onClick={onClose} className="flex items-center gap-2">
            <AppLogo size={30} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu drawer"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Business Context */}
        <div className="px-4 py-2.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="h-7 w-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              <Building className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-900 text-xs truncate leading-tight">
                {activeBusiness?.name || 'My Store'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium capitalize truncate leading-tight mt-0.5">
                {currentRole} · {activeBusiness?.currency || 'NPR'}
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav
          aria-label="Mobile Navigation"
          className="flex-1 min-h-0 px-3 py-2.5 overflow-y-auto scrollbar-thin space-y-3"
        >
          {NAVIGATION_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => canRoleAccessRoute(currentRole, item))
            if (visibleItems.length === 0) return null

            return (
              <div key={group.label} className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const currentPath = pathname || ''
                    const allNavHrefs = NAVIGATION_ITEMS.map((n) => n.href)
                    const isActive = isRouteActive(item.href, currentPath, allNavHrefs)
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors min-h-[44px] ${
                          isActive
                            ? 'bg-indigo-50/90 text-indigo-700 font-bold border-l-[3px] border-indigo-600 pl-[7px]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 ${
                            isActive ? 'text-indigo-600' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate leading-none">{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-slate-200 shrink-0 space-y-2 bg-slate-50/50">
          <div className="px-1 text-[10px] text-slate-400 font-medium">
            Inventory Lite v0.1.0 · SaaS
          </div>
          <InstallAppButton className="w-full justify-center h-10 py-2" />

          <button
            type="button"
            onClick={() => {
              onClose()
              logout()
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-colors min-h-[40px] border border-red-200"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
