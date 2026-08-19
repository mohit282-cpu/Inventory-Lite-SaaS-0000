"use client"

import React from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import {
  Bell,
  LogOut,
  Building,
  Settings,
  ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface TopNavProps {
  onOpenMobileNav?: () => void
}

export function TopNav({ onOpenMobileNav }: TopNavProps) {
  const { user, userProfile, activeBusiness, memberships, logout } = useAuth()
  const currentRole = memberships.find((m) => m.businessId === activeBusiness?.$id)?.role || 'owner'

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile Nav Toggle */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label="Open navigation menu"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Current Active Business Indicator */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
            <Building className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">
              {activeBusiness?.name || 'Inventory Lite'}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span className="capitalize text-indigo-400 font-medium">{currentRole}</span>
              <span>•</span>
              <span>{activeBusiness?.currency || 'NPR'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications Popover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white relative"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-900" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-slate-900 border-slate-800 text-slate-100 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <span className="text-xs font-bold text-white">Notifications</span>
              <span className="text-[10px] text-indigo-400 font-medium">All caught up</span>
            </div>
            <div className="text-xs text-slate-400 text-center py-4">
              No new stock alerts or business notifications.
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 transition-colors focus:outline-none"
            >
              <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-indigo-600/30">
                {userProfile?.name?.charAt(0).toUpperCase() || user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-white leading-tight">
                  {userProfile?.name || user?.name || 'User'}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {user?.email}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-100">
            <DropdownMenuLabel>
              <div className="font-bold text-white">{userProfile?.name || user?.name}</div>
              <div className="text-xs text-slate-400 font-normal">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem asChild>
              <Link href="/app/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" /> Account Settings
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
