# Inventory Lite SaaS — Offline Engine & Distributed Sync Verification

## 1. Executive Summary

This document verifies the offline-first transactional engine, IndexedDB local persistence schema, sync queue processing, and multi-tab conflict resolution in **Inventory Lite SaaS**. The offline engine allows cashiers to process sales, log payments, and manage inventory when internet connectivity is intermittent, guaranteeing zero local cache corruption on server disconnects and zero duplicate replay transactions upon reconnection.

---

## 2. Local Database Architecture (Dexie v6)

- **Database Engine**: IndexedDB via Dexie v6 (`src/lib/offline/db.ts`).
- **Tables**:
  - `products`: Catalog cache indexed by `id, businessId, category, name, sku, barcode`
  - `sales`: Offline sale transactions indexed by `id, businessId, customerId, status, createdAt`
  - `customers`: Customer directory cache indexed by `id, businessId, name, phone`
  - `expenses`: Offline expense log indexed by `id, businessId, date, category`
  - `syncQueue`: Queued cloud transactions indexed by `id, businessId, status, entityType, createdAt`
  - `idempotencyRecords`: Persistent idempotency records indexed by `id, businessId, operationType, idempotencyKey, status`

---

## 3. Disconnected Sync & Local Cache Preservation (P1-8/9)

### Problem
Previously, cloud initialization (`initialSync`) wrapped server fetches in `.catch(() => [])`. If Appwrite returned a 401, 500, or network disconnect error, `initialSync` received empty arrays and wiped local IndexedDB tables.

### Fix Applied
Removed `.catch(() => [])` wrappers in `src/lib/offline/sync-engine.ts`. Network and server errors are caught at the outer sync loop. When internet connection is lost or server returns an error:
1. Existing local IndexedDB tables remain **100% intact**.
2. Sync queue items remain in `PENDING` state with incremented `retryCount` and recorded error messages.
3. Local cache continues to serve UI reads without displaying blank screens.

---

## 4. Multi-Tab Atomic Queue Reservation (P1-11)

### Problem
When multiple browser tabs are open, both tabs listen to IndexedDB changes and may invoke `syncEngine.processSyncQueue(businessId)` simultaneously, leading to parallel execution of identical sync items.

### Fix Applied
In `sync-engine.ts`, queue item processing claims items inside atomic Dexie read-write transactions:

```typescript
const claimed = await localDB.transaction('rw', localDB.syncQueue, async () => {
  const current = await localDB.syncQueue.get(item.id!)
  if (!current || current.status !== 'PENDING') return null
  await localDB.syncQueue.update(item.id!, { status: 'PROCESSING' })
  return current
})
```

If Tab A claims the item, Tab B sees `status === 'PROCESSING'` and skips execution. Interrupted sessions reset stuck `PROCESSING` items back to `PENDING` cleanly upon browser restart.

---

## 5. Offline Verification Suite Test Results

| Test Case | Scenario | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- |
| **Offline Sale Queueing** | Process sale while `navigator.onLine === false` | Sale stored in IndexedDB `sales` and `syncQueue` as `PENDING` | Item added to queue with `localTransactionId` |
| **Reconnection Sync** | Reconnect network (`syncEngine.processSyncQueue`) | Queue item sent to Appwrite with `idempotencyKey` and status updated to `SYNCED` | Item synced, cloud sale created |
| **Duplicate Sync Replay** | Replay already synced transaction | Server idempotency recognizes key and returns existing document without double stock deduction | Stock deducted once |
| **Multi-Device Stock Conflict**| Device A sells stock offline; Device B sells stock online | Reconnecting Device A detects insufficient stock conflict without driving stock negative | Conflict handled safely; stock remains $\ge 0$ |
| **Interrupted Sync Restart**| Browser closes while item status is `PROCESSING` | Startup reset restores item to `PENDING` and syncs cleanly | Item reset to `PENDING` and synced |
