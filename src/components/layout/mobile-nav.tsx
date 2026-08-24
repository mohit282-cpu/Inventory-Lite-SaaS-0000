"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAVIGATION_GROUPS } from '@/components/layout/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { X, LogOut } from 'lucide-react'
import { InstallAppButton } from '@/components/pwa/install-prompt'
import { AppLogo } from '@/components/ui/app-logo'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const { activeBusiness, logout } = useAuth()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative max-w-[280px] w-full bg-white border-r border-slate-200 flex flex-col h-full z-10 shadow-xl text-slate-900">
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
          <Link href="/app/dashboard" onClick={onClose} className="flex items-center gap-2">
            <AppLogo size={32} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu drawer"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Business Context */}
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900 text-xs">{activeBusiness?.name || 'Hostiva Store'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Currency: {activeBusiness?.currency || 'NPR'}
            </div>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin space-y-4">
          {NAVIGATION_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-2 mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const currentPath = pathname || ''
                  const isActive = currentPath === item.href || (item.href !== '/app/dashboard' && currentPath.startsWith(item.href))
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-bold border-l-2 border-indigo-600'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-slate-200 space-y-2">
          <InstallAppButton className="w-full justify-center h-10 py-2" />

          <button
            type="button"
            onClick={() => {
              onClose()
              logout()
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-bold transition-colors min-h-[44px] border border-red-200"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
