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

interface NavGroup {
  label: string
  items: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[]
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    label: 'Core',
    items: [
      { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
      { name: 'Products', href: '/app/products', icon: Package },
      { name: 'Categories', href: '/app/categories', icon: FolderTree },
      { name: 'Stock', href: '/app/stock', icon: Boxes },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { name: 'Customers', href: '/app/customers', icon: Users },
      { name: 'Sales', href: '/app/sales', icon: ShoppingCart },
      { name: 'Invoices', href: '/app/invoices', icon: FileText },
      { name: 'Expenses', href: '/app/expenses', icon: Receipt },
    ],
  },
  {
    label: 'Business',
    items: [
      { name: 'Reports', href: '/app/reports', icon: BarChart3 },
      { name: 'Settings', href: '/app/settings', icon: Settings },
    ],
  },
]

// Flat export for MobileNav
export const NAVIGATION_ITEMS = NAVIGATION_GROUPS.flatMap((g) => g.items)

export { NAVIGATION_GROUPS }

export function Sidebar() {
  const pathname = usePathname()
  const { activeBusiness, memberships, switchActiveBusiness } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const currentRole = memberships.find(m => m.businessId === activeBusiness?.$id)?.role || 'owner'

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-800 bg-slate-900 transition-all duration-200 relative shrink-0 ${
        isCollapsed ? 'w-[72px]' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-slate-800/60">
        <Link href="/app/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <Store className="h-4.5 w-4.5" />
          </div>
          {!isCollapsed && (
            <span className="text-[15px] font-semibold text-white tracking-tight whitespace-nowrap">
              Inventory<span className="text-indigo-400 ml-0.5">Lite</span>
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Business Context Switcher */}
      <div className="px-3 py-2.5 border-b border-slate-800/60">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`w-full flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors text-left ${
                isCollapsed ? 'justify-center px-0' : ''
              }`}
            >
              <div className="h-7 w-7 rounded-md bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <Building className="h-3.5 w-3.5" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-white truncate leading-tight">
                    {activeBusiness?.name || 'My Business'}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize leading-tight">
                    {currentRole} · {activeBusiness?.currency || 'NPR'}
                  </div>
                </div>
              )}
              {!isCollapsed && <ChevronsUpDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-slate-900 border-slate-800 text-slate-100">
            <DropdownMenuLabel className="text-xs text-slate-400">Switch Business</DropdownMenuLabel>
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
                <Plus className="mr-2 h-4 w-4" /> Add Business
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin space-y-4">
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.label}>
            {!isCollapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/app/dashboard' && pathname.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-slate-800/60">
          <div className="text-[10px] text-slate-600">Inventory Lite v1.0</div>
        </div>
      )}
    </aside>
  )
}
