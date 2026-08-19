import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode | {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary" | "ghost" | "link"
  }
  size?: "sm" | "md" | "lg"
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "p-6 py-8",
      md: "p-8 py-10",
      lg: "p-10 py-12",
    }

    const iconSizes = {
      sm: "h-6 w-6",
      md: "h-8 w-8",
      lg: "h-10 w-10",
    }

    const renderIcon = () => {
      if (!icon) return null
      if (React.isValidElement(icon)) return icon
      const IconComponent = icon as React.ComponentType<{ className?: string }>
      return <IconComponent className={iconSizes[size]} />
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center rounded-xl border border-slate-200 bg-white p-6 sm:p-8 my-2 shadow-xs",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {icon && (
          <div className="mb-3 h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center">
            {renderIcon()}
          </div>
        )}
        <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
        {description && (
          <p className="text-xs text-slate-500 mb-4 max-w-sm leading-relaxed">
            {description}
          </p>
        )}
        {action && (
          React.isValidElement(action) ? (
            action
          ) : (
            <Button
              onClick={(action as any).onClick}
              variant={(action as any).variant || "default"}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4"
            >
              {(action as any).label}
            </Button>
          )
        )}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

interface EmptyStateIconProps extends React.HTMLAttributes<SVGElement> {
  className?: string
}

const EmptyStateIcon = ({ className }: EmptyStateIconProps) => {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  )
}

const EmptyProducts = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<EmptyStateIcon className="h-8 w-8" />}
    title="No products yet"
    description="Add your first product to start tracking inventory, prices, and stock threshold alerts."
    action={{ label: "+ Add Product", onClick: onAdd }}
  />
)

const EmptyCustomers = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<EmptyStateIcon className="h-8 w-8" />}
    title="No customers yet"
    description="Add your first customer to track purchase history and outstanding credit (Udharo) balances."
    action={{ label: "+ Add Customer", onClick: onAdd }}
  />
)

const EmptyInvoices = ({ onCreate }: { onCreate: () => void }) => (
  <EmptyState
    icon={<EmptyStateIcon className="h-8 w-8" />}
    title="No invoices yet"
    description="Invoices generated from completed POS counter sales will automatically appear here."
    action={{ label: "+ Create Sale (POS)", onClick: onCreate }}
  />
)

const EmptyCategories = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<EmptyStateIcon className="h-8 w-8" />}
    title="No categories yet"
    description="Organize your store products by adding categories."
    action={{ label: "+ Add Category", onClick: onAdd }}
  />
)

const EmptySearchResults = ({ searchTerm }: { searchTerm: string }) => (
  <EmptyState
    icon={<EmptyStateIcon className="h-8 w-8" />}
    title="No results found"
    description={`We couldn't find anything matching "${searchTerm}". Check for typos or try clearing filters.`}
    size="sm"
  />
)

const EmptyNotifications = () => (
  <EmptyState
    icon={<EmptyStateIcon className="h-8 w-8" />}
    title="No notifications"
    description="You're all caught up! No active stock or sales alerts."
    size="sm"
  />
)

export {
  EmptyState,
  EmptyStateIcon,
  EmptyProducts,
  EmptyCustomers,
  EmptyInvoices,
  EmptyCategories,
  EmptySearchResults,
  EmptyNotifications,
}
