# Inventory Lite SaaS — Final Clean Repository Tree

```text
Inventory-Lite-SaaS-0000/
├── README.md                           # Master project documentation
├── AGENTS.md                           # Development rules & guidelines
├── FINAL_REPOSITORY_TREE.md            # Final clean repository structure
├── package.json                        # Node dependencies & project scripts
├── package-lock.json                   # Locked dependency tree
├── next.config.js                      # Next.js & security headers configuration
├── tsconfig.json                       # TypeScript compiler settings
├── tailwind.config.ts                  # Tailwind CSS theme configuration
├── postcss.config.js                   # PostCSS plugins setup
├── playwright.config.ts                # Playwright E2E runner configuration
├── vitest.config.ts                    # Vitest unit test runner configuration
├── .eslintrc.json                      # ESLint rule configuration
├── .gitignore                          # Git file exclusions
├── .env.example                        # Safe environment variable template
│
├── docs/                               # Production documentation suite
│   ├── APPWRITE_SETUP.md              # Appwrite cloud database setup guide
│   ├── DATABASE_SCHEMA.md             # Complete database schema reference
│   ├── DEPLOYMENT.md                  # Pre-deployment validation & runbook
│   ├── architecture/                  # Architectural documentation
│   │   ├── TENANT_ISOLATION.md        # Multi-tenant isolation specifications
│   │   └── ZERO_COST_ARCHITECTURE.md  # Zero-cost infrastructure design
│   ├── security/                      # Security documentation
│   │   └── PERMISSIONS.md             # Role-based permissions matrix
│   ├── deployment/                    # Deployment procedures & checklists
│   │   ├── PRODUCTION_CONFIGURATION_CHECKLIST.md # Deployment checklist
│   │   └── ROLLBACK_RUNBOOK.md        # Production rollback runbook
│   └── archive/                       # Historical audit & verification reports
│       ├── CONCURRENCY_VERIFICATION.md
│       ├── FINAL_MASTER_AUDIT.md
│       ├── FINAL_PRODUCTION_HARDENING_REPORT.md
│       ├── FINAL_PRODUCTION_READINESS.md
│       ├── FINAL_PRODUCTION_READINESS_REPORT.md
│       ├── FINAL_REMAINING_ISSUES_REMEDIATION_REPORT.md
│       ├── FINAL_TEST_REPORT.md
│       ├── FINANCIAL_INTEGRITY_REPORT.md
│       ├── FINANCIAL_INTEGRITY_VERIFICATION.md
│       ├── INDEPENDENT_SECURITY_VERIFICATION.md
│       ├── INVENTORY_INTEGRITY_REPORT.md
│       ├── OFFLINE_SYNC_REPORT.md
│       ├── OFFLINE_SYNC_VERIFICATION.md
│       ├── P0_FIX_REPORT.md
│       ├── PRODUCTION_AUDIT.md
│       ├── SECURITY_AUDIT.md
│       ├── SECURITY_HARDENING_REPORT.md
│       └── SHOP_OWNER_QA_REPORT.md
│
├── public/                             # Public static web assets
│   ├── apple-touch-icon.png           # iOS PWA home icon
│   ├── favicon.ico                    # Browser favicon
│   ├── manifest.json                  # PWA manifest
│   ├── sw.js                          # Service Worker cache controller
│   └── icons/                         # PWA responsive icon set
│
├── scripts/                            # Provisioning & build scripts
│   ├── setup-appwrite.ts              # Automated database collection bootstrapper
│   ├── generate-pwa-icons.js          # PWA icon generator script
│   └── render-pwa-icons-playwright.js # Playwright icon rendering engine
│
├── e2e/                                # End-to-end integration tests
│   ├── example.spec.ts                # Basic layout E2E test
│   ├── inventory-lite-flow.spec.ts    # End-to-end user workflow test
│   └── offline-pos-sync.spec.ts       # Offline sales sync E2E test
│
└── src/                                # Application source code
    ├── app/                            # Next.js 14 App Router routes
    │   ├── layout.tsx                  # Root layout component
    │   ├── page.tsx                    # Landing page component
    │   ├── globals.css                 # Global CSS styles
    │   ├── (routes)/                   # Authenticated route groups
    │   │   ├── app/                    # POS & Inventory SaaS dashboard
    │   │   └── auth/                   # Authentication routes
    │   └── onboarding/                 # Initial business setup flow
    │
    ├── components/                     # React UI components
    │   ├── ui/                         # Base shadcn/ui components
    │   ├── features/                   # Business-logic UI components
    │   ├── landing/                    # Landing page components
    │   ├── layout/                     # Header, Sidebar, Nav components
    │   ├── auth/                       # Auth components
    │   └── pwa/                        # Offline status & install banners
    │
    ├── services/                       # Tenant-isolated service layer
    │   ├── base.service.ts             # Base service with tenant isolation & permission handling
    │   ├── auth.service.ts             # Authentication service
    │   ├── product.service.ts          # Stock & inventory service with CAS
    │   ├── sale.service.ts             # Billing & POS sale service
    │   ├── customer.service.ts         # Customer & Udharo ledger service
    │   ├── invoice.service.ts          # Invoice generation service
    │   ├── payment.service.ts          # Payment recording service
    │   └── ...                         # Expense, Category, User services
    │
    ├── lib/                            # Application utilities & security
    │   ├── appwrite.ts                 # Appwrite SDK client initialization
    │   ├── idempotency.ts              # Financial idempotency manager
    │   ├── security.ts                 # Security sanitization & hashing
    │   ├── error-handler.ts            # Error taxonomy & classification
    │   ├── money.ts                    # High-precision financial math
    │   ├── offline/                    # IndexedDB & sync engine
    │   │   ├── db.ts                   # Dexie local store schema
    │   │   └── sync-engine.ts          # Offline sync queue engine
    │   └── ...                         # Validations, localization, utils
    │
    ├── locales/                        # Internationalization strings
    │   ├── en.ts                       # English locale dictionary
    │   └── ne.ts                       # Nepali locale dictionary
    │
    ├── context/                        # React context providers
    │   └── auth-context.tsx            # Global session state machine
    │
    ├── test/                           # Automated Vitest test suite
    │   ├── tenant-isolation.test.ts    # Tenant security regression tests
    │   ├── utils.test.ts               # Core utility tests
    │   └── ...                         # 34 additional test suites
    │
    └── types/                          # TypeScript type definitions
        └── index.ts                    # Central domain type definitions
```
