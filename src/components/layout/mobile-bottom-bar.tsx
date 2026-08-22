"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, Users, Menu } from 'lucide-react'

interface MobileBottomBarProps {
  onOpenMore: () => void
}

export function MobileBottomBar({ onOpenMore }: MobileBottomBarProps) {
  const pathname = usePathname()

  const tabs = [
    { name: 'Home', href: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Products', href: '/app/products', icon: Package },
    { name: 'POS', href: '/app/sales/new', icon: ShoppingCart },
    { name: 'Customers', href: '/app/customers', icon: Users },
  ]

  return (
    <nav aria-label="Mobile navigation bar" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5 gap-1 items-center max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== '/app/dashboard' && pathname.startsWith(tab.href))
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[48px] ${
                isActive
                  ? 'text-indigo-600 bg-indigo-50/80 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="text-[10px] mt-1 tracking-tight">{tab.name}</span>
            </Link>
          )
        })}

        {/* More Menu Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMore}
          aria-label="Open navigation menu drawer"
          className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all min-h-[48px] font-medium"
        >
          <Menu className="h-5 w-5 text-slate-400" />
          <span className="text-[10px] mt-1 tracking-tight">More</span>
        </button>
      </div>
    </nav>
  )
}
