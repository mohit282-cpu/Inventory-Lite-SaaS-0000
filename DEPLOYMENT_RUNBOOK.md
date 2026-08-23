# Inventory Lite SaaS — Production Deployment Runbook

## 1. Pre-Deployment Verification

Before triggering a production release to Vercel and Appwrite, ensure all local verification checks pass:

```bash
# 1. Verify working tree status and active branch (must be main)
git status

# 2. Run TypeScript compilation check
npm run typecheck

# 3. Run ESLint check
npm run lint

# 4. Run Vitest unit & integration suite
npx vitest run --pool=forks

# 5. Run Playwright E2E suite
npm run test:e2e

# 6. Run Next.js production build
npm run build
```

All 5 commands must complete with **0 errors**.

---

## 2. Appwrite Production Database Setup

1. **Log in** to Appwrite Console (`https://cloud.appwrite.io`).
2. **Create/Verify Database**:
   - Database Name: `Inventory Lite Database`
   - Database ID: `inventory_lite_db`
3. **Verify Required Collections**:
   - `businesses`, `users`, `business_members`, `categories`, `products`, `stock_movements`, `customers`, `sales`, `sale_items`, `invoices`, `payments`, `expenses`, `financial_sequences`, `audit_logs`.
4. **Create Database Indexes**:
   - `products`: `idx_biz_sku` (Unique: `businessId`, `sku`)
   - `products`: `idx_biz_barcode` (Unique: `businessId`, `barcode`)
   - `sales`: `idx_biz_idemp` (Unique: `businessId`, `idempotencyKey`)
   - `invoices`: `idx_biz_inv_num` (Unique: `businessId`, `invoiceNumber`)
   - `invoices`: `idx_biz_sale_id` (Unique: `businessId`, `saleId`)

---

## 3. Vercel Deployment Steps

1. **Link Repository**:
   - Connect `https://github.com/mohit282-cpu/Inventory-Lite-SaaS-0000.git` to Vercel Project.
   - Framework Preset: `Next.js`.
   - Node.js Version: `18.x` or `20.x`.
2. **Configure Environment Variables**:
   ```env
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_production_project_id
   APPWRITE_API_KEY=your_production_server_api_key_with_database_scope
   ```
3. **Trigger Deployment**:
   - Push commit to `main` branch or click **Deploy** in Vercel Console.

---

## 4. Post-Deployment Smoke Test Protocol

1. **Authentication**: Register a new user, create a new business, verify session persistence across browser reload.
2. **POS Sale & Stock**: Add a product with stock 10, process a POS sale for 2 units, verify remaining stock is 8 and stock movement record is created.
3. **Invoice Generation**: Verify invoice document created with formatted fiscal year number (`INV-83/84-000001`).
4. **Payment & Reversal**: Log payment of 500 NRs, execute payment deletion, verify original payment is marked `VOIDED` and counter-entry `-500 NRs` is created with status `REVERSED`.
5. **Offline Mode**: Toggle browser offline in DevTools, create a sale, toggle online, verify automatic background sync.
