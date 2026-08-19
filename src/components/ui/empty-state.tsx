import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

/**
 * Empty State Component
 * 
 * Reusable empty state displays for different contexts.
 * Provides consistent UX when no data is available.
 */

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "secondary" | "ghost" | "link"
  }
  size?: "sm" | "md" | "lg"
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "p-6",
      md: "p-8",
      lg: "p-12",
    }

    const iconSizes = {
      sm: "h-8 w-8",
      md: "h-12 w-12",
      lg: "h-16 w-16",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {icon && (
          <div className={cn("mb-4 text-muted-foreground", iconSizes[size])}>
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {description}
          </p>
        )}
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || "default"}
          >
            {action.label}
          </Button>
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

// Pre-configured empty states for common scenarios
const EmptyProducts = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<EmptyStateIcon className="h-12 w-12" />}
    title="No products yet"
    description="Get started by adding your first product to inventory."
    action={{ label: "Add Product", onClick: onAdd }}
  />
)

const EmptyCustomers = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<EmptyStateIcon className="h-12 w-12" />}
    title="No customers yet"
    description="Add your first customer to start managing relationships."
    action={{ label: "Add Customer", onClick: onAdd }}
  />
)

const EmptyInvoices = ({ onCreate }: { onCreate: () => void }) => (
  <EmptyState
    icon={<EmptyStateIcon className="h-12 w-12" />}
    title="No invoices yet"
    description="Create your first invoice to start billing customers."
    action={{ label: "Create Invoice", onClick: onCreate }}
  />
)

const EmptyCategories = ({ onAdd }: { onAdd: () => void }) => (
  <EmptyState
    icon={<EmptyStateIcon className="h-12 w-12" />}
    title="No categories yet"
    description="Organize your products by creating categories."
    action={{ label: "Add Category", onClick: onAdd }}
  />
)

const EmptySearchResults = ({ searchTerm }: { searchTerm: string }) => (
  <EmptyState
    icon={<EmptyStateIcon className="h-12 w-12" />}
    title="No results found"
    description={`We couldn't find anything matching "${searchTerm}"`}
    size="sm"
  />
)

const EmptyNotifications = () => (
  <EmptyState
    icon={<EmptyStateIcon className="h-12 w-12" />}
    title="No notifications"
    description="You're all caught up! No new notifications."
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
