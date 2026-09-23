import { Badge } from '@/components/ui/badge'
import { formatMovementTypeLabel } from '@/lib/utils'

export type StatusType = 
  | 'active' 
  | 'inactive' 
  | 'completed' 
  | 'pending' 
  | 'cancelled' 
  | 'refunded'
  | 'stock_in'
  | 'stock_out'
  | 'adjustment'
  | 'owner'
  | 'admin'
  | 'staff'

interface StatusBadgeProps {
  status: StatusType | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = String(status || '').toLowerCase()
  const label = formatMovementTypeLabel(status)

  switch (normalized) {
    case 'active':
    case 'completed':
    case 'stock_in':
    case 'purchase':
    case 'opening_stock':
    case 'owner':
      return <Badge variant="success" className={className}>{label}</Badge>

    case 'pending':
    case 'adjustment':
    case 'stock_adjustment':
    case 'admin':
      return <Badge variant="warning" className={className}>{label}</Badge>

    case 'returned':
    case 'return':
    case 'sales_return':
      return <Badge variant="warning" className={className}>Return</Badge>

    case 'partial_return':
      return <Badge variant="warning" className={className}>Partial Return</Badge>

    case 'inactive':
    case 'cancelled':
    case 'refunded':
    case 'stock_out':
    case 'damage':
    case 'sale':
      return <Badge variant="destructive" className={className}>{label}</Badge>

    case 'staff':
      return <Badge variant="info" className={className}>{label}</Badge>

    default:
      return <Badge variant="secondary" className={className}>{label}</Badge>
  }
}
