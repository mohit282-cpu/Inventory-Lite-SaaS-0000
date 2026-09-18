# FINANCIAL DISCREPANCY & OPERATIONAL INCIDENT RESPONSE PROCEDURE

**Project**: Inventory Lite SaaS  
**Document**: Standard Operating Procedure (SOP) — Incident Response  

---

## 1. Incident Classification Matrix

| Severity Level | Definition | Response Window | Action Lead |
|---|---|---|---|
| **P0 - Critical** | Financial corruption, cross-tenant leak, or complete database outage. | **Immediate (< 15 mins)** | Senior Staff Engineer / Lead Architect |
| **P1 - High** | Unposted GL journal entries, stock discrepancy > 5%, invoice rendering error. | **< 1 hour** | DevOps & Financial Systems Lead |
| **P2 - Medium** | Transient API timeout, non-critical report export delay. | **< 4 hours** | QA Lead / Software Engineer |
| **P3 - Low** | UI alignment tweak or minor localization typo. | Next release sprint | Frontend Developer |

---

## 2. Step-by-Step Incident Response Workflow

### Step 1: Containment & Isolation

1. If cross-tenant access or token leak is suspected:
   - Immediately revoke active sessions for affected user IDs in Appwrite Console.
   - Restrict compromised business account access status to `BLOCKED`.
2. If stock or payment corruption is detected:
   - Temporarily pause POS checkout for the affected tenant business.

### Step 2: Diagnostic & Log Inspection

1. Check operational event logs via `operationalLogger`:
   ```ts
   const criticalEvents = operationalLogger.getRecentEvents(businessId, 'CRITICAL');
   ```
2. Query `audit_logs` for recent mutations:
   ```ts
   const recentLogs = await auditLogService.listAuditLogs(businessId, { limit: 100 });
   ```

### Step 3: Automated Accounting & Stock Reconciliation

Run the automated tenant reconciliation engine to identify GL discrepancies or unposted transactions:
```ts
const report = await accountingReconciliationService.runFullTenantReconciliation(businessId, adminUserId);
```
- **Unposted Sales/Payments**: Automatically re-posted by the reconciliation engine.
- **Stock Ledger Discrepancies**: Reconciled against `stock_movements` history.

### Step 4: Resolution Verification & Post-Mortem

1. Execute full quality gate verification:
   ```bash
   npm run typecheck && npm test && npm run test:e2e
   ```
2. Document root cause, affected entities, fix applied, and preventive measure in `docs/postmortems/YYYY-MM-DD-incident-summary.md`.
