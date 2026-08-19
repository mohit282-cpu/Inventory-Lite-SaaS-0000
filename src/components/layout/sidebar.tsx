"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
  Store,
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  Users,
  ShoppingCart,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Building,
  Check,
  Plus,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/app/products', icon: Package },
  { name: 'Categories', href: '/app/categories', icon: FolderTree },
  { name: 'Stock Movements', href: '/app/stock', icon: Boxes },
  { name: 'Customers', href: '/app/customers', icon: Users },
  { name: 'Sales', href: '/app/sales', icon: ShoppingCart },
  { name: 'Invoices', href: '/app/invoices', icon: FileText },
  { name: 'Expenses', href: '/app/expenses', icon: Receipt },
  { name: 'Reports', href: '/app/reports', icon: BarChart3 },
  { name: 'Settings', href: '/app/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { activeBusiness, memberships, switchActiveBusiness } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const currentRole = memberships.find(m => m.businessId === activeBusiness?.$id)?.role || 'owner'

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-800 bg-slate-900/90 backdrop-blur-xl transition-all duration-300 relative shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
        <Link href="/app/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-500/20">
            <Store className="h-6 w-6" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-white tracking-tight whitespace-nowrap">
              Inventory <span className="text-indigo-400">Lite</span>
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Business Context Switcher */}
      <div className="p-3 border-b border-slate-800/80">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`w-full flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors text-left ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                  <Building className="h-4 w-4" />
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {activeBusiness?.name || 'My Business'}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {currentRole} • {activeBusiness?.currency || 'NPR'}
                    </div>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronsUpDown className="h-4 w-4 text-slate-400 shrink-0 ml-1" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-slate-900 border-slate-800 text-slate-100">
            <DropdownMenuLabel>Switch Business Context</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-800" />
            {memberships.map((m) => {
              const isSelected = m.businessId === activeBusiness?.$id
              return (
                <DropdownMenuItem
                  key={m.$id}
                  onClick={() => switchActiveBusiness(m.businessId)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{m.businessId}</span>
                  {isSelected && <Check className="h-4 w-4 text-indigo-400" />}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem asChild>
              <Link href="/onboarding" className="flex items-center text-indigo-400 cursor-pointer">
                <Plus className="mr-2 h-4 w-4" /> Add New Business
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/app/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
