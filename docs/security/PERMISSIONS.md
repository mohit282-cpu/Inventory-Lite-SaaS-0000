# Permission System Documentation

## Overview

Inventory Lite implements a comprehensive permission system based on Appwrite's built-in permission model with additional application-level role-based access control (RBAC). This ensures strict tenant isolation and proper data access control.

## Multi-Tenant Security Model

### Core Principle
**Every business-owned record must be associated with a business, and users must only access data belonging to businesses they are members of.**

### Three-Layer Security

1. **Database Level**: Appwrite attribute-level permissions
2. **Application Level**: Role-based access control
3. **Service Level**: Business ID validation in all operations

## User Roles

### Role Hierarchy

```
Owner (Full Access)
├── Admin (Full Access except business deletion)
└── Staff (Operational Access)
```

### Role Permissions

| Operation | Owner | Admin | Staff |
|-----------|-------|-------|-------|
| Create Business | ✅ | ❌ | ❌ |
| Delete Business | ✅ | ❌ | ❌ |
| Manage Members | ✅ | ✅ | ❌ |
| All CRUD Operations | ✅ | ✅ | ✅ |
| View Financial Reports | ✅ | ✅ | ✅ |
| Export Data | ✅ | ✅ | ❌ |
| System Settings | ✅ | ✅ | ❌ |

## Collection Permissions

### 1. users (User Profiles)

**Appwrite Permissions**:
- Read: `user:{userId}` (users can read their own profile)
- Update: `user:{userId}` (users can update their own profile)

**Application-Level Rules**:
- Users can only modify their own preferences
- Email changes require verification
- Avatar changes go through storage permissions

**Tenant Isolation**: Not applicable (user-level data)

---

### 2. businesses (Business Entities)

**Appwrite Permissions**:
- Read: `role:owner,admin,staff` (business members can read)
- Create: `user:{userId}` (any authenticated user can create)
- Update: `role:owner,admin` (only owners and admins can update)
- Delete: `role:owner` (only owners can delete)

**Application-Level Rules**:
- Only business owner can delete business
- Business cannot be deleted if it has active sales
- Owner transfer requires admin approval

**Tenant Isolation**: Top-level entity (no businessId)

---

### 3. business_members (Membership)

**Appwrite Permissions**:
- Read: `role:owner,admin,staff` (business members can read)
- Create: `role:owner,admin` (only owners and admins can add members)
- Update: `role:owner` (only owners can change roles)
- Delete: `role:owner` (only owners can remove members)

**Application-Level Rules**:
- One owner per business (enforced at application level)
- Owner cannot remove themselves
- Admin cannot be demoted to staff by another admin
- Member removal checks for active dependencies

**Tenant Isolation**: Uses businessId for tenant filtering

---

### 4. categories (Product Categories)

**Appwrite Permissions**:
- Read: `role:owner,admin,staff` (business members can read)
- Create: `role:owner,admin,staff` (all members can create)
- Update: `role:owner,admin,staff` (all members can update)
- Delete: `role:owner,admin` (only owners and admins can delete)

**Application-Level Rules**:
- Category deletion checks for active products
- Category name must be unique per business
- Cannot delete default category if products exist

**Tenant Isolation**: Strict (businessId required in all queries)

---

### 5. products (Product Inventory)

**Appwrite Permissions**:
- Read: `role:owner,admin,staff` (business members can read)
- Create: `role:owner,admin,staff` (all members can create)
- Update: `role:owner,admin,staff` (all members can update)
- Delete: `role:owner,admin` (only owners and admins can delete)

**Application-Level Rules**:
- SKU must be unique per business
- Barcode must be unique per business (if provided)
- Stock quantity cannot go negative
- Product deletion checks for sales history
- Price changes affect future sales only

**Tenant Isolation**: Strict (businessId required in all queries)

---

### 6. stock_movements (Inventory Tracking)

**Appwrite Permissions**:
- Read: `role:owner,admin,staff` (business members can read)
- Create: `role:owner,admin,staff` (via service methods only)
- Update: None (audit trail - immutable)
- Delete: None (audit trail - immutable)

**Application-Level Rules**:
- Only service methods can create stock movements
- Automatic stock validation before movements
- Audit trail is immutable (no updates/deletes)
- Reference tracking for related operations

**Tenant Isolation**: Strict (businessId required in all queries)

---

### 7. customers (Customer Management)

**Appwrite Permissions**:
- Read: `role:owner,admin,staff` (business members can read)
- Create: `role:owner,admin,staff` (all members can create)
- Update: `role:owner,admin,staff` (all members can update)
- Delete: `role:owner,admin` (only owners and admins can delete)

**Application-Level Rules**:
- Phone must be unique per business (if provided)
- Email must be unique per business (if provided)
- Customer deletion checks for sales history
- Due amount updates require proper authorization

**Tenant Isolation**: Strict (businessId required in all queries)

---

### 8. sales (Sales Transactions)

**Appwrite Permissions**:
- Read: `role:owner,admin,staff` (business members can read)
- Create: `role:owner,admin,staff` (all members can create)
- Update: `role:owner,admin,staff` (payment processing, status changes)
- Delete: `role:owner,admin` (with restrictions)

**Application-Level Rules**:
- Stock validation before sale creation
- Payment cannot exceed total amount
- Sale cancellation restores stock
- Historical sales cannot be modified (except status)
- Refund processing requires admin approval

**Tenant Isolation**: Strict (businessId required in all queries)

---

### 9. sale_items (Sale Line Items)

**Appwrite Permissions**:
- Read: `role:owner,admin,staff` (business members can read)
- Create: `role:owner,admin,staff` (via sale service only)
- Update: None (historical data - immutable)
- Delete: None (historical data - immutable)

**Application-Level Rules**:
- Only sale service can create sale items
- Product snapshots ensure historical accuracy
- Immutable data prevents invoice tampering
- Automatic calculation validation

**Tenant Isolation**: Strict (businessId required in all queries)

---

### 10. invoices (Invoice Generation)

**Appwrite Permissions**:
- Read: `role:owner,admin,staff` (business members can read)
- Create: `role:owner,admin,staff` (via sale service only)
- Update: `role:owner,admin` (PDF URL updates)
- Delete: `role:owner,admin` (with restrictions)

**Application-Level Rules**:
- One invoice per sale (enforced)
- Invoice number format: INV-YYYYMMDD-XXXX
- Invoice generation requires completed sale
- PDF generation via server-side functions
- Invoice deletion requires admin approval

**Tenant Isolation**: Strict (businessId required in all queries)

---

### 11. expenses (Expense Tracking)

**Appwrite Permissions**:
- Read: `role:owner,admin,staff` (business members can read)
- Create: `role:owner,admin,staff` (all members can create)
- Update: `role:owner,admin,staff` (all members can update)
- Delete: `role:owner,admin` (only owners and admins can delete)

**Application-Level Rules**:
- Amount must be positive
- Category is required
- Expense date cannot be in future
- Expense deletion requires justification

**Tenant Isolation**: Strict (businessId required in all queries)

---

## Service-Level Permission Enforcement

### BaseService Pattern

All services extend `BaseService` which enforces tenant isolation:

```typescript
class BaseService {
  async list(businessId: string, queries: any[] = []) {
    // Automatically adds businessId filter
    const tenantQueries = [Query.equal('businessId', businessId), ...queries]
    return await databases.listDocuments(DATABASE_ID, this.collectionId, tenantQueries)
  }
}
```

### Role Validation Middleware

Application-level role checks are performed before operations:

```typescript
async requireRole(businessId: string, userId: string, requiredRoles: UserRole[]) {
  const member = await businessMemberService.getMemberByUserAndBusiness(userId, businessId)
  if (!member || !requiredRoles.includes(member.role)) {
    throw new AuthorizationError('Insufficient permissions')
  }
}
```

### Business Access Validation

Every business-scoped operation validates user access:

```typescript
async validateBusinessAccess(userId: string, businessId: string) {
  const hasAccess = await businessMemberService.hasAccess(userId, businessId)
  if (!hasAccess) {
    throw new AuthorizationError('Access denied to this business')
  }
}
```

## Permission Inheritance

### Collection-Level Inheritance

- Child collections inherit businessId from parent
- All business-scoped collections require businessId
- Tenant isolation is automatically enforced

### Role-Based Inheritance

- Staff permissions are subset of admin permissions
- Admin permissions are subset of owner permissions
- Role hierarchy prevents permission escalation

## Security Guarantees

### Tenant Isolation Guarantees

1. **Query-Level Isolation**: Every query includes businessId filter
2. **Service-Level Validation**: All service methods validate businessId
3. **Permission-Level Control**: Appwrite permissions provide additional layer
4. **Audit Trail**: All operations logged with user and business context

### Data Leakage Prevention

1. **Cross-Business Access**: Impossible due to businessId validation
2. **Unauthorized Access**: Prevented by role-based permissions
3. **Data Exfiltration**: Limited by query result size limits
4. **Privilege Escalation**: Prevented by role hierarchy

### Audit and Compliance

1. **Operation Logging**: All critical operations logged
2. **User Attribution**: Every operation includes createdBy
3. **Timestamp Tracking**: Immutable createdAt timestamps
4. **Change History**: Stock movements provide audit trail

## Permission Testing

### Test Scenarios

1. **Tenant Isolation**: Verify Business A cannot access Business B data
2. **Role Boundaries**: Verify staff cannot perform admin operations
3. **Ownership Rules**: Verify only owner can delete business
4. **Data Integrity**: Verify referential integrity constraints
5. **Permission Escalation**: Verify users cannot escalate privileges

### Security Audits

1. **Access Pattern Analysis**: Monitor for unusual access patterns
2. **Permission Review**: Regular review of role assignments
3. **Audit Log Analysis**: Review critical operations
4. **Compliance Checks**: Verify multi-tenant isolation

## Best Practices

### For Developers

1. **Always Use Service Layer**: Never bypass service methods
2. **Validate Business Access**: Check user membership before operations
3. **Use Role Checks**: Verify user roles for sensitive operations
4. **Log Critical Operations**: Include user and business context
5. **Test Tenant Isolation**: Verify cross-business access prevention

### For Security

1. **Principle of Least Privilege**: Grant minimum required permissions
2. **Defense in Depth**: Multiple security layers
3. **Audit Everything**: Log all data modifications
4. **Regular Reviews**: Periodic permission audits
5. **Incident Response**: Plan for security incidents

## Configuration Required

### Appwrite Console Setup

1. **Configure Collection Permissions**: Set up permissions for each collection
2. **Create Role Groups**: Define owner, admin, staff roles in Appwrite
3. **Set Up Attribute Permissions**: Configure attribute-level access
4. **Enable Audit Logging**: Enable Appwrite audit logs
5. **Configure Rate Limiting**: Set up API rate limits

### Environment Variables

```env
# Permission configuration
NEXT_PUBLIC_ENABLE_RBAC=true
NEXT_PUBLIC_STRICT_TENANT_ISOLATION=true
NEXT_PUBLIC_AUDIT_LOGGING=true
```

## Troubleshooting

### Common Permission Issues

1. **Access Denied**: Check user role and business membership
2. **Cross-Business Access**: Verify businessId in all queries
3. **Permission Escalation**: Review role assignment logic
4. **Data Leakage**: Check service layer businessId validation

### Debug Tools

1. **Permission Checker**: Test user permissions per collection
2. **Tenant Isolation Verifier**: Verify business data isolation
3. **Role Validator**: Check role hierarchy enforcement
4. **Audit Log Viewer**: Review permission-related operations

---

**Critical Security Note**: Never bypass the service layer or disable tenant isolation. All direct database access must go through the validated service methods with proper businessId and role checks.
