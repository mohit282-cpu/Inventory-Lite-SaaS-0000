"use client"


import { AuditLogEntry } from '@/services/audit-log.service'
import { ShieldCheck, ExternalLink } from 'lucide-react'

interface AuditTrailTabProps {
  logs: AuditLogEntry[]
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

export function AuditTrailTab({ logs, loading, onDrillDown }: AuditTrailTabProps) {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            System Audit Trail & Immutability Event Log
          </h3>
          <span className="text-xs text-slate-500 font-medium">{logs.length} audit events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target / Entity</th>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Sanitized Metadata</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    No system audit logs found for the selected period.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-sans text-[11px]">{log.timestamp}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase font-sans">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-sans">{log.target}</td>
                    <td className="py-3 px-4 text-slate-600">{log.userId}</td>
                    <td className="py-3 px-4 text-slate-500 text-[10px] max-w-xs truncate">
                      {JSON.stringify(log.metadata || {})}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <button
                        type="button"
                        onClick={() => onDrillDown(`Audit Event - ${log.action}`, log.id, log)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
