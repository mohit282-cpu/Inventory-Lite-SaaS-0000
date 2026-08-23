import * as React from "react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-4 w-4 border-2",
      md: "h-7 w-7 border-2",
      lg: "h-10 w-10 border-3",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "animate-spin rounded-full border-indigo-600 border-t-transparent",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
}

const LoadingSkeleton = React.forwardRef<HTMLDivElement, LoadingSkeletonProps>(
  ({ className, variant = "rectangular", ...props }, ref) => {
    const variantClasses = {
      text: "h-4 w-full rounded",
      circular: "h-10 w-10 rounded-full",
      rectangular: "h-16 w-full rounded-xl",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "animate-pulse bg-slate-100",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
LoadingSkeleton.displayName = "LoadingSkeleton"

interface LoadingPageProps {
  message?: string
}

const LoadingPage = ({ message = "Loading..." }: LoadingPageProps) => {
  return (
    <div className="flex min-h-[350px] items-center justify-center p-8">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-3" />
        <p className="text-xs font-semibold text-slate-700">{message}</p>
      </div>
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  message?: string
  children: React.ReactNode
}

const LoadingOverlay = ({ isLoading, message = "Loading...", children }: LoadingOverlayProps) => {
  if (!isLoading) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-xs rounded-xl">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-800">{message}</p>
        </div>
      </div>
      <div className="opacity-40">{children}</div>
    </div>
  )
}

export { LoadingSpinner, LoadingSkeleton, LoadingPage, LoadingOverlay }
export * from "./skeleton"
