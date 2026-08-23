# Zero-Cost Infrastructure & MVP Architecture Guide — Inventory Lite SaaS

## Overview

Inventory Lite is architected to operate at **NPR 0 in monthly infrastructure and software costs** during its initial MVP phase. The target audience of small retail and wholesale shop owners in Nepal requires a lean, affordable business validation model before scaling infrastructure.

---

## 1. Zero-Cost Technology Stack

| Layer | Technology | Cost Tier | Purpose |
| --- | --- | --- | --- |
| **Frontend & Hosting** | Vercel Free | Free Tier (Hobby) | Next.js SSG/SSR hosting, global CDN, automatic GitHub deployments |
| **Backend & BaaS** | Appwrite Cloud / Self-Hosted | Free Tier / Open-Source | User Auth, Document Database (TablesDB), File Storage, Functions |
| **Source Control** | GitHub Free | Free Tier | Git repository, version control, automated build triggers |
| **DNS & Security (Optional)** | Cloudflare Free | Free Tier | Custom domain DNS routing, free SSL/TLS, DDoS protection |
| **UI Design System** | Tailwind CSS + shadcn/ui | Free / Open-Source | Utility styling, accessible UI primitives, Lucide icons |
| **Frontend Framework** | Next.js 14 (React 18) | Free / Open-Source | React App Router, client/server rendering, static generation |
| **Data Validation** | Zod + React Hook Form | Free / Open-Source | Type-safe form validation and API schema enforcement |
| **Data Analytics/Charts** | Recharts | Free / Open-Source | Clean canvas/SVG client-side sales trend visualization |
| **Testing** | Vitest + Playwright | Free / Open-Source | Unit testing (72 tests) and end-to-end multi-tenant user flows |

---

## 2. Infrastructure Cost Audit Report

### Cost Status: **NPR 0 / month**

| Service / Dependency | Purpose | Free Option / Tier | Paid Service Required? |
| --- | --- | --- | --- |
| **Vercel** | Frontend Web Hosting | Yes (Vercel Hobby Free) | **No** |
| **Appwrite** | Database, Storage, Auth | Yes (Appwrite Cloud Free / Self-Hosted) | **No** |
| **GitHub** | Source Code & Actions | Yes (GitHub Free) | **No** |
| **Cloudflare** | DNS & Free SSL | Yes (Cloudflare Free Plan) | **No (Optional)** |
| **AI Services** | Business AI Features | None needed for core MVP | **No** |
| **Paid Email Provider** | Auth / Invoicing Email | Not needed (Appwrite SMTP / Client Invoicing) | **No** |
| **Paid Analytics** | User Analytics | Not needed (Privacy-friendly Vercel Web Vitals) | **No** |
| **Paid Error Monitoring** | Error Tracking | Not needed (Structured console & Vercel build logs) | **No** |
| **Paid PDF API** | Invoice PDF Generation | Not needed (`@media print` browser PDF printing) | **No** |
| **Paid CDN / Storage** | Product Image CDN | Not needed (Appwrite Storage Bucket) | **No** |

---

## 3. Cost Control & Free-Tier Optimization Strategy

### A. Database Optimization
- **Indexed Tenant Queries**: Every database read/write query explicitly includes `.equal('businessId', businessId)` and indexed attributes (`sku`, `barcode`, `createdAt`).
- **Pagination**: All listing queries limit results (`Query.limit(10)`, `Query.limit(50)`). Thousands of records are never loaded in a single request.
- **Client Caching**: Shared business context and memberships are memoized via React `AuthProvider` to eliminate repeated Appwrite session lookups.

### B. Storage Optimization
- **File Upload Limits**: Product images are restricted to max **5MB** (recommended <2MB) and validated against allowed image MIME types (`image/jpeg`, `image/png`, `image/webp`).
- **Zero Paid Media Hosting**: Images and documents are served directly via Appwrite Storage buckets without external image transformation services.

### C. PDF & Invoice Printing
- **Browser-Native Printing**: Invoices use client-side CSS print stylesheets (`@media print`) and layout templates (A4 Tax Invoice & 80mm Thermal Receipt).
- **Zero Paid PDF Services**: Eliminates external PDF rendering APIs (e.g. DocRaptor, PDFShift).

### D. Email & Notifications
- **Appwrite Built-in Auth**: Login, signup, password resets, and email verification utilize Appwrite's built-in mailer settings.
- **No Third-Party Paid Transactional Email**: Architecture avoids SendGrid, Mailgun, or Postmark fees.

---

## 4. Free-Tier Quota Monitoring & Fallback Strategy

*Note: Verify each provider's current free-tier limits prior to production launch.*

1. **Vercel Free Tier**:
   - Bandwidth: 100 GB/month
   - Build Execution: 6,000 minutes/month
   - *Fallback*: If bandwidth limit is approached, enable Cloudflare CDN caching for static assets or optimize image sizes.

2. **Appwrite Cloud Free Tier**:
   - Database Reads/Writes: Generous free quota per month
   - File Storage: 2 GB free bucket storage
   - *Fallback*: If storage approaches 2 GB, run an automated cleanup script for unreferenced draft uploads or self-host Appwrite on a $3-5/mo VPS (or free Oracle Cloud ARM instance).

3. **Domain Strategy**:
   - The application functions on Vercel's default free domain (e.g., `inventory-lite.vercel.app`).
   - If a custom `.com.np` domain is added later, registration for `.com.np` domains is free in Nepal for registered businesses.

---

## 5. Environment Configuration

### Public Variables (`NEXT_PUBLIC_`):
Safe for browser exposure:
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_API_KEY` (Appwrite Client Key)

### Security Rules:
- Secrets are never hardcoded or committed to source control.
- `.env.local` is listed in `.gitignore`.
