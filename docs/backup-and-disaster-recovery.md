# BACKUP AND DISASTER RECOVERY RUNBOOK

**Project**: Inventory Lite SaaS  
**Version**: 1.0  
**Target Platform**: Appwrite Cloud / Self-Hosted Appwrite + Vercel  

---

## 1. Overview & Objectives

This runbook documents the data protection, backup frequency, recovery procedure, Recovery Point Objective (RPO), and Recovery Time Objective (RTO) for Inventory Lite SaaS.

### Core Metrics

- **Recovery Point Objective (RPO)**: **< 1 hour** (Daily automated database snapshots + real-time audit event logging).
- **Recovery Time Objective (RTO)**: **< 2 hours** (Automated script-driven database schema & document restore).

---

## 2. Data Protection & Backup Strategy

Inventory Lite SaaS data consists of:
1. **Appwrite Database Collections** (`inventory_lite_db`): Documents across sales, products, customers, suppliers, purchases, accounting, audit logs, and idempotency keys.
2. **Appwrite Storage Buckets**: Invoices, receipts, logo assets, and exported reports.

### Automated Backup Mechanisms

- **Appwrite Cloud Native Backups**: Daily automated database snapshots managed by Appwrite Cloud infrastructure.
- **Export Utility Tooling**: Admin CLI export script for offline database dumps:
  ```bash
  npx tsx scripts/export-database.ts --businessId=<BUSINESS_ID> --output=./backups/
  ```

---

## 3. Disaster Recovery Procedure

### Scenario A: Accidental Document Deletion or Corruption

1. **Identify Corrupted Scope**: Filter `audit_logs` by `businessId` and timestamp to locate affected entity IDs:
   ```ts
   const auditTrail = await auditLogService.getEntityAuditTrail(businessId, entityType, entityId);
   ```
2. **Execute Point-In-Time Restoration**:
   - For non-destructively voided or cancelled sales/payments, invoke administrative reversal or un-void handle.
   - For deleted metadata, re-import missing documents using the latest exported database snapshot.

### Scenario B: Complete Database Disaster (Cloud Project Outage)

1. **Provision New Appwrite Database Instance**:
   ```bash
   npx tsx scripts/setup-appwrite.ts
   ```
2. **Restore Collections & Documents from Backup Dumps**:
   ```bash
   npx tsx scripts/restore-database.ts --input=./backups/latest_dump.json
   ```
3. **Run Tenant Accounting & Stock Reconciliation Scan**:
   ```ts
   const report = await accountingReconciliationService.runFullTenantReconciliation(businessId, userId);
   ```
4. **Verify Tenant Isolation & System Readiness**:
   ```bash
   npm test src/test/tenant-isolation.test.ts
   ```

---

## 4. Tenant Data Export & Compliance

For IRD/tax compliance or tenant data portability requests:
```bash
npx tsx scripts/export-records.ts --businessId=<BUSINESS_ID> --fiscalYear=81-82
```
This generates an encrypted ZIP archive containing JSON and CSV dumps of all sales, invoices, purchases, payments, and general ledger journal entries.
