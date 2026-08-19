import React from 'react'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  showBreadcrumbs?: boolean
}

export function PageHeader({
  title,
  description,
  actions,
  showBreadcrumbs = true,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 mb-6">
      <div className="min-w-0">
        {showBreadcrumbs && <Breadcrumbs />}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="text-sm sm:text-base text-slate-500 font-normal mt-1">{description}</p>}
      </div>

      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
