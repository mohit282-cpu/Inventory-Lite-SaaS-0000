import { UserRole } from '@/types'
import { ForbiddenError } from './security'
import { businessMemberService } from '@/services/business-member.service'

export interface AuthorizationContext {
  userId: string
  businessId: string
  requiredRole?: UserRole | UserRole[]
  isSystemOperation?: boolean
}

/**
 * RBAC Permission Matrix for Inventory Lite SaaS
 */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: [
    'business:read',
    'business:update',
    'business:delete',
    'members:manage',
    'products:manage',
    'categories:manage',
    'stock:manage',
    'customers:manage',
    'sales:manage',
    'payments:manage',
    'invoices:manage',
    'expenses:manage',
    'reports:view',
    'settings:manage',
  ],
  admin: [
    'business:read',
    'business:update',
    'members:manage',
    'products:manage',
    'categories:manage',
    'stock:manage',
    'customers:manage',
    'sales:manage',
    'payments:manage',
    'invoices:manage',
    'expenses:manage',
    'reports:view',
    'settings:manage',
  ],
  staff: [
    'business:read',
    'products:read',
    'stock:read',
    'customers:read',
    'sales:create',
    'sales:read',
    'payments:create',
    'payments:read',
    'invoices:read',
  ],
}

/**
 * Check if a role has permission for a specific action
 */
export function checkRolePermission(userRole: UserRole, action: string): boolean {
  const allowedActions = ROLE_PERMISSIONS[userRole] || []
  return allowedActions.includes(action)
}

/**
 * Centralized Service-Layer Tenant & RBAC Authorization Boundary
 * 
 * Verifies that:
 * 1. The user is authenticated.
 * 2. 'system' businessId cannot be passed by arbitrary client requests.
 * 3. User holds an active membership in the target tenant business.
 * 4. User holds sufficient RBAC role for the requested operation.
 */
export async function authorizeBusinessAccess(
  ctx: AuthorizationContext
): Promise<{ memberRole: UserRole }> {
  const { userId, businessId, requiredRole, isSystemOperation } = ctx

  if (!userId || userId.trim() === '') {
    throw new Error('Unauthorized: User authentication required')
  }

  // Guard against arbitrary client passing businessId = 'system'
  if (businessId === 'system' && !isSystemOperation) {
    throw new ForbiddenError('System Operation Bypass', 'client')
  }

  if (isSystemOperation && businessId === 'system') {
    return { memberRole: 'owner' }
  }

  if (!businessId || businessId.trim() === '') {
    throw new Error('Bad Request: Valid businessId parameter required')
  }

  // Query database membership
  const member = await businessMemberService.getMemberByUserAndBusiness(userId, businessId)
  if (!member) {
    throw new ForbiddenError(`Access business '${businessId}'`, 'non-member')
  }

  const memberRole = member.role as UserRole

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowedRoles.includes(memberRole)) {
      throw new ForbiddenError(`Required role [${allowedRoles.join(', ')}]`, memberRole)
    }
  }

  return { memberRole }
}
