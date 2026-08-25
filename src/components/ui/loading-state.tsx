import { Loader2 } from 'lucide-react'
import { DataTableSkeleton, SkeletonKPI } from '@/components/ui/skeleton'

interface LoadingStateProps {
  message?: string
  rows?: number
  type?: 'spinner' | 'table' | 'cards'
}

export function LoadingState({
  message = 'Loading data...',
  rows = 5,
  type = 'spinner',
}: LoadingStateProps) {
  if (type === 'table') {
    return <DataTableSkeleton columns={5} rows={rows} />
  }

  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonKPI key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 min-h-[250px]">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
      <p className="text-xs font-semibold text-slate-700">{message}</p>
    </div>
  )
}
