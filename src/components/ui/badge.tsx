import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold transition-colors uppercase tracking-wide",
  {
    variants: {
      variant: {
        default:
          "border-indigo-200 bg-indigo-50 text-indigo-700",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-700 font-semibold",
        destructive:
          "border-red-200 bg-red-50 text-red-700",
        outline: "border-slate-300 bg-white text-slate-700 font-semibold",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        info: "border-blue-200 bg-blue-50 text-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
