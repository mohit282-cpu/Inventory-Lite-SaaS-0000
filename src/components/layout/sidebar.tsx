"use client"

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isRouteActive } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { AppLogo } from '@/components/ui/app-logo'
import { UserRole } from '@/types'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  Users,
  ShoppingCart,
  Wallet,
  Receipt,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  // Building, Truck, ShoppingBag, ShieldCheck, ChevronsUpDown, Check are used in JSX below
  // @ts-ignore
  Building,
  // @ts-ignore
  Truck,
  // @ts-ignore
  ShoppingBag,
  // @ts-ignore
  ShieldCheck,
  // @ts-ignore
  ChevronsUpDown,
  // @ts-ignore
  Check,
} from 'lucide-react'
// @ts-ignore
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  allowedRoles?: UserRole[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
  defaultOpen?: boolean
}

export const NAVIGATION_GROUPS: NavGroup[] = [
  {
    label: 'WORKSPACE',
    items: [
      { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'SALES',
    items: [
      { name: 'POS Terminal', href: '/app/sales/new', icon: ShoppingCart },
      { name: 'Sales & Invoices', href: '/app/sales', icon: Receipt },
      { name: 'Customers', href: '/app/customers', icon: Users },
      { name: 'Receivables / Udhar', href: '/app/credit', icon: Wallet },
    ],
  },
  {
    label: 'PURCHASING',
    items: [
      { name: 'Purchases', href: '/app/purchases', icon: ShoppingBag, allowedRoles: ['owner', 'admin', 'auditor'] },
      { name: 'Suppliers', href: '/app/suppliers', icon: Truck, allowedRoles: ['owner', 'admin', 'auditor'] },
    ],
  },
  {
    label: 'INVENTORY',
    items: [
      { name: 'Products', href: '/app/products', icon: Package },
      { name: 'Categories', href: '/app/categories', icon: FolderTree },
      { name: 'Stock Management', href: '/app/stock', icon: Boxes },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { name: 'Expenses', href: '/app/expenses', icon: Receipt, allowedRoles: ['owner', 'admin', 'auditor'] },
      { name: 'Tax Invoices', href: '/app/invoices', icon: FileText },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { name: 'Audit & Compliance', href: '/app/audit', icon: ShieldCheck, allowedRoles: ['owner', 'admin', 'auditor'] },
      { name: 'Settings', href: '/app/settings', icon: Settings, allowedRoles: ['owner', 'admin'] },
    ],
  },
]

export const NAVIGATION_ITEMS = NAVIGATION_GROUPS.flatMap((g) => g.items)

/**
 * Checks if a specific role is authorized to view a navigation link.
 * Defaults to true if no role restrictions are defined on the item.
 */
export function canRoleAccessRoute(role: string | undefined, item: NavItem): boolean {
  if (!item.allowedRoles || item.allowedRoles.length === 0) return true
  if (!role) return true
  return item.allowedRoles.includes(role as UserRole)
}

/**
 * Ensures the active navigation group remains open so the current route
 * is never hidden when the sidebar is collapsed.
 */
  const pathname = usePathname()
  // @ts-ignore
  const { activeBusiness, memberships, switchBusiness } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const currentRole = (
    memberships.find((m) => m.businessId === activeBusiness?.$id)?.role || 'owner'
  ) as UserRole
  const currentPath = pathname || ''
  const allNavHrefs = useMemo(() => NAVIGATION_ITEMS.map((n) => n.href), [])

  // Keep the group containing the active route open automatically
  const activeGroup = NAVIGATION_GROUPS.find((g) =>
    g.items.some((item) => isRouteActive(item.href, currentPath, allNavHrefs))
  )
  const keepGroupOpen = activeGroup?.label
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  // Initialize: keep the active group open so the current route is never hidden
  useEffect(() => {
    const activeGroup = NAVIGATION_GROUPS.find((g) =>
      g.items.some((item) => isRouteActive(item.href, currentPath, allNavHrefs))
    )
    if (activeGroup) {
      setCollapsedGroups((prev) => ({
        ...prev,
        [activeGroup.label]: false,
      }))
    }
  }, [currentPath, allNavHrefs])

  // Initialize: keep the active group open
  useEffect(() => {
    const activeGroup = NAVIGATION_GROUPS.find((g) =>
      g.items.some((item) => isRouteActive(item.href, currentPath, allNavHrefs))
    )
    if (activeGroup) {
      setCollapsedGroups((prev) => ({
        ...prev,
        [activeGroup.label]: false,
      }))
    }
  }, [currentPath, allNavHrefs])

  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }))
  }

  return (
    <aside
      aria-label="Application Sidebar"
      className={`hidden md:flex flex-col min-w-0 w-full max-h-screen bg-white border-r border-slate-200/80 overflow-hidden transition-[width] duration-200 ease-in-out shrink-0 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-[250px]'
      }`}
    >

      {/* === 1. HEADER: Logo & Collapse Button === */}
      <header
        className="h-14 px-3 flex items-center justify-between border-b border-slate-200/80 shrink-0 bg-slate-50"
      >
        <Link
          href="/app/dashboard"
          className="flex items-center gap-2.5 overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
          aria-label="Inventory Lite Dashboard"
        >
          <AppLogo iconOnly={isCollapsed} size={30} />
        </Link>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
          aria-label={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
          title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </header>

      {/* === 2. SCROLLABLE NAVIGATION === */}
      <nav
        aria-label="Main Navigation"
        className="flex-1 min-h-0 overflow-y-auto ps-2.5 pe-2.5 py-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200"
      >
        {NAVIGATION_GROUPS.map((group) => {
          // Filter items based on user role authorization
          const visibleItems = group.items.filter((item) => canRoleAccessRoute(currentRole, item))
          if (visibleItems.length === 0) return null

          const isGroupActive = visibleItems.some((item) => isRouteActive(item.href, currentPath, allNavHrefs))
          // Automatically keep active group open so active route is never hidden
          // collapsedGroups[group.label] = true means the group is manually collapsed
          // keepGroupOpen is the initially-derived active group label
          const isGroupOpen = isGroupActive || keepGroupOpen === group.label || !collapsedGroups[group.label]

          return (
            <div key={group.label} className="space-y-1">
              {/* Group header: always visible, shows toggle only in expanded mode */}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={isGroupOpen}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-600 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600"
              >
                <span className="truncate">{group.label}</span>
                <ChevronDown
                  className={`h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-transform duration-150 ${
                    isGroupOpen ? '' : '-rotate-90'
                  }`}
                />
              </button>

              {/* Navigation Items in Group */}
              {(isGroupOpen || isCollapsed) && (
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = isRouteActive(item.href, currentPath, allNavHrefs)
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1 ${
                          isActive
                            ? 'bg-indigo-50/90 text-indigo-700 font-bold shadow-2xs border-l-[3px] border-indigo-600 pl-[7px]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                        } ${isCollapsed ? 'justify-center px-0 border-l-0 pl-0' : ''}`}
                        title={isCollapsed ? item.name : undefined}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                            isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate leading-none">{item.name}</span>}

                        {/* Floating Tooltip in Collapsed Mode */}
                        {isCollapsed && (
                          <div
                            role="tooltip"
                            className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 flex items-center gap-1.5"
                            aria-label={item.name}
                          >
                            <span>{item.name}</span>
                            <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* === 3. FOOTER: Pinned to bottom, visible only in expanded mode === */}
      {isCollapsed ? (
        /* Collapsed mode: minimal footer with version info */
        <footer
          className="p-2 border-t border-slate-200/80 bg-slate-50/50 shrink-0 flex justify-center group relative"
        >
          <div className="h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
            v0.1
          </div>
          <div
            role="tooltip"
            className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-medium rounded-md whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
          >
            Inventory Lite v0.1.0
          </div>
        </footer>
      ) : (
        /* Expanded mode: full footer with branding and online status */
        <footer
          className="px-3.5 py-2.5 border-t border-slate-200/80 bg-slate-50/50 shrink-0"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-800 truncate">Inventory Lite</div>
              <div className="text-[10px] font-medium text-slate-500 truncate">v0.1.0 · SaaS Production</div>
            </div>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
              Online
            </span>
          </div>
        </footer>
      )}
    )
}
