import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
}

export function Skeleton({ className, variant = "rectangular", ...props }: SkeletonProps) {
  const variantClasses = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  }

  return (
    <div
      className={cn(
        "animate-pulse bg-slate-200/80 dark:bg-slate-800 motion-reduce:animate-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export function SkeletonText({ className, ...props }: SkeletonProps) {
  return <Skeleton variant="text" className={cn("h-4 w-3/4", className)} {...props} />
}

export function SkeletonAvatar({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <Skeleton
      variant="circular"
      style={{ width: `${size}px`, height: `${size}px` }}
      className={cn("shrink-0", className)}
    />
  )
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-10 w-28 rounded-lg", className)} />
}

export function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3", className)}>
      {children || (
        <>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-7 w-1/2" />
        </>
      )}
    </div>
  )
}

export function SkeletonKPI({ className }: { className?: string }) {
  return (
    <div className={cn("p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <SkeletonAvatar size={32} />
      </div>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-28" />
    </div>
  )
}

export function SkeletonPageHeader({
  titleWidth = "w-48",
  hasButton = true,
}: {
  titleWidth?: string
  hasButton?: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div className="space-y-2">
        <Skeleton className={cn("h-7", titleWidth)} />
        <Skeleton className="h-3.5 w-64" />
      </div>
      {hasButton && <SkeletonButton className="w-36 h-11 shrink-0" />}
    </div>
  )
}

export function SkeletonSidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-slate-200 bg-white shrink-0 p-3 space-y-4">
      <div className="h-14 flex items-center gap-3 border-b border-slate-100 pb-2">
        <SkeletonAvatar size={32} />
        <Skeleton className="h-5 w-28" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="space-y-6 pt-2">
        {[1, 2, 3].map((g) => (
          <div key={g} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg">
                  <SkeletonAvatar size={18} />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export function SkeletonTopbar() {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={32} className="md:hidden" />
        <Skeleton className="h-9 w-48 sm:w-64 rounded-lg hidden sm:block" />
      </div>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={32} />
        <Skeleton className="h-8 w-24 rounded-lg hidden sm:block" />
      </div>
    </header>
  )
}

export function DataTableSkeleton({
  columns = 5,
  rows = 8,
  className,
}: {
  columns?: number
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden", className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-500">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <th key={colIdx} className="px-4 py-3 font-bold text-slate-700">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-50/50">
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3.5">
                    <Skeleton
                      className={cn(
                        "h-4",
                        colIdx === 0 ? "w-28" : colIdx === columns - 1 ? "w-16" : "w-20"
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
        {Array.from({ length: Math.min(rows, 5) }).map((_, idx) => (
          <div key={idx} className="p-3 bg-slate-50/50 rounded-xl space-y-2 border border-slate-100">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-24" />
            <div className="flex justify-between items-center pt-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AppShellSkeleton({
  children,
  message = "Loading application...",
}: {
  children?: React.ReactNode
  message?: string
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100/70 text-slate-900 font-sans antialiased">
      <SkeletonSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <SkeletonTopbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {message && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pb-2">
                <SkeletonAvatar size={16} />
                <span>{message}</span>
              </div>
            )}
            {children || <DashboardSkeleton />}
          </div>
        </main>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader titleWidth="w-56" hasButton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProductsPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader titleWidth="w-44" hasButton />
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Skeleton className="h-10 w-full sm:w-72 rounded-lg" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      <DataTableSkeleton columns={7} rows={8} />
    </div>
  )
}

export function StockPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader titleWidth="w-40" hasButton={false} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>
      <DataTableSkeleton columns={6} rows={8} />
    </div>
  )
}

export function SalesPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader titleWidth="w-48" hasButton />
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <DataTableSkeleton columns={6} rows={8} />
    </div>
  )
}

export function InvoicesPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader titleWidth="w-40" hasButton />
      <Skeleton className="h-10 w-72 rounded-lg" />
      <DataTableSkeleton columns={6} rows={8} />
    </div>
  )
}

export function CustomersPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader titleWidth="w-44" hasButton />
      <Skeleton className="h-10 w-72 rounded-lg" />
      <DataTableSkeleton columns={5} rows={8} />
    </div>
  )
}

export function CreditPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader titleWidth="w-48" hasButton={false} />
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>
      <DataTableSkeleton columns={6} rows={8} />
    </div>
  )
}

export function ReportsPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader titleWidth="w-48" hasButton={false} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>
      <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonPageHeader titleWidth="w-40" hasButton={false} />
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-6 max-w-3xl">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <SkeletonButton className="h-10 w-32" />
      </div>
    </div>
  )
}
