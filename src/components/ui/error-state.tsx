import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Failed to load data',
  message = 'An error occurred while fetching information from the server.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-destructive/30 bg-destructive/10 rounded-2xl my-4">
      <div className="h-12 w-12 rounded-full bg-destructive/20 text-destructive flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      )}
    </div>
  )
}
