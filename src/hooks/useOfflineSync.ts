'use client'

import { useState, useEffect, useCallback } from 'react'
import { syncEngine } from '@/lib/offline/sync-engine'
import { localDB } from '@/lib/offline/db'
import { useAuth } from '@/context/auth-context'
import { useLiveQuery } from 'dexie-react-hooks'

export interface UseOfflineSyncResult {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  failedCount: number
  lastSyncedAt: string | null
  syncNow: () => Promise<void>
  retryFailed: () => Promise<void>
}

export function useOfflineSync(): UseOfflineSyncResult {
  const { activeBusiness } = useAuth()
  const businessId = activeBusiness?.$id || ''

  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  // Reactive Dexie query for pending sync items
  const syncQueueItems = useLiveQuery(
    () => (businessId ? localDB.syncQueue.where('businessId').equals(businessId).toArray() : []),
    [businessId]
  )

  const metadata = useLiveQuery(
    () => (businessId ? localDB.syncMetadata.get(businessId) : undefined),
    [businessId]
  )

  const pendingCount = (syncQueueItems || []).filter(
    (item) => item.status === 'PENDING' || item.status === 'SYNCING'
  ).length

  const failedCount = (syncQueueItems || []).filter((item) => item.status === 'FAILED').length

  const syncNow = useCallback(async () => {
    if (!businessId || isSyncing || typeof window === 'undefined' || !navigator.onLine) return

    setIsSyncing(true)
    try {
      await syncEngine.initialSync(businessId)
      await syncEngine.processSyncQueue(businessId)
    } finally {
      setIsSyncing(false)
    }
  }, [businessId, isSyncing])

  const retryFailed = useCallback(async () => {
    if (!businessId || isSyncing || typeof window === 'undefined' || !navigator.onLine) return

    setIsSyncing(true)
    try {
      const failedItems = (syncQueueItems || []).filter((item) => item.status === 'FAILED')
      for (const item of failedItems) {
        if (item.id) {
          await localDB.syncQueue.update(item.id, { status: 'PENDING', retryCount: 0 })
        }
      }
      await syncEngine.processSyncQueue(businessId)
    } finally {
      setIsSyncing(false)
    }
  }, [businessId, isSyncing, syncQueueItems])

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      if (businessId) {
        syncNow()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [businessId, syncNow])

  useEffect(() => {
    if (metadata?.lastSyncedAt) {
      setLastSyncedAt(metadata.lastSyncedAt)
    }
  }, [metadata])

  return {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    lastSyncedAt,
    syncNow,
    retryFailed,
  }
}
