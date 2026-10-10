"use client"

import React, { useState, useMemo } from 'react'
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
  Building,
  Truck,
  ShoppingBag,
  ShieldCheck,
  ChevronsUpDown,
  Check,
} from 'lucide-react'
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

export function Sidebar() {
  const pathname = usePathname()
  const { activeBusiness, memberships, switchBusiness } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const currentRole = (memberships.find((m) => m.businessId === activeBusiness?.$id)?.role || 'owner') as UserRole
  const currentPath = pathname || ''
  const allNavHrefs = useMemo(() => NAVIGATION_ITEMS.map((n) => n.href), [])

  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupLabel]: !prev[groupLabel],
    }))
  }

  return (
    <aside
      aria-label="Application Sidebar"
      className={`hidden md:flex flex-col h-full max-h-screen bg-white border-r border-slate-200/80 transition-[width] duration-200 ease-in-out shrink-0 select-none ${
        isCollapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* 1. Header & Brand Logo */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-slate-200/80 shrink-0">
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
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          aria-label={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
          title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* 2. Business Switcher / Profile Card */}
      <div className="px-3 py-2 border-b border-slate-100 shrink-0">
        {memberships.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Switch active business"
                className={`w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-slate-100 hover:border-slate-300 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/40 group ${
                  isCollapsed ? 'justify-center px-0' : ''
                }`}
              >
                <div className="h-7 w-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <Building className="h-3.5 w-3.5" />
                </div>
                {!isCollapsed && (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                        {activeBusiness?.name || 'My Store'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium capitalize leading-tight truncate mt-0.5">
                        {currentRole} · {activeBusiness?.currency || 'NPR'}
                      </div>
                    </div>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-white border-slate-200 shadow-lg text-slate-900">
              <DropdownMenuLabel className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Switch Business
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              {memberships.map((m) => {
                const isSelected = m.businessId === activeBusiness?.$id
                return (
                  <DropdownMenuItem
                    key={m.businessId}
                    onClick={() => switchBusiness(m.businessId)}
                    className="flex items-center justify-between text-xs cursor-pointer py-2 focus:bg-indigo-50 focus:text-indigo-700"
                  >
                    <span className="font-semibold truncate">
                      {isSelected ? activeBusiness?.name : m.businessId}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0 ml-1.5" />}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div
            className={`w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80 ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title={isCollapsed ? `${activeBusiness?.name || 'My Store'} (${currentRole})` : undefined}
          >
            <div className="h-7 w-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <Building className="h-3.5 w-3.5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {activeBusiness?.name || 'My Store'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium capitalize leading-tight truncate mt-0.5">
                  {currentRole} · {activeBusiness?.currency || 'NPR'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Scrollable Grouped Navigation */}
      <nav
        aria-label="Main Navigation"
        className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200"
      >
        {NAVIGATION_GROUPS.map((group) => {
          // Filter items based on user role authorization
          const visibleItems = group.items.filter((item) => canRoleAccessRoute(currentRole, item))
          if (visibleItems.length === 0) return null

          const isGroupActive = visibleItems.some((item) => isRouteActive(item.href, currentPath, allNavHrefs))
          // Automatically keep active group open so the active route is never hidden
          const isGroupOpen = isGroupActive || !collapsedGroups[group.label]

          return (
            <div key={group.label} className="space-y-1">
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isGroupOpen}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-600 rounded transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-600"
                >
                  <span className="truncate">{group.label}</span>
                  <ChevronDown
                    className={`h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-transform duration-150 ${
                      isGroupOpen ? '' : '-rotate-90'
                    }`}
                  />
                </button>
              ) : (
                <div className="border-t border-slate-200/60 my-2 mx-1" role="separator" />
              )}

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

      {/* 4. Pinned Bottom Footer (Never overlaps navigation) */}
      {!isCollapsed ? (
        <div className="px-3.5 py-2.5 border-t border-slate-200/80 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between text-left">
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-800 truncate">Inventory Lite</div>
              <div className="text-[10px] font-medium text-slate-500 truncate">v0.1.0 · SaaS Production</div>
            </div>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
              Online
            </span>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200/80 bg-slate-50/50 shrink-0 flex justify-center group relative">
          <div className="h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
            v0.1
          </div>
          <div
            role="tooltip"
            className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[10px] font-medium rounded-md whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
          >
            Inventory Lite v0.1.0
          </div>
        </div>
      )}
    </aside>
  )
}
