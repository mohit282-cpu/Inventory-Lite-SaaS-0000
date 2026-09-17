# Inventory Lite SaaS — Backup & Disaster Recovery (DR) Specification

## 1. Overview & Objectives

To guarantee zero data loss and high availability for retail and wholesale business operations in production, Inventory Lite implements automated backup, snapshot retention, and disaster recovery procedures.

### Key Recovery Metrics
- **RPO (Recovery Point Objective)**: **≤ 1 Hour** (Continuous WAL + Hourly automated Appwrite Cloud database backups). Maximum potential data loss window during a complete datacenter outage is under 1 hour.
- **RTO (Recovery Time Objective)**:
  - **Frontend Instant Rollback**: **≤ 10 Seconds** (Vercel Instant Deployment Rollback).
  - **Database Point-in-Time Restore**: **≤ 30 Minutes** (Appwrite Snapshot Restoration & Validation).

---

## 2. Automated Backup Schedule & Retention Policy

| Backup Type | Frequency | Execution Time | Retention Period | Storage Location | Encryption |
| --- | --- | --- | --- | --- | --- |
| **Hourly Snapshot** | Every 1 Hour | XX:00 UTC | 24 Hours | Isolated Cloud Bucket (AES-256) | TLS 1.3 / AES-256 |
| **Daily Full Backup** | Every 24 Hours | 02:00 UTC | 30 Days | Multi-Region Cold Storage | AES-256 / KMS |
| **Weekly Archive** | Every Sunday | 03:00 UTC | 12 Months | Air-Gapped Secondary Cloud | KMS Envelope Encryption |
| **Monthly Disaster Backup** | 1st of Month | 04:00 UTC | 7 Years | Immutable Storage (WORM) | KMS Envelope Encryption |

---

## 3. Supported Data Backup Channels

1. **Appwrite Cloud Automated Console Backups**:
   - Automated daily database & bucket storage snapshots configured in Appwrite Console -> **Project Settings** -> **Backups**.

2. **CLI Data Export Script (`scripts/backup-restore.ts`)**:
   - Programmatic JSON/CSV document export utility covering all 39 business collections (`products`, `sales`, `invoices`, `payments`, `journal_entries`, `journal_lines`, `customers`, etc.).

---

## 4. Disaster Recovery & Restoration Procedures

### Scenario A: Accidental Data Deletion / Record Corruption
1. **Identify Incident Timestamp**: Pinpoint exact time of corruption.
2. **Execute Automated Restore Script**:
   ```bash
   npx ts-node scripts/backup-restore.ts --action=restore --file=backups/backup-2026-09-17.json --businessId=biz_target
   ```
3. **Validate Collection Balances**: Execute GL & Inventory reconciliation checks to ensure zero discrepancy between stock levels and financial journal entries.

### Scenario B: Complete Datacenter / Regional Infrastructure Failure
1. **Provision Fallback Appwrite Instance**: Spin up secondary Appwrite project in alternate region (e.g. Frankfurt -> Singapore / US-East).
2. **Import Backup Schema & Documents**:
   ```bash
   npx ts-node scripts/backup-restore.ts --action=restore-all --file=backups/full-prod-backup-latest.json
   ```
3. **Update Vercel Production Environment Variables**: Update `NEXT_PUBLIC_APPWRITE_ENDPOINT` and `NEXT_PUBLIC_APPWRITE_PROJECT_ID` in Vercel.
4. **Trigger Vercel Redeployment**: Production traffic transitions seamlessly to secondary region within RTO target (≤ 30 minutes).

---

## 5. Monthly Disaster Recovery Testing Protocol

To ensure disaster recovery procedures are battle-tested, the engineering team executes a **Monthly Disaster Recovery Test** on the 1st of every month:

1. **Create Test Tenant**: Provision `dr_test_business_01`.
2. **Inject Synthetic Transactions**: Seed 100 products, 500 sales, 500 invoices, 200 payments, and journal postings.
3. **Simulate Total Destruction**: Drop collection documents in test tenant environment.
4. **Execute Restoration**: Restore snapshot from secondary cloud backup.
5. **Verify Invariants**:
   - Stock quantities match pre-disruption ledger.
   - Financial totals (sales, payments, dues) reconcile to NPR 0.00 difference.
   - All invoice numbers remain strictly sequential and unique.
6. **Sign Off**: Record test result in DR Audit Log.
