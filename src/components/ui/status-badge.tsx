import { Badge } from '@/components/ui/badge'

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
  const normalized = status.toLowerCase()

  switch (normalized) {
    case 'active':
    case 'completed':
    case 'stock_in':
    case 'owner':
      return <Badge variant="success" className={className}>{status}</Badge>

    case 'pending':
    case 'adjustment':
    case 'admin':
      return <Badge variant="warning" className={className}>{status}</Badge>

    case 'returned':
    case 'return':
      return <Badge variant="warning" className={className}>Returned</Badge>

    case 'partial_return':
      return <Badge variant="warning" className={className}>Partial Return</Badge>

    case 'inactive':
    case 'cancelled':
    case 'refunded':
    case 'stock_out':
      return <Badge variant="destructive" className={className}>{status}</Badge>

    case 'staff':
      return <Badge variant="info" className={className}>{status}</Badge>

    default:
      return <Badge variant="secondary" className={className}>{status}</Badge>
  }
}
