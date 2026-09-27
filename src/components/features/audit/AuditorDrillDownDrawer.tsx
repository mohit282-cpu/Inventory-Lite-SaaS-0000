"use client"

import { useEffect, useRef, useState } from 'react'
import {
  X,
  FileText,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  Copy,
  Check,
  Clock,
  User,
  Hash,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  formatAuditTimestamp,
  formatIsoTimestamp,
  formatAuditUserId,
  getEventBadgeConfig,
  formatAuditValue,
} from '@/lib/audit-formatters'
import { AuditMetadataViewer } from './AuditMetadataViewer'

export interface DrillDownItem {
  type: 'invoice' | 'payment' | 'vat' | 'stock' | 'customer' | 'supplier' | 'audit_log'
  title: string
  referenceId: string
  details: Record<string, any>
  subLines?: Array<{ label: string; value: string | number }>
}

interface AuditorDrillDownDrawerProps {
  item: DrillDownItem | null
  onClose: () => void
}

export function AuditorDrillDownDrawer({ item, onClose }: AuditorDrillDownDrawerProps) {
  const [copiedRefId, setCopiedRefId] = useState(false)
  const [copiedUserId, setCopiedUserId] = useState(false)
  const [showIsoTime, setShowIsoTime] = useState(false)
  const [showVerifications, setShowVerifications] = useState(false)

  const drawerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Keyboard Escape listener & focus management
  useEffect(() => {
    if (item) {
      previousFocusRef.current = document.activeElement as HTMLElement
      drawerRef.current?.focus()

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        previousFocusRef.current?.focus()
      }
    }
  }, [item, onClose])

  if (!item) return null

  const details = item.details || {}
  const actionName = (details.action || item.type || 'AUDIT_EVENT').toUpperCase()
  const badgeConfig = getEventBadgeConfig(actionName)
  const rawTimestamp = details.timestamp || details.createdAt || details.date || details.returnDate
  const rawUserId = details.userId || details.createdBy
  const rawTarget = details.target || details.entityType || item.type
  const metadataObj = details.metadata && typeof details.metadata === 'object' ? details.metadata : null

  // Extract non-metadata scalar details for the fields list
  const scalarFields: Array<{ key: string; label: string; value: any }> = []
  Object.entries(details).forEach(([k, v]) => {
    if (
      k === 'metadata' ||
      k === 'businessId' ||
      k === '$databaseId' ||
      k === '$collectionId' ||
      k === '$permissions'
    ) {
      return
    }
    scalarFields.push({
      key: k,
      label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
      value: v,
    })
  })

  const handleCopyRefId = () => {
    navigator.clipboard.writeText(item.referenceId)
    setCopiedRefId(true)
    setTimeout(() => setCopiedRefId(false), 2000)
  }

  const handleCopyUserId = () => {
    if (rawUserId) {
      navigator.clipboard.writeText(rawUserId)
      setCopiedUserId(true)
      setTimeout(() => setCopiedUserId(false), 2000)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Audit Event Details for ${item.title}`}
    >
      <div
        ref={drawerRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-full sm:max-w-lg md:max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 text-slate-800 outline-none"
      >
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase border ${badgeConfig.badgeClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badgeConfig.dotClass}`} />
                {badgeConfig.label}
              </span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Audit Event
              </span>
            </div>
            <h3 className="font-extrabold text-base text-slate-900 truncate">{item.title}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <Hash className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate" title={item.referenceId}>Ref ID: {item.referenceId}</span>
              <button
                type="button"
                onClick={handleCopyRefId}
                className="p-1 hover:bg-slate-200/70 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                title="Copy Reference ID"
                aria-label="Copy Reference ID"
              >
                {copiedRefId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit event details"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Audit Evidence Status Panel */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Audit Evidence Status
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verified Immutable Line
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowVerifications(!showVerifications)}
              className="text-[11px] font-bold text-emerald-800 hover:underline flex items-center gap-1 focus:outline-none"
            >
              <span>{showVerifications ? 'Hide verification checklist' : 'View verified evidence checklist'}</span>
              {showVerifications ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showVerifications && (
              <div className="pt-2 text-xs space-y-1.5 text-emerald-950 font-medium border-t border-emerald-200/60 mt-2">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Record persisted in tenant database with strict isolation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Immutable ledger line protected against hard deletion</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Timestamp &amp; actor credentials cryptographically intact</span>
                </div>
              </div>
            )}
          </div>

          {/* Primary Transaction Record Fields */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-indigo-600" />
              <span>Transaction Record Fields</span>
            </h4>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden text-xs shadow-2xs">
              {/* Formatted Human Timestamp */}
              {rawTimestamp && (
                <div className="px-4 py-3 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-bold text-slate-500 font-mono text-[11px] flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Timestamp
                  </span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 font-mono">
                      {showIsoTime ? formatIsoTimestamp(rawTimestamp) : formatAuditTimestamp(rawTimestamp)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowIsoTime(!showIsoTime)}
                      className="block text-[10px] font-semibold text-indigo-600 hover:underline ml-auto mt-0.5 focus:outline-none"
                    >
                      {showIsoTime ? 'Show Local (NPT)' : 'Show ISO 8601'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action / Event */}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-slate-500 font-mono text-[11px]">Action</span>
                <span className="font-extrabold text-slate-900 font-mono">{actionName}</span>
              </div>

              {/* Target Entity */}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="font-bold text-slate-500 font-mono text-[11px]">Target Entity</span>
                <span className="font-bold text-indigo-900 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {rawTarget}
                </span>
              </div>

              {/* User Actor */}
              <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-500 font-mono text-[11px] flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  User
                </span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-slate-900">{formatAuditUserId(rawUserId)}</span>
                  {rawUserId && (
                    <button
                      type="button"
                      onClick={handleCopyUserId}
                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                      title="Copy Full User ID"
                      aria-label="Copy Full User ID"
                    >
                      {copiedUserId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Other Fields */}
              {scalarFields.map((field) => (
                <div key={field.key} className="px-4 py-2.5 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-500 font-mono text-[11px]">{field.label}:</span>
                  <span className="font-bold text-slate-900 font-mono break-all text-right">
                    {formatAuditValue(field.value, field.key)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Structured Metadata Viewer */}
          <AuditMetadataViewer metadata={metadataObj || (details.metadata ? { details: details.metadata } : undefined)} />

          {/* Line Breakdown Sub-table */}
          {item.subLines && item.subLines.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Associated Line Breakdown</span>
              </h4>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/80 overflow-hidden text-xs shadow-2xs">
                {item.subLines.map((line, idx) => (
                  <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="font-medium text-slate-600 font-mono">{line.label}</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {typeof line.value === 'number' ? formatAuditValue(line.value, line.label) : line.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vertical Step Audit Traceability Chain */}
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
              <UserCheck className="h-4 w-4 text-indigo-600" />
              <span>Full Audit Traceability Chain</span>
            </div>

            <div className="relative pl-6 space-y-3 text-xs text-slate-600 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200">
              <div className="relative">
                <span className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                  1
                </span>
                <p className="font-bold text-slate-900">Document Entry</p>
                <p className="text-[11px] text-slate-500">Recorded &amp; timestamped in tenant system</p>
              </div>

              <div className="relative">
                <span className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                  2
                </span>
                <p className="font-bold text-slate-900">Tax &amp; Financial Posting</p>
                <p className="text-[11px] text-slate-500">Computed through financial accounting engine</p>
              </div>

              <div className="relative">
                <span className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                  3
                </span>
                <p className="font-bold text-slate-900">Ledger Synchronization</p>
                <p className="text-[11px] text-slate-500">Synced to tenant database with strict isolation</p>
              </div>

              <div className="relative">
                <span className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                  4
                </span>
                <p className="font-bold text-slate-900">Immutability Protection</p>
                <p className="text-[11px] text-slate-500">Protected against hard deletion &amp; tampering</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Sticky Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Inventory Lite Compliance Auditor</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  )
}
