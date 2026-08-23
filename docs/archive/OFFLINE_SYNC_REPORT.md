# Offline Mode & Distributed Transaction Synchronization Report

## 1. Executive Summary

This report documents the comprehensive audit and hardening of **Inventory Lite's Offline Synchronization Subsystem** as a distributed transaction processing system.

Offline mode was upgraded from a basic local queue into a resilient, distributed transaction log with strict guarantees against data corruption, negative inventory, double-charging, and silent overwrites.

---

## 2. Hardened Architecture & Schema

### 2.1 Sync Queue Record Schema (`SyncQueueItem`)
Every offline transaction queued in IndexedDB (`Dexie`) contains the mandatory metadata fields required for distributed tracking:
- `localTransactionId`: Unique client-generated transaction UUID (`entityId`).
- `idempotencyKey`: Serverless duplicate-prevention key passed with creation payloads.
- `businessId`: Tenant isolation boundary enforcing business scoping.
- `userId`: Authenticated user who performed the offline action.
- `entityType`: Document domain (`sale`, `customer`, `payment`, `product`, `stock`, `expense`).
- `operation`: Transaction operation (`CREATE`, `UPDATE`, `DELETE`).
- `payload`: Transaction payload including items, amounts, and customer references.
- `status`: State machine indicator (`PENDING | PROCESSING | SYNCED | FAILED | CONFLICT`).
- `retryCount`: Exponential retry counter (capped at 4 retries).
- `errorMessage`: Error description for failed or conflicting transactions.
- `serverId`: Cloud document ID returned after successful server sync.

### 2.2 Transaction State Machine Transitions
```
                ┌──────────────┐
                │   PENDING    │
                └──────┬───────┘
                       │ (Process Queue Start / Reconnect)
                       ▼
                ┌──────────────┐
                │  PROCESSING  │
                └──────┬───────┘
        ┌──────────────┼──────────────┐
        │ (Success)    │ (Stock/Data  │ (Transient Network Error)
        ▼              │  Conflict)   ▼
 ┌────────────┐        ▼       ┌────────────┐
 │  SYNCED    │  ┌──────────┐  │ PENDING /  │ (retryCount >= 4)
 └────────────┘  │ CONFLICT │  │   FAILED   │ ────────────────► FAILED
                 └──────────┘  └────────────┘
```

---

## 3. Distributed Conflict & Reliability Hardening

1. **Anti-Blind Overwrite Rule**:
   - Offline transactions are never blindly replayed without server validation.
   - When Device A syncs an offline sale, the server verifies current stock via Compare-And-Swap (CAS). If Device B depleted stock while Device A was offline, the server rejects the sale with `Insufficient stock`. `SyncEngine` marks Device A's queue item as `CONFLICT`, leaving server stock untouched and positive.
2. **Interrupted Session Recovery**:
   - On `SyncEngine.processSyncQueue()` startup, any queue items left in `PROCESSING` status (due to browser refresh, tab close, or device power loss mid-sync) are automatically reset back to `PENDING` for safe retry.
3. **Persistent Serverless Idempotency**:
   - Replaying the same offline queue item multiple times transmits the `idempotencyKey`. The server detects the key, returns the existing document, and updates the queue item status to `SYNCED` with `serverId` attached without double-deducting stock.
4. **Partial Sync Resilience**:
   - If the network drops halfway through processing a batch of queued transactions, items already synced remain `SYNCED`. Interrupted items drop back to `PENDING` and resume seamlessly on the next reconnect event.

---

## 4. Empirical Verification & Test Results

### 4.1 Automated Test Suite (`src/test/offline-distributed-sync.test.ts`)
| Test Scenario | Result | Key Assertion |
| :--- | :--- | :--- |
| **Multi-Device Conflict (Device A Offline Sale vs Device B Online Sale)** | PASSED | Initial stock = 10. Device A offline sells 7, Device B online sells 7. Device A reconnects -> Sync fails safely with `CONFLICT`, server stock remains 3 (never negative -4). |
| **Duplicate Synchronization Replay** | PASSED | Replaying the same sale sync item twice detects idempotency key and leaves stock deducted once (45/50). |
| **Browser Restart During Pending Sync** | PASSED | Stuck `PROCESSING` queue items are reset to `PENDING` on startup and synced successfully. |
| **Network Failure Halfway Through Sync** | PASSED | Batch processing halts cleanly on network drop; completed items remain `SYNCED` and pending items resume on reconnect. |

### 4.2 Full System Diagnostics
- **Vitest Unit & Integration Suite**: 34 test files passed (215/215 tests passed).
- **TypeScript Typecheck (`npm run typecheck`)**: 0 errors.
- **ESLint (`npm run lint`)**: 0 warnings or errors.
- **Next.js Production Build (`npm run build`)**: Compiled 100% successfully.
