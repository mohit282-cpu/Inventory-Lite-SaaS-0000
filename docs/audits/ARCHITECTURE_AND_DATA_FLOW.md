# Architecture & Data Flow — Inventory Lite SaaS

**Documented:** October 21, 2026
**Framework:** Next.js 16 (App Router) + Appwrite 15 + React 18 + TypeScript + Tailwind CSS 3.4

---
## 1. High-Level Architecture

Inventory Lite SaaS employs a **full-stack, multi-tenant Next.js 16 SaaS architecture** with Appwrite as the unified backend platform (Auth + Database + Storage + Functions). The system separates concerns into distinct layers:

### Client Layer (Browser)
- **Next.js 16 App Router** — server components by default, client components where interactivity needed
- **React 18** with hooks (useState, useEffect, useContext)
- **React Hook Form** + Zod for form state and validation
- **Radix UI** primitives under shadcn wrappers for accessible UI
- **Tailwind CSS 3.4** with `tailwind-merge` for utility-first styling
- **Appwrite JS SDK** for authentication and database operations

### Service Layer (Node.js/Edge)
- **BaseService** — all business services extend this class; enforces tenant isolation via `businessId` filtering on every database operation
- **Domain-specific services** — ProductService, SaleService, CustomerService, PaymentService, InvoiceService, StockMovementService, etc.
- **Authorization** — `authorizeBusinessAccess` from `src/lib/authorization.ts` validates database membership and role permissions at the start of every business-scoped operation
- **Idempotency** — `IdempotencyManager` with persistent Appwrite `idempotency_keys` collection prevents duplicate financial transactions
- **Financial Calculations** — `money.ts` uses integer minor units (paisa) to eliminate floating-point errors; `vat-engine.ts` calculates 13% VAT
- **Rate Limiting** — `RateLimiter` with local memory sliding window + Appwrite DB distributed fallback (`rate_limits` collection)
- **Error Handling** — `handleApiError` centralizes Appwrite/SDK error mapping to user-friendly `AppError` subclasses; `logger.ts` with recursive sanitization

### Data Layer (Appwrite Cloud)
- **Single database** (`inventory_lite_db`) with 58+ collections organized by business entity
- **Tenant isolation** enforced at two boundaries:
  1. **Appwrite document-level permissions** — `Permission.read(secureTarget)`, `Permission.update(secureTarget)`, `Permission.delete(secureTarget)` where secureTarget is `user:userId` or `team:businessId`
  2. **Application-layer filtering** — `Query.equal('businessId', businessId)` on every list/get query; `businessId` verification in `getById`/`update`/`delete`
- **Storage buckets** — `product_images`, `business_logos`, `documents` with individual file permissions
- **Immutable audit trails** — `stock_movements` collection with explicit override of update/delete to reject mutation

### Tenant Isolation Architecture
The application implements **defense-in-depth tenant isolation**:

1. **Service-layer enforcement** — Every BaseService method (`create`, `getById`, `list`, `update`, `delete`) injects `Query.equal('businessId', businessId)` automatically for non-system contexts
2. **Authorization middleware** — `authorizeBusinessAccess` resolves the user's actual database membership role and verifies active business membership
3. **Role-based permissions** — `ROLE_PERMISSIONS` matrix defines what each role (owner/admin/staff/auditor) can do; broad `Role.any()` never used for business data
4. **System context isolation** — `SYSTEM_TENANT_ID = '__SYSTEM_INTERNAL_PRIVILEGED_ACTOR__'` prevents arbitrary client code from passing `businessId = 'system'`
5. **Direct ownership detection** — If no database membership found, service checks if user is the business owner via `businessService.getById`

---

## 2. Data Flow — Core Business Transactions

### 2.1 Product Creation Flow
```
User → AuthProvider (verify authentication) → 
ProductService.createProduct(businessId, userId) → 
  BaseService.create(data, businessId, userId) →
    1. Validate appwrite config
    2. Apply secure permissions: Permission.read(user/userId), Permission.update(team/businessId), Permission.delete(team/businessId)
    3. Add businessId to documentData (unless system context)
    4. databases.createDocument(DATABASE_ID, COLLECTIONS.PRODUCTS, docId, documentData, docPermissions)
    5. If stockQuantity > 0: StockMovementService.createRawMovement (internal) → 
       productService.withStockLock → productService.updateStockQuantity → 
       StockMovementService.createMovement → 
         productService.updateStockWithCAS (CAS check) → 
         databases.updateDocument stockQuantity → 
         this.create movement record (immutable audit log)
    6. Uniqueness validation: SKU/barcode already checked via DB queries + inventory_locks
    7. Return created product
```

### 2.2 Sale Creation Flow
```
User → authorizeBusinessAccess (verify owner/admin/staff membership) → 
SaleService.createSale(data, businessId, userId) → 
  IdempotencyManager.executeIdempotentTransaction (
    1. In-process cache check for composite key
    2. Distributed store check: databases.getDocument(idempotency_keys, compositeKey)
    3. Persistent persistentCheck: list sales with idempotencyKey
    4. Reserve PROCESSING record in idempotency_keys collection
    5. Execute operation(async () => {
       a. Server-side product price verification (Promise.all getProduct for each item)
          - Stock check: product.stockQuantity >= item.quantity
          - Price override authorization: owner only can override catalog price
          - Audit log price_override event if staff overrides
       b. calculateSaleTotals (money.ts) — minor units (paisa), 13% VAT
       c. validateFinancialInvariants (money.ts) — total = subtotal - discount + tax
       d. Create sale document via BaseService.create (with businessId isolation)
       e. Create sale items via saleItemService.createSaleItems
       f. Process stock-out via stockMovementService.processStockOut (with productService.withStockLock + updateStockWithCAS)
       g. Update customer dueAmount via customerService.updateDueAmount (if customerId + due > 0)
       h. Generate invoice via invoiceService.createInvoice (with idempotency)
       i. Post accounting journal via accounting-hooks (non-blocking; failures set accountingStatus = ACCOUNTING_FAILED)
       j. Update sale accountingStatus
     })
     6. Finalize COMPLETED status with retries
     7. Return result
  )
```

### 2.3 Payment Creation Flow
```
User → authorizeBusinessAccess → 
PaymentService.createPayment(data, businessId, userId) → 
  IdempotencyManager.executeIdempotentTransaction (
    1. Same idempotency flow as createSale
    2. Persistent check: list payments with idempotencyKey + saleId
    3. Reserve PROCESSING record
    4. Execute operation(async () => {
       a. Validate amount > 0 (money.ts rejects NaN/Infinity/negative)
       b. Create payment document via BaseService.create (businessId isolation)
       c. Update sale paidAmount/dueAmount — may trigger recalculation
       d. If full_udhaar: paidAmount = 0, dueAmount = total
       e. Audit log payment event
     })
     5. Finalize COMPLETED status with retries
     6. Return payment record
  )
```

### 2.4 Stock Movement Flow
```
User → authorizeBusinessAccess → 
StockMovementService.createMovement(data, businessId, userId) → 
  1. Validate quantity > 0 finite number
  2. authorizeBusinessAccess RBAC check (owner/admin/staff)
  3. productService.withStockLock(productId, async () => {
       a. Get current product stockQuantity
       b. Compute newQuantity based on type (stock_in: +, stock_out: -, adjustment :=)
       c. Insufficient stock check for stock_out
       d. productService.updateStockWithCAS(productId, previousQuantity, newQuantity, businessId, requestedDeduction)
          - CAS: if currentDoc.stockQuantity !== expectedPreviousQuantity → CONCURRENCY_CONFLICT error
          - On conflict: retry or throw
       e. Create immutable stock movement record via BaseService.create (businessId isolation)
          - Override update/delete in StockMovementService to reject mutation
       f. Return movement record
    })
  5. On movement creation failure: rollback product stock to previousQuantity
```

### 2.5 Sale Cancellation Flow
```
User → authorizeBusinessAccess (owner/admin) → 
SaleService.cancelSale(saleId, businessId, userId) → 
  1. Get sale; verify not already cancelled/failed
  2. Idempotency check with key
  3. Stock restoration: for each sale item → stockMovementService.processStockIn (restore quantity)
  4. Customer due adjustment: if sale.dueAmount > 0 → customerService.updateDueAmount(custId, -dueAmount)
  5. Payment reversal: for each associated payment (status === POSTED) → paymentService.reversePayment
  6. If ANY reversal fails:
     - Update sale: cancellationStatus = FAILED, dueAmount = 0, add failure notes
     - Log sale_cancellation_failed event with error details
     - Return { success: false, cancellationStatus: 'cancel_failed' }
  7. If ALL reversals succeed:
     - Update sale: status = 'cancelled', dueAmount = 0, cancellationStatus = COMPLETED
     - Log sale_cancelled event
     - Record idempotency completion
     - Return { success: true, cancellationStatus: 'cancelled' }
```

---

## 3. Database Schema Overview

### Core Business Collections (58+)
| Collection | Key Fields | Tenant Isolation |
|---|---|---|
| `businesses` | `$id`, `name`, `ownerId`, `vatNumber`, `vatRate`, `currency`, `timezone` | `ownerId` links to user; businessId filtered on all queries |
| `business_members` | `$id`, `userId`, `businessId`, `role` (owner/admin/staff/auditor) | Composite key (userId + businessId); membership verified per operation |
| `users` | `$id`, `name`, `email`, `phone`, `preferences` (activeBusinessId, onboardingCompleted) | User-level, not business-scoped; extended via preferences |
| `categories` | `$id`, `name`, `businessId` | `businessId` equality check on every query |
| `products` | `$id`, `name`, `sku`, `barcode`, `purchasePrice`, `sellingPrice`, `costPrice`, `stockQuantity`, `lowStockThreshold`, `isActive`, `businessId` | `businessId` on every query; SKU/barcode unique per business |
| `stock_movements` | `$id`, `productId`, `type` (stock_in/stock_out/adjustment), `quantity`, `previousQuantity`, `newQuantity`, `reason`, `referenceId`, `createdBy` | **Immutable**: update/delete explicitly throw "immutable audit logs" |
| `customers` | `$id`, `name`, `phone`, `email`, `panNumber`, `totalDue`, `dueAmount`, `businessId` | `businessId` on every query; uniqueness by phone/email/PAN per business |
| `suppliers` | `$id`, `name`, `contact`, `panNumber`, `businessId` | Same pattern as customers |
| `sales` | `$id`, `saleNumber`, `customerId`, `invoiceId`, `idempotencyKey`, `subtotal`, `discount`, `taxableAmount`, `tax`, `vatAmount`, `total`, `paidAmount`, `dueAmount`, `changeAmount`, `paymentMethod`, `status` (pending/completed/cancelled), `cancellationStatus`, `createdBy` | `businessId` on every query; idempotencyKey for duplicate prevention |
| `sale_items` | `$id`, `saleId`, `productId`, `productNameSnapshot`, `quantity`, `unitPrice`, `discount`, `total` | **Immutable**: part of sale audit trail; linked to sale via saleId |
| `invoices` | `$id`, `invoiceNumber`, `saleId`, `issueDate`, `dueDate`, `pdfUrl`, `status` (DRAFT/VALIDATED/ISSUED/LOCKED/VOIDED), `issuedAt`, `validatedAt`, `lockedAt`, `voidedAt` | `businessId` via saleId linkage; sequential invoice numbers per business |
| `payments` | `$id`, `saleId`, `amount`, `paymentMethod`, `status` (PENDING/POSTED/FAILED), `customerId`, `idempotencyKey`, `createdBy` | `businessId`; idempotencyKey prevents duplicate payments |
| `expenses` | `$id`, `name`, `amount`, `category`, `businessId`, `paymentMethod`, `status` | `businessId` on every query |
| `purchases` | `$id`, `purchaseNumber`, `supplierId`, `items`, `subtotal`, `tax`, `total`, `paymentMethod`, `status` | `businessId`; linked to suppliers |
| `journal_entries` | `$id`, `businessId`, `saleId`/`purchaseId`, `entryDate`, `description`, `debit`, `credit`, `status` | `businessId`; double-entry accounting |
| `journal_lines` | `$id`, `journalEntryId`, `productId`/`customerId`/`supplierId`, `description`, `debit`, `credit` | `businessId`; lines within journal entries |
| `tax_rates` | `$id`, `rate`, `name`, `isActive`, `businessId` | Configurable tax rates per business |
| `tax_categories` | `$id`, `name`, `isActive`, `businessId` | Tax category classifications |
| `tax_transactions` | `$id`, `saleId`/`purchaseId`, `taxableAmount`, `vatAmount`, `rate`, `businessId` | Links tax to specific transactions |
| `financial_sequences` | `$id`, `prefix`, `suffix`, `currentValue`, `fiscalYear`, `businessId` | Sequential number generation (SALE-83/84-000001) |
| `accounting_periods` | `$id`, `name`, `startDate`, `endDate`, `isClosed`, `businessId` | Accounting period management |
| `fiscal_years` | `$id`, `startYear`, `endYear`, `isCurrent`, `businessId` | Fiscal year tracking (BS 83/84) |
| `idempotency_keys` | `$id`, `key`, `businessId`, `operationType`, `requestHash`, `status` (PROCESSING/COMPLETED/FAILED), `resourceId`, `response`, `createdAt`, `updatedAt`, `expiresAt` | Distributed idempotency store; prevents duplicate financial transactions |
| `audit_logs` | `$id`, `event`, `resourceType`, `resourceId`, `userId`, `businessId`, `timestamp`, `details`, `status` | Durable audit trail; may be in-memory only currently |
| `cbms_submissions` | `$id`, `invoiceIds`, `submissionDate`, `status`, `businessId` | IRD/CBMS filing records |
| `store_assets` | `$id`, `name`, `type`, `value`, `purchaseDate`, `currentValue`, `businessId` | Fixed asset tracking |
| `business_onboarding` | `$id`, `userId`, `businessId`, `completedAt`, `stepData` | Tracks onboarding progress per business |
| `user_preferences` | `$id`, `userId`, `theme`, `timezone`, `currency`, `vatRegistrationType`, `vatNumber`, `panNumber` | User-level preferences |
| `rate_limits` | `$id`, `clientKey`, `sanitizedKey`, `createdAt` | Distributed rate limiter store; fallback to memory |
| `contact_submissions` | `$id`, `name`, `phone`, `businessName`, `message`, `clientIp`, `status` (NEW), `createdAt` | Public contact form submissions |
| `newsletter_subscriptions` | `$id`, `email`, `clientIp`, `status` (ACTIVE), `createdAt` | Marketing newsletter subscriptions |

---

## 4. API Route Flow

All API routes follow a consistent pattern:

```
HTTP Request → Next.js Route Handler (export const dynamic = 'force-dynamic') →
  1. Content-Type validation (application/json)
  2. Rate limiting via rateLimiter.checkLimitAsync (trusted client IP)
  3. JSON body parsing with safe error handling
  4. Zod schema validation
  5. Input sanitization (XSS tag stripping, honeypot bot check)
  6. Business authorization (authorizeBusinessAccess for scoped routes)
  7. Core business logic (service layer call)
  8. Appwrite database operation with businessId isolation
  9. Response with standardized JSON format
  10. Error handling via handleApiError → user-friendly AppError
```

Key API routes:
- `GET /api/health` — DB connectivity health check (200/503)
- `POST /api/contact` — Contact form with rate limiting, honeypot, Zod validation, Appwrite persistence
- `POST /api/subscribe` — Newsletter subscription with rate limiting, duplicate check
- `POST /api/account/delete` — Full account deletion with password re-authentication, cascading purge

---

## 5. Authentication Flow

```
Browser → /api/auth/[action] → Appwrite Account API → 
  1. signup: account.create → user profile creation → refreshAuth → set ONLINE_AUTHENTICATED
  2. login: account.deleteSession('current') → account.createEmailPasswordSession → set cookie → refreshAuth
  3. logout: account.deleteSession('current') → clear appwrite_session cookie → set UNAUTHENTICATED
  4. forgotPassword: account.createRecovery(email, redirectUrl) → time-limited recovery link sent to email
  5. resetPassword: account.updateRecovery(userId, secret, newPassword) → validate token, set new password
  6. createVerification: account.createVerification(redirectUrl) → verification email sent
  7. updateVerification: account.updateVerification(userId, secret) → mark email as verified
```

Session management:
- **Cookie**: `appwrite_session=true; path=/; max-age=31536000; SameSite=Lax` (set by authService.login/getCurrentUser)
- **Cross-tab sync**: Relies on Appwrite SDK's internal session management; no explicit storage event listener
- **Session refresh**: refreshAuthInternal called on useEffect dependency; concurrent refresh guarded by authInFlightRef

---

## 6. Key Dependencies & External Services

| Category | Dependencies | Notes |
|---|---|---|
| **Framework** | next@16.3.3, react@18.3.0, react-dom@18.3.0 | Next.js 16 with App Router |
| **Backend** | appwrite@15.0.0 | Auth + DB + Storage + Functions |
| **UI** | radix-ui components, shadcn wrappers, tailwindcss@3.4.19 | Accessible UI primitive set |
| **Forms** | react-hook-form@7.51.0, zod@3.23.0 | Form state + validation |
| **Finance** | date-fns@3.6.0, exceljs@4.4.0, jspdf@4.2.1, jspdf-autotable@5.0.8, jszip@3.10.1 | Date handling + reports + exports |
| **Charts** | recharts@2.12.0 | Dashboard visualizations |
| **Utilities** | clsx@2.1.0, tailwind-merge@2.3.0, class-variance-authority@0.7.1 | Class management |
| **Logging** | own logger.ts with recursive sanitization | In-memory only; needs durable augmentation |
| **Testing** | vitest@5.0.0, @testing-library/react@14.2.0, playwright@1.64.1 | Unit + integration + E2E |
| **Analytics** | @plausible-analytics/tracker@0.4.6 | Website analytics — server-side config pending |
| **Money** | own money.ts with paisa integer precision | Backend-authoritative financial calculations |

---

## 7. Deployment Platform

- **Vercel** — production hosting with automatic git-based deployments
- **Node.js 22 LTS** (engines: `^22.12.0 || ^24.0.0 || >=26.0.0`)
- **Environment variables** via Vercel dashboard (`NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `NEXT_PUBLIC_APPWRITE_ENDPOINT`, etc.)
- **CI/CD** — GitHub Actions workflows:
  - `ci.yml` — 8-step quality gate (install → typecheck → lint → npm audit → vitest → build → playwright install → playwright test)
  - `playwright.yml` — standalone E2E workflow

---