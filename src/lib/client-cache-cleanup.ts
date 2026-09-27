/**
 * Client-Side Cache Cleanup Utility
 * 
 * Ensures complete removal of cached business data, user preferences,
 * authentication tokens, IndexedDB databases, and service-worker cache
 * after account or business deletion.
 */

export async function clearClientAppData(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // 1. Clear LocalStorage
    localStorage.clear()
  } catch (err) {
    console.warn('[Cache Cleanup] Failed to clear localStorage:', err)
  }

  try {
    // 2. Clear SessionStorage
    sessionStorage.clear()
  } catch (err) {
    console.warn('[Cache Cleanup] Failed to clear sessionStorage:', err)
  }

  try {
    // 3. Clear Service Worker Cache API
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    }
  } catch (err) {
    console.warn('[Cache Cleanup] Failed to clear Service Worker caches:', err)
  }

  try {
    // 4. Clear IndexedDB databases if present
    if ('indexedDB' in window && typeof window.indexedDB.databases === 'function') {
      const dbs = await window.indexedDB.databases()
      for (const db of dbs) {
        if (db.name) {
          try {
            window.indexedDB.deleteDatabase(db.name)
          } catch {
            // Ignore individual DB deletion failures
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Cache Cleanup] Failed to clear IndexedDB:', err)
  }
}
