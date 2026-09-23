"use client"

import { useState } from 'react'
import { AuditLogEntry } from '@/services/audit-log.service'
import { ShieldCheck, Eye, Copy, Check, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AuditTrailTabProps {
  logs: AuditLogEntry[]
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

function formatAuditTimestamp(ts: string | Date | undefined | null): string {
  if (!ts) return 'N/A'
  try {
    const d = typeof ts === 'string' ? new Date(ts) : ts
    if (isNaN(d.getTime())) return String(ts)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  } catch {
    return String(ts)
  }
}

function getEventBadgeColor(action: string): string {
  const act = (action || '').toUpperCase()
  if (act.includes('CANCEL') || act.includes('DELETE') || act.includes('VOID')) {
    return 'bg-red-50 text-red-700 border-red-200'
  }
  if (act.includes('PAYMENT') || act.includes('SETTLE')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  }
  if (act.includes('SALE') || act.includes('INVOICE')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200'
  }
  if (act.includes('PURCHASE')) {
    return 'bg-purple-50 text-purple-700 border-purple-200'
  }
  if (act.includes('STOCK') || act.includes('MOVEMENT')) {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200'
  }
  if (act.includes('EXPENSE')) {
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function formatMetadataSnippet(meta: Record<string, any> | undefined | null): string {
  if (!meta || Object.keys(meta).length === 0) return 'No metadata recorded'
  const entries = Object.entries(meta).slice(0, 3)
  return entries
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
}

export function AuditTrailTab({ logs, loading, onDrillDown }: AuditTrailTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/3" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            System Audit Trail &amp; Immutability Event Log
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable record of financial, billing, and inventory activity across the tenant.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Info className="h-3.5 w-3.5" />
            {logs.length} Audit Events Logged
          </span>
        </div>
      </div>

      {/* Desktop Audit Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-44">Timestamp</th>
                <th className="py-3 px-4 w-40">Event</th>
                <th className="py-3 px-4 w-32">Entity</th>
                <th className="py-3 px-4 w-36">User</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <p className="text-xs font-semibold">No system audit logs found for the selected period.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try changing the selected filters or fiscal year date range.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const truncatedUserId = log.userId ? `${log.userId.slice(0, 8)}...` : 'System'
                  const badgeClass = getEventBadgeColor(log.action)
                  const snippet = formatMetadataSnippet(log.metadata)

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-[11px] font-mono">
                        {formatAuditTimestamp(log.timestamp)}
                      </td>

                      {/* Event Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${badgeClass}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Target / Entity */}
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {log.target}
                      </td>

                      {/* User ID with Copy Action */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1 text-slate-600" title={log.userId}>
                          <span>{truncatedUserId}</span>
                          {log.userId && (
                            <button
                              type="button"
                              onClick={(e) => handleCopy(log.userId, e)}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors rounded"
                              aria-label="Copy User ID"
                            >
                              {copiedId === log.userId ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Details / Sanitized Metadata Snippet */}
                      <td className="py-3 px-4 text-[11px] text-slate-600 font-mono max-w-xs truncate">
                        {snippet}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onDrillDown(`Audit Event - ${log.action}`, log.id, log)}
                          className="h-7 text-[11px] font-bold gap-1 border-slate-300 text-slate-700 hover:text-indigo-600 hover:border-indigo-300"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Audit Cards */}
      <div className="md:hidden space-y-3">
        {logs.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            No system audit logs found for the selected period.
          </div>
        ) : (
          logs.map((log) => {
            const badgeClass = getEventBadgeColor(log.action)
            const snippet = formatMetadataSnippet(log.metadata)
            return (
              <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${badgeClass}`}>
                    {log.action}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatAuditTimestamp(log.timestamp)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-slate-900">{log.target}</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    User: {log.userId ? `${log.userId.slice(0, 8)}...` : 'System'}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 truncate">
                  {snippet}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onDrillDown(`Audit Event - ${log.action}`, log.id, log)}
                    className="h-8 text-xs font-bold gap-1 border-slate-300 text-slate-700 hover:text-indigo-600"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Event Details</span>
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

