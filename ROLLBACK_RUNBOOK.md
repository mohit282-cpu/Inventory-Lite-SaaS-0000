# Inventory Lite SaaS — Production Rollback Runbook

## 1. Rollback Trigger Criteria

A production rollback must be initiated immediately if any of the following P0 conditions are observed post-deployment:

- **P0-A**: Active data corruption or financial balance miscalculation.
- **P0-B**: Critical authentication outage preventing users from logging in or switching businesses.
- **P0-C**: Unresolved tenant isolation breach where Business A can view or edit Business B data.
- **P0-D**: Persistent application crash loop affecting over 5% of active user sessions.

---

## 2. Fast Rollback Procedure (Vercel Frontend)

1. **Log in** to Vercel Dashboard (`https://vercel.com`).
2. Navigate to **Inventory Lite SaaS Project** -> **Deployments**.
3. Locate the **previous stable deployment** (the deployment prior to the failing build).
4. Click the **`...`** menu next to the stable deployment and select **Instant Rollback**.
5. Confirm the rollback. Vercel Edge Network will route 100% of production traffic to the previous build within 10 seconds.

---

## 3. Database Snapshot Restoration (Appwrite Backend)

If database schema or document state corruption occurred:

1. **Log in** to Appwrite Console (`https://cloud.appwrite.io`).
2. Navigate to **Project Settings** -> **Backups & Restoration**.
3. Select the latest automated daily backup created prior to the incident timestamp.
4. Click **Restore Snapshot**.
5. Once restoration is complete, verify collection document counts and index statuses.

---

## 4. Git Safety Tag Reference & Repository Reversion

The git repository contains dedicated safety tags marking verified baseline states:

- `before-production-hardening`
- `before-final-production-hardening`
- `before-final-remediation`

To inspect or revert code locally to a safety tag:

```bash
# Fetch all tags
git fetch --tags

# Checkout baseline safety checkpoint tag
git checkout before-final-production-hardening

# Create hotfix branch from tag
git checkout -b hotfix/post-incident-remediation
```

---

## 5. Post-Rollback Verification Protocol

1. **Verify Vercel Status**: Confirm active deployment commit matches pre-deployment commit SHA.
2. **Execute Smoke Tests**: Test login, POS sale processing, invoice generation, and customer credit display.
3. **Notify Stakeholders**: Post incident summary to status page and document root cause in incident log.
