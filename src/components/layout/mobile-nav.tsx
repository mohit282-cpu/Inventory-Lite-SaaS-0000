"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAVIGATION_ITEMS } from '@/components/layout/sidebar'
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
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative flex-1 max-w-xs w-full bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10 p-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <Link href="/app/dashboard" onClick={onClose} className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <Store className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-white">
              Inventory <span className="text-indigo-400">Lite</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Business Selector */}
        <div className="py-4 border-b border-slate-800">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Active Business
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="font-bold text-white text-sm">{activeBusiness?.name || 'My Business'}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              Currency: {activeBusiness?.currency || 'NPR'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/app/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose()
              logout()
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-red-400 hover:bg-red-950/40 text-sm font-medium transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
