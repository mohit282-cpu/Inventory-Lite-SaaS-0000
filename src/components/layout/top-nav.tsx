"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { LogOut, Settings, ChevronDown, Menu } from 'lucide-react'
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
    <header className="h-14 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 text-slate-900">
      <div className="flex items-center gap-3">
        {/* Mobile Nav Toggle */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Page Context Breadcrumb / Title */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="hidden sm:inline">Portal</span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="text-sm font-bold text-slate-900">{pageTitle}</span>
        </div>
      </div>

      {/* Right User Profile Dropdown */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none border border-transparent hover:border-slate-200"
            >
              <div className="h-7 w-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {userProfile?.name || user?.name || 'User'}
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                  {user?.email}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 text-slate-900 shadow-md">
            <DropdownMenuLabel className="pb-1">
              <div className="font-bold text-slate-900 text-xs">{userProfile?.name || user?.name}</div>
              <div className="text-[10px] text-slate-500 font-normal">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem asChild>
              <Link href="/app/settings" className="cursor-pointer text-xs">
                <Settings className="mr-2 h-4 w-4 text-slate-500" /> Business & User Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer text-xs font-semibold"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
