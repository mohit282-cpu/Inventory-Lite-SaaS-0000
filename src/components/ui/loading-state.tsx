import React from 'react'
import { Loader2 } from 'lucide-react'

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
    return (
      <div className="w-full space-y-3 p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
        <div className="h-8 bg-slate-800/60 rounded-md animate-pulse w-full mb-4" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-800/40 rounded-md animate-pulse w-full" />
        ))}
      </div>
    )
  }

  if (type === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-32 bg-slate-800/40 border border-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 min-h-[250px]">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}
