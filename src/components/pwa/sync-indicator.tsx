'use client'

import { useOfflineSync } from '@/hooks/useOfflineSync'
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function SyncIndicator() {
  const { isOnline, isSyncing, pendingCount, failedCount, lastSyncedAt, syncNow } = useOfflineSync()

  const formattedLastSynced = lastSyncedAt
    ? formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })
    : 'Never'

  return (
    <div
      onClick={() => syncNow()}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer select-none"
      title={`Network Status: ${isOnline ? 'Online' : 'Offline'}. Last synced: ${formattedLastSynced}`}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
          <span className="text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300">
            Syncing...
          </span>
        </>
      ) : !isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-rose-700 dark:text-rose-300">
            Offline {pendingCount > 0 ? `(${pendingCount} pending)` : ''}
          </span>
        </>
      ) : failedCount > 0 ? (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-rose-700 dark:text-rose-300">{failedCount} failed sync</span>
        </>
      ) : (
        <>
          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-emerald-700 dark:text-emerald-300 hidden sm:inline">
            Online {pendingCount > 0 ? `(${pendingCount} pending)` : ''}
          </span>
        </>
      )}
    </div>
  )
}
