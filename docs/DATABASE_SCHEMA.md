# Database Schema Documentation

## Overview

This document defines the complete database schema for Inventory Lite, a multi-tenant SaaS application. All database operations are performed through Appwrite with strict tenant isolation.

## Database Configuration

- **Database ID**: `inventory_lite_db` (configurable via environment variable)
- **Backend**: Appwrite Databases
- **Multi-tenancy**: All business-owned records include `businessId` field

## Collections

### 1. users
**Purpose**: Extended user profiles (Appwrite Auth handles core user data)

**Fields**:
- `$id`: string (auto-generated)
- `name`: string
- `email`: string
- `phone`: string (optional)
- `avatar`: string (optional)
- `preferences`: object
  - `activeBusinessId`: string (optional)
  - `theme`: 'light' | 'dark' | 'system'
  - `language`: string
  - `notifications`: object
    - `email`: boolean
    - `push`: boolean
- `createdAt`: string (ISO 8601)
- `updatedAt`: string (ISO 8601)

**Indexes**:
- `email` (unique)

**Permissions**:
- Read: User's own record
- Update: User's own record

**Tenant Isolation**: Not applicable (user-level data)

---

### 2. businesses
**Purpose**: Business entities (top-level tenant entities)

**Fields**:
- `$id`: string (auto-generated)
- `name`: string
- `ownerId`: string (references users.$id)
- `phone`: string (optional)
- `email`: string (optional)
- `address`: string (optional)
- `panNumber`: string (optional) - Nepal PAN number
- `vatNumber`: string (optional) - Nepal VAT number
- `logoUrl`: string (optional)
- `currency`: 'NPR' | 'USD' | 'EUR' | 'INR'
- `timezone`: string
- `createdAt`: string (ISO 8601)
- `updatedAt`: string (ISO 8601)

**Indexes**:
- `ownerId` (for finding user's businesses)
- `email` (unique, optional)
- `panNumber` (unique, optional)

**Permissions**:
- Read: Business members
- Create: Any authenticated user
- Update: Business owner/admin
- Delete: Business owner only

**Tenant Isolation**: Top-level entity (no businessId)

---

### 3. business_members
**Purpose**: User-business relationships with roles

**Fields**:
- `$id`: string (auto-generated)
- `businessId`: string (references businesses.$id)
- `userId`: string (references users.$id)
- `role`: 'owner' | 'admin' | 'staff'
- `createdAt`: string (ISO 8601)

**Indexes**:
- `businessId` + `userId` (unique combination)
- `userId` (for finding user's businesses)
- `businessId` (for finding business members)

**Constraints**:
- Unique combination of businessId + userId
- One owner per business (enforced at application level)

**Permissions**:
- Read: Business members
- Create: Business owner/admin
- Update: Business owner (role changes)
- Delete: Business owner

**Tenant Isolation**: Uses businessId for tenant filtering

---

### 4. categories
**Purpose**: Product categorization

**Fields**:
- `$id`: string (auto-generated)
- `businessId`: string (references businesses.$id)
- `name`: string
- `description`: string (optional)
- `createdAt`: string (ISO 8601)
- `updatedAt`: string (ISO 8601)

**Indexes**:
- `businessId` + `name` (unique combination)
- `businessId` (for listing business categories)

**Constraints**:
- Unique category name per business

**Permissions**:
- Read: Business members
- Create: Business owner/admin/staff
- Update: Business owner/admin/staff
- Delete: Business owner/admin

**Tenant Isolation**: Strict (businessId required)

---

### 5. products
**Purpose**: Product inventory

**Fields**:
- `$id`: string (auto-generated)
- `businessId`: string (references businesses.$id)
- `categoryId`: string (references categories.$id, optional)
- `name`: string
- `sku`: string (Stock Keeping Unit)
- `barcode`: string (optional)
- `unit`: string (e.g., 'pcs', 'kg', 'liters')
- `purchasePrice`: number
- `sellingPrice`: number
- `stockQuantity`: number
- `lowStockThreshold`: number (optional)
- `imageUrl`: string (optional)
- `isActive`: boolean
- `createdAt`: string (ISO 8601)
- `updatedAt`: string (ISO 8601)

**Indexes**:
- `businessId` + `sku` (unique combination)
- `businessId` + `barcode` (unique combination, if barcode exists)
- `businessId` + `name` (for search)
- `businessId` + `categoryId` (for category filtering)
- `businessId` + `isActive` (for active products)
- `businessId` + `createdAt` (for recent products)

**Constraints**:
- Unique SKU per business
- Unique barcode per business (if provided)
- stockQuantity >= 0
- purchasePrice >= 0
- sellingPrice >= 0

**Permissions**:
- Read: Business members
- Create: Business owner/admin/staff
- Update: Business owner/admin/staff
- Delete: Business owner/admin

**Tenant Isolation**: Strict (businessId required)

---

### 6. stock_movements
**Purpose**: Inventory change tracking and audit trail

**Fields**:
- `$id`: string (auto-generated)
- `businessId`: string (references businesses.$id)
- `productId`: string (references products.$id)
- `type`: 'stock_in' | 'stock_out' | 'adjustment'
- `quantity`: number (absolute value of change)
- `previousQuantity`: number (stock before movement)
- `newQuantity`: number (stock after movement)
- `reason`: string (optional)
- `referenceId`: string (optional) - e.g., sale ID, purchase order ID
- `createdBy`: string (references users.$id)
- `createdAt`: string (ISO 8601)

**Indexes**:
- `businessId` + `productId` (for product stock history)
- `businessId` + `type` (for movement type filtering)
- `businessId` + `createdAt` (for recent movements)
- `businessId` + `referenceId` (for tracking related movements)

**Constraints**:
- quantity > 0
- Previous quantity and new quantity must match type logic

**Permissions**:
- Read: Business members
- Create: Business owner/admin/staff (via service methods only)
- Update: None (audit trail - immutable)
- Delete: None (audit trail - immutable)

**Tenant Isolation**: Strict (businessId required)

---

### 7. customers
**Purpose**: Customer management

**Fields**:
- `$id`: string (auto-generated)
- `businessId`: string (references businesses.$id)
- `name`: string
- `phone`: string (optional)
- `email`: string (optional)
- `address`: string (optional)
- `totalDue`: number (default: 0)
- `createdAt`: string (ISO 8601)
- `updatedAt`: string (ISO 8601)

**Indexes**:
- `businessId` + `phone` (unique combination, if phone exists)
- `businessId` + `email` (unique combination, if email exists)
- `businessId` + `name` (for search)
- `businessId` + `totalDue` (for customers with outstanding balance)
- `businessId` + `createdAt` (for recent customers)

**Constraints**:
- Unique phone per business (if provided)
- Unique email per business (if provided)
- totalDue >= 0

**Permissions**:
- Read: Business members
- Create: Business owner/admin/staff
- Update: Business owner/admin/staff
- Delete: Business owner/admin

**Tenant Isolation**: Strict (businessId required)

---

### 8. sales
**Purpose**: Sales transactions

**Fields**:
- `$id`: string (auto-generated)
- `businessId`: string (references businesses.$id)
- `customerId`: string (references customers.$id, optional)
- `invoiceId`: string (references invoices.$id, optional)
- `invoiceStatus`: 'PENDING' | 'GENERATED' | 'FAILED' (optional, invoice generation lifecycle)
- `saleNumber`: string (optional, sequential per financial year, e.g. `SALE-83/84-000001`)
- `idempotencyKey`: string (optional, duplicate-transaction prevention)
- `requestHash`: string (optional, idempotency payload hash for key-reuse detection)
- `notes`: string (optional, e.g. cancellation / invoice-failure annotations)
- `subtotal`: number
- `discount`: number
- `tax`: number
- `total`: number
- `paidAmount`: number
- `dueAmount`: number
- `paymentMethod`: 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'credit'
- `status`: 'pending' | 'completed' | 'cancelled' | 'refunded'
- `createdBy`: string (references users.$id)
- `createdAt`: string (ISO 8601)

**Indexes**:
- `businessId` + `customerId` (for customer sales history)
- `businessId` + `idempotencyKey` (unique, enforces sale idempotency)
- `businessId` + `invoiceId` (for invoice lookup)
- `businessId` + `status` (for status filtering)
- `businessId` + `createdAt` (for recent sales)
- `businessId` + `paymentMethod` (for payment method filtering)

**Constraints**:
- total = subtotal + tax - discount
- dueAmount = total - paidAmount
- dueAmount >= 0
- paidAmount >= 0
- paidAmount <= total

**Permissions**:
- Read: Business members
- Create: Business owner/admin/staff
- Update: Business owner/admin/staff (payment processing, status changes)
- Delete: Business owner/admin (with restrictions)

**Tenant Isolation**: Strict (businessId required)

---

### 9. sale_items
**Purpose**: Individual items within a sale (with snapshots)

**Fields**:
- `$id`: string (auto-generated)
- `businessId`: string (references businesses.$id)
- `saleId`: string (references sales.$id)
- `productId`: string (references products.$id)
- `productNameSnapshot`: string (historical product name)
- `quantity`: number
- `unitPrice`: number (price at time of sale)
- `discount`: number
- `total`: number

**Indexes**:
- `businessId` + `saleId` (for sale items lookup)
- `businessId` + `productId` (for product sales history)

**Constraints**:
- quantity > 0
- unitPrice >= 0
- total = quantity * unitPrice - discount

**Permissions**:
- Read: Business members
- Create: Business owner/admin/staff (via sale service only)
- Update: None (historical data - immutable)
- Delete: None (historical data - immutable)

**Tenant Isolation**: Strict (businessId required)

**Important**: Snapshots ensure that historical invoices don't change when products are later edited.

---

### 10. invoices
**Purpose**: Invoice generation and tracking

**Fields**:
- `$id`: string (auto-generated)
- `businessId`: string (references businesses.$id)
- `saleId`: string (references sales.$id)
- `invoiceNumber`: string (format: INV-YYYYMMDD-XXXX)
- `issueDate`: string (ISO 8601)
- `pdfUrl`: string (optional, generated PDF storage)
- `createdAt`: string (ISO 8601)

**Indexes**:
- `businessId` + `invoiceNumber` (unique combination)
- `businessId` + `saleId` (unique combination)
- `businessId` + `issueDate` (for date range queries)
- `businessId` + `createdAt` (for recent invoices)

**Constraints**:
- Unique invoice number per business
- Unique saleId per business (one invoice per sale)

**Permissions**:
- Read: Business members
- Create: Business owner/admin/staff (via sale service only)
- Update: Business owner/admin (PDF URL updates)
- Delete: Business owner/admin

**Tenant Isolation**: Strict (businessId required)

---

### 11. expenses
**Purpose**: Business expense tracking

**Fields**:
- `$id`: string (auto-generated)
- `businessId`: string (references businesses.$id)
- `category`: string
- `description`: string
- `amount`: number
- `date`: string (ISO 8601)
- `createdBy`: string (references users.$id)
- `createdAt`: string (ISO 8601)

**Indexes**:
- `businessId` + `category` (for category filtering)
- `businessId` + `date` (for date range queries)
- `businessId` + `amount` (for amount-based queries)
- `businessId` + `createdAt` (for recent expenses)

**Constraints**:
- amount > 0
- category required

**Permissions**:
- Read: Business members
- Create: Business owner/admin/staff
- Update: Business owner/admin/staff
- Delete: Business owner/admin

**Tenant Isolation**: Strict (businessId required)

---

## Index Strategy

### High-Priority Indexes (Performance Critical)
1. **businessId** on all tenant-scoped collections
2. **businessId + sku** on products (unique)
3. **businessId + barcode** on products (unique)
4. **businessId + name** on categories (unique)
5. **businessId + userId** on business_members (unique)

### Medium-Priority Indexes (Common Queries)
1. **businessId + createdAt** on products, customers, sales, expenses
2. **businessId + status** on sales
3. **businessId + categoryId** on products
4. **businessId + saleId** on sale_items, invoices
5. **businessId + productId** on stock_movements

### Low-Priority Indexes (Specialized Queries)
1. **businessId + paymentMethod** on sales
2. **businessId + category** on expenses
3. **businessId + totalDue** on customers

## Data Integrity Rules

### Referential Integrity
- All `businessId` fields must reference valid businesses
- All `userId` fields must reference valid users
- All `categoryId` fields must reference valid categories within same business
- All `productId` fields must reference valid products within same business
- All `customerId` fields must reference valid customers within same business

### Business Rules
1. **Stock Management**: stockQuantity cannot go negative
2. **Sale Completion**: Cannot complete sale if insufficient stock
3. **Payment Limits**: paidAmount cannot exceed total
4. **Due Amount**: dueAmount must be non-negative
5. **Price Validation**: All monetary values must be non-negative
6. **Invoice Uniqueness**: One invoice per sale, unique invoice numbers

### Audit Trail
- Stock movements are immutable (create-only)
- Sale items are immutable (create-only for historical accuracy)
- Created timestamps are never modified
- All critical operations include createdBy tracking

## Security Considerations

### Tenant Isolation
- Every business-scoped query MUST include businessId filter
- Service layer enforces businessId in all operations
- Client-side cannot bypass businessId validation

### Role-Based Access
- **Owner**: Full access to all business data
- **Admin**: Full access except business deletion
- **Staff**: Read/write access to operational data (products, sales, customers)
- Additional roles can be added as needed

### Data Privacy
- User personal data (phone, email) protected by role-based access
- Financial data (sales, expenses) accessible only to business members
- Audit trail tracks all data modifications

## Performance Optimization

### Query Optimization
1. Use indexed fields in WHERE clauses
2. Limit result sets with pagination
3. Use specific field selections instead of full documents
4. Implement caching for frequently accessed data

### Batch Operations
1. Stock movements processed individually for audit trail
2. Sale items created in batches during sale creation
3. Bulk operations for data imports/exports

## Migration Strategy

### Schema Versioning
- Use semantic versioning for schema changes
- Maintain backward compatibility when possible
- Provide migration scripts for breaking changes

### Data Migration
- Export/import functionality for business data
- Tenant-specific migration tools
- Rollback procedures for failed migrations

## Manual Configuration Required

The following must be configured manually in the Appwrite Console:

1. **Database Creation**: Create database with ID `inventory_lite_db`
2. **Collection Creation**: Create all 11 collections with specified attributes
3. **Index Creation**: Create all specified indexes
4. **Attribute Configuration**: Set correct attribute types and constraints
5. **Permission Configuration**: Set up role-based permissions for each collection
6. **Storage Buckets**: Create storage buckets for images and documents

See `APPWRITE_SETUP.md` for detailed setup instructions.
