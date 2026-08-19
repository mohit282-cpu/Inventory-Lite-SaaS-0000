"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

export function Breadcrumbs() {
  const pathname = usePathname()
  const pathSegments = pathname.split('/').filter((x) => x)

  // Map route segment names to human-readable titles
  const routeNameMap: Record<string, string> = {
    app: 'App',
    dashboard: 'Dashboard',
    products: 'Products',
    categories: 'Categories',
    stock: 'Stock Movements',
    customers: 'Customers',
    sales: 'Sales',
    invoices: 'Invoices',
    expenses: 'Expenses',
    reports: 'Reports',
    settings: 'Settings',
  }

  // Filter out leading 'app' segment for cleaner breadcrumbs
  const displaySegments = pathSegments.filter(s => s !== 'app')

  if (displaySegments.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-400 space-x-1 mb-2">
      <Link
        href="/app/dashboard"
        className="hover:text-white transition-colors flex items-center gap-1"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>

      {displaySegments.map((segment, index) => {
        const isLast = index === displaySegments.length - 1
        const href = `/app/${displaySegments.slice(0, index + 1).join('/')}`
        const label = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-200 capitalize">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-white transition-colors capitalize"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
