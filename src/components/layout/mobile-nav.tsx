"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAVIGATION_GROUPS } from '@/components/layout/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { Store, X, LogOut } from 'lucide-react'

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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative max-w-[280px] w-full bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10 animate-slide-in-right">
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800/60">
          <Link href="/app/dashboard" onClick={onClose} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Store className="h-4.5 w-4.5" />
            </div>
            <span className="text-[15px] font-semibold text-white">
              Inventory<span className="text-indigo-400 ml-0.5">Lite</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Business Context */}
        <div className="px-4 py-3 border-b border-slate-800/60">
          <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="font-medium text-white text-xs">{activeBusiness?.name || 'My Business'}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Currency: {activeBusiness?.currency || 'NPR'}
            </div>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin space-y-4">
          {NAVIGATION_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/app/dashboard' && pathname.startsWith(item.href))
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[13px] font-medium transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-400 font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-slate-800/60">
          <button
            type="button"
            onClick={() => {
              onClose()
              logout()
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-800/50 text-red-400 hover:bg-red-950/40 text-sm font-medium transition-colors min-h-[44px]"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
