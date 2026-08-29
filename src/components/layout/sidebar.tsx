"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { AppLogo } from '@/components/ui/app-logo'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  Users,
  ShoppingCart,
  Wallet,
  Receipt,
  Calendar as CalendarIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building,
  Truck,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react'

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
      { name: 'Suppliers', href: '/app/suppliers', icon: Truck },
      { name: 'Purchases', href: '/app/purchases', icon: ShoppingBag },
      { name: 'Credit / Udha', href: '/app/credit', icon: Wallet },
      { name: 'Expenses', href: '/app/expenses', icon: Receipt },
    ],
  },
  {
    label: 'Business',
    items: [
      { name: 'Audit & Compliance', href: '/app/audit', icon: ShieldCheck },
      { name: 'Calendar', href: '/app/calendar', icon: CalendarIcon },
      { name: 'Settings', href: '/app/settings', icon: Settings },
    ],
  },
]

export const NAVIGATION_ITEMS = NAVIGATION_GROUPS.flatMap((g) => g.items)

export { NAVIGATION_GROUPS }

export function Sidebar() {
  const pathname = usePathname()
  const { activeBusiness, memberships } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const currentRole = memberships.find((m) => m.businessId === activeBusiness?.$id)?.role || 'owner'

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-slate-200 bg-white transition-all duration-200 relative shrink-0 text-slate-700 ${
        isCollapsed ? 'w-[72px]' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-slate-200">
        <Link href="/app/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <AppLogo iconOnly={isCollapsed} size={32} />
        </Link>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Business Display */}
      <div className="px-3 py-2.5 border-b border-slate-200">
        <div
          className={`w-full flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 ${
            isCollapsed ? 'justify-center px-0' : ''
          }`}
        >
          <div className="h-7 w-7 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
            <Building className="h-3.5 w-3.5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                {activeBusiness?.name || 'My Store'}
              </div>
              <div className="text-[10px] text-slate-500 capitalize leading-tight">
                {currentRole} · {activeBusiness?.currency || 'NPR'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto scrollbar-thin space-y-4">
        {NAVIGATION_GROUPS.map((group) => (
          <div key={group.label}>
            {!isCollapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const currentPath = pathname || ''
                const isActive = currentPath === item.href || (item.href !== '/app/dashboard' && currentPath.startsWith(item.href))
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-bold border-l-2 border-indigo-600'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    } ${isCollapsed ? 'justify-center px-0 border-l-0' : ''}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Bottom Footer */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-slate-200 text-[11px] text-slate-400">
          Inventory Lite v1.0 • NPR 0 Free
        </div>
      )}
    </aside>
  )
}
