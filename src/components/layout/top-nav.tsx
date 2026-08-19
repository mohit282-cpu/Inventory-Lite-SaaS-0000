"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
  LogOut,
  Settings,
  ChevronDown,
  Menu,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopNavProps {
  onOpenMobileNav?: () => void
}

// Derive a readable page title from the pathname
function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (!last || last === 'app') return 'Dashboard'
  if (last === 'new') {
    const parent = segments[segments.length - 2]
    return `New ${parent ? parent.charAt(0).toUpperCase() + parent.slice(1, -1) : ''}`
  }
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ')
}

export function TopNav({ onOpenMobileNav }: TopNavProps) {
  const { user, userProfile, logout } = useAuth()
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  const initials =
    userProfile?.name?.charAt(0).toUpperCase() ||
    user?.name?.charAt(0).toUpperCase() ||
    'U'

  return (
    <header className="h-14 border-b border-slate-800/60 bg-slate-900/95 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile Nav Toggle */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Current Page Title — visible on mobile */}
        <span className="text-sm font-medium text-slate-300 md:hidden">
          {pageTitle}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none"
            >
              <div className="h-7 w-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-semibold text-xs">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium text-white leading-tight">
                  {userProfile?.name || user?.name || 'User'}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {user?.email}
                </div>
              </div>
              <ChevronDown className="h-3 w-3 text-slate-500 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-slate-900 border-slate-800 text-slate-100">
            <DropdownMenuLabel className="pb-1">
              <div className="font-medium text-white text-sm">{userProfile?.name || user?.name}</div>
              <div className="text-[11px] text-slate-400 font-normal">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem asChild>
              <Link href="/app/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-red-400 focus:text-red-400 focus:bg-red-950/40 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
