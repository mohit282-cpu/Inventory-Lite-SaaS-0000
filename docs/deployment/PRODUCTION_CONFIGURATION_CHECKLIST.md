# Inventory Lite SaaS — Production Configuration Checklist

## 1. System Overview & Deployment Architecture

- **Frontend Hosting**: Vercel (Next.js 14 App Router)
- **Backend Service (BaaS)**: Appwrite (Cloud / Self-Hosted)
- **Database Engine**: Appwrite TablesDB / Databases
- **Local Persistence**: IndexedDB via Dexie v6 (Offline-First cache & queue)
- **Primary Region**: AWS Frankfurt / Appwrite Cloud (`cloud.appwrite.io`)

---

## 2. Environment Variables Configuration

The following environment variables must be configured in Vercel / Production deployment settings.

> [!CAUTION]
> Never commit actual production credentials or private API keys to git repositories.

### Client-Facing Public Variables (Next.js)
```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_production_project_id
```

### Server-Only Privileged Variables (Vercel Build / Server Functions)
```env
APPWRITE_API_KEY=your_production_server_api_key_with_database_scope
```

---

## 3. Appwrite Database & Collections Schema

- **Database ID**: `inventory_lite_db`

### Collections Matrix
| Collection ID | Purpose | Tenant Scoped (`businessId`) | Read Permission | Write Permission |
| :--- | :--- | :--- | :--- | :--- |
| `businesses` | Business Profile & Settings | Yes (`$id`) | Member (`owner`, `admin`, `staff`) | `owner`, `admin` |
| `users` | User Account Profiles | No (`$id = userId`) | Owner User | Owner User |
| `business_members` | Role-Based Access Mapping | Yes | Business Members | `owner`, `admin` |
| `categories` | Inventory Categories | Yes | Business Members | `owner`, `admin`, `staff` |
| `products` | Inventory Product Catalog | Yes | Business Members | `owner`, `admin`, `staff` |
| `stock_movements` | Immutable Stock Ledger | Yes | Business Members | Internal Server Only |
| `customers` | Customer Directory & Credit | Yes | Business Members | `owner`, `admin`, `staff` |
| `sales` | Sale Transactions | Yes | Business Members | `owner`, `admin`, `staff` |
| `sale_items` | Line Item Snapshots | Yes | Business Members | `owner`, `admin`, `staff` |
| `invoices` | Tax Invoices | Yes | Business Members | `owner`, `admin`, `staff` |
| `payments` | Immutable Payment Ledger | Yes | Business Members | `owner`, `admin`, `staff` |
| `expenses` | Operating Expenses | Yes | Business Members | `owner`, `admin`, `staff` |
| `financial_sequences` | FY Invoice & Sale Counters | Yes | Internal Server Only | Internal Server Only |
| `audit_logs` | Security & Operational Audit Log | Yes | `owner`, `admin` | Internal Server Only |

---

## 4. Production Database Indexes Matrix

The following database indexes MUST be created in the Appwrite Console to guarantee $O(1)$ lookup performance and enforce unique integrity constraints.

| Collection ID | Index Name | Type | Attributes | Order | Constraint Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `products` | `idx_biz_sku` | Unique | `businessId`, `sku` | ASC, ASC | Enforces unique SKU per business |
| `products` | `idx_biz_barcode` | Unique | `businessId`, `barcode` | ASC, ASC | Enforces unique barcode per business |
| `products` | `idx_biz_cat` | Key | `businessId`, `categoryId` | ASC, ASC | Fast product listing by category |
| `sales` | `idx_biz_idemp` | Unique | `businessId`, `idempotencyKey` | ASC, ASC | Enforces sale idempotency |
| `sales` | `idx_biz_created` | Key | `businessId`, `createdAt` | ASC, DESC | Chronological sales reporting |
| `sales` | `idx_biz_cust` | Key | `businessId`, `customerId` | ASC, ASC | Customer transaction history |
| `invoices` | `idx_biz_inv_num` | Unique | `businessId`, `invoiceNumber` | ASC, ASC | Collision-proof invoice numbering |
| `invoices` | `idx_biz_sale_id` | Unique | `businessId`, `saleId` | ASC, ASC | 1-to-1 Sale-Invoice linkage |
| `payments` | `idx_biz_payment_sale` | Key | `businessId`, `saleId` | ASC, ASC | Fast lookup of sale payments |
| `stock_movements` | `idx_biz_prod_move` | Key | `businessId`, `productId`, `createdAt` | ASC, ASC, DESC | Audit ledger traversal |
| `business_members` | `idx_biz_user_role` | Unique | `businessId`, `userId` | ASC, ASC | Single role mapping per business |

---

## 5. Security Headers Verification Checklist

- [x] **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains; preload`
- [x] **X-Frame-Options**: `DENY` (Prevents Clickjacking / iframe embedding)
- [x] **X-Content-Type-Options**: `nosniff` (Prevents MIME sniffing attacks)
- [x] **Referrer-Policy**: `strict-origin-when-cross-origin`
- [x] **Permissions-Policy**: Restricted camera/microphone/geolocation access
- [x] **Content-Security-Policy (CSP)**: Restricted script, style, connect, worker, and frame sources.

---

## 6. Rate Limiting & Abuse Prevention Recommendations

1. **Vercel Edge Middleware Rate Limiting**:
   - Limit `/auth/*` login/signup attempts to **5 requests per minute** per IP.
   - Limit POS transaction submissions `/sales` to **30 requests per minute** per user session.
2. **Cloudflare WAF Rules**:
   - Enable OWASP Core Rule Set (CRS) for SQLi, XSS, and bad bot protection.
   - Set Rate Limiting rule on `/v1/databases/*` endpoints.

---

## 7. Database Backup & Disaster Recovery Strategy

1. **Automated Daily Snapshots**:
   - Appwrite Cloud automated daily backup enabled with 30-day point-in-time retention.
2. **Offline Data Preservation**:
   - Client IndexedDB local storage acts as a secondary decentralized cache for offline sales and catalog data.
3. **Restoration Protocol**:
   - In case of catastrophic server failure, restore latest Appwrite database snapshot and re-trigger client sync via `syncEngine.processSyncQueue()`.
