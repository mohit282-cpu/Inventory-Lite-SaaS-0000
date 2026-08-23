# Appwrite Console Setup & Manual Configuration Guide

This guide details all necessary manual configurations in the Appwrite Console required for the production deployment of **Inventory Lite SaaS**.

---

## 1. Project & Environment Credentials

1. Sign in to your **Appwrite Console** (Cloud or Self-Hosted).
2. Create a new project named `Inventory Lite SaaS`.
3. Copy the **Project ID** and set it in `.env.local`:
   ```env
   NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id_here
   NEXT_PUBLIC_APPWRITE_DATABASE_ID=inventory_lite_db
   APPWRITE_API_KEY=your_admin_api_key_here
   ```

---

## 2. API Key Configuration

To enable automated provisioning using `scripts/setup-appwrite.ts`:

1. Navigate to **Overview** -> **API Keys** -> **Create API Key**.
2. Name: `Inventory Lite Admin Key`.
3. Grant the following scopes:
   - `databases.read`, `databases.write`
   - `collections.read`, `collections.write`
   - `attributes.read`, `attributes.write`
   - `indexes.read`, `indexes.write`
   - `teams.read`, `teams.write`
   - `users.read`, `users.write`

---

## 3. Database & Collections Setup

Create Database `inventory_lite_db`. The 11 core collections and their primary configurations:

| Collection ID | Purpose | Document Security | Multi-Tenant Key |
|---|---|---|---|
| `users` | Extended User Profiles | Enabled | None (User-Scoped) |
| `businesses` | Business Tenant Root | Enabled | `$id` (Tenant ID) |
| `business_members` | Membership & Roles | Enabled | `businessId` |
| `categories` | Product Categories | Enabled | `businessId` |
| `products` | Product Inventory | Enabled | `businessId` |
| `stock_movements` | Stock Audit Logs | Enabled | `businessId` |
| `customers` | Customer Directory | Enabled | `businessId` |
| `sales` | Sales Transactions | Enabled | `businessId` |
| `sale_items` | Line Item Snapshots | Enabled | `businessId` |
| `invoices` | Generated Invoices | Enabled | `businessId` |
| `expenses` | Expense Records | Enabled | `businessId` |

---

## 4. Document Permissions & Security Rules

To enforce strict tenant isolation at the Appwrite database level (preventing cross-tenant data leaks):

1. For each tenant-scoped collection (`categories`, `products`, `stock_movements`, `customers`, `sales`, `sale_items`, `invoices`, `expenses`, `business_members`), set:
   - **Document Security**: `Enabled`
   - **Permissions**:
     - `Read`: `team:{businessId}`
     - `Create`: `team:{businessId}/owner`, `team:{businessId}/admin`, `team:{businessId}/staff`
     - `Update`: `team:{businessId}/owner`, `team:{businessId}/admin`
     - `Delete`: `team:{businessId}/owner`

> [!IMPORTANT]
> The service layer (`BaseService`) enforces `businessId` equality on every read/write operation as an additional, defense-in-depth layer.

---

## 5. Storage Buckets Configuration

Navigate to **Storage** in the Appwrite Console and create the following buckets:

### A. Product Images (`product_images`)
- **Bucket ID**: `product_images`
- **File Size Limit**: 5MB
- **Allowed Extensions**: `jpg`, `jpeg`, `png`, `webp`
- **Permissions**:
  - `Read`: `any` (Public image URLs)
  - `Create`/`Update`/`Delete`: `team:{businessId}`

### B. Business Logos (`business_logos`)
- **Bucket ID**: `business_logos`
- **File Size Limit**: 2MB
- **Allowed Extensions**: `jpg`, `jpeg`, `png`, `svg`
- **Permissions**:
  - `Read`: `any`
  - `Create`/`Update`/`Delete`: `team:{businessId}/owner`

### C. Generated Documents (`documents`)
- **Bucket ID**: `documents`
- **File Size Limit**: 10MB
- **Allowed Extensions**: `pdf`
- **Permissions**:
  - `Read`/`Create`/`Delete`: `team:{businessId}`

---

## 6. Automated Setup Script Execution

Once your `.env.local` contains `NEXT_PUBLIC_APPWRITE_PROJECT_ID` and `APPWRITE_API_KEY`, run:

```bash
npx ts-node scripts/setup-appwrite.ts
```

This will automatically create any missing collections, attributes, constraints, and indexes.

---

## 7. Web Platforms & CORS Configuration (Vercel & Web Domains)

If you encounter `Authentication Failed: Failed to fetch` when accessing your deployed web app on Vercel (e.g. `https://inventory-lite-saa-s-0000.vercel.app`), Appwrite is blocking CORS requests from unauthorized web origins.

To authorize your Vercel deployment:

1. Open your **Appwrite Console** (Cloud or Self-Hosted) and select project `Inventory Lite SaaS`.
2. Navigate to **Overview** -> Scroll down to the **Platforms** section.
3. Click **Add Platform** and choose **Web App**.
4. Set Name: `Vercel Production`.
5. Set Hostname: `inventory-lite-saa-s-0000.vercel.app` (or your custom domain / `localhost`).
6. Save the platform configuration.

> [!IMPORTANT]
> Also ensure the Vercel Project Settings -> **Environment Variables** contains:
> - `NEXT_PUBLIC_APPWRITE_PROJECT_ID` = `6a85664100023f1deffb`
> - `NEXT_PUBLIC_APPWRITE_ENDPOINT` = `https://fra.cloud.appwrite.io/v1`
> - `NEXT_PUBLIC_APPWRITE_DATABASE_ID` = `inventory_lite_db`

