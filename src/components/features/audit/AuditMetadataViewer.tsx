"use client"

import { useState } from 'react'
import { Copy, Check, Code, Table as TableIcon } from 'lucide-react'
import { formatAuditValue } from '@/lib/audit-formatters'

interface AuditMetadataViewerProps {
  metadata?: Record<string, any> | null
  title?: string
}

export function AuditMetadataViewer({ metadata, title = 'Metadata' }: AuditMetadataViewerProps) {
  const [viewRaw, setViewRaw] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!metadata || typeof metadata !== 'object' || Object.keys(metadata).length === 0) {
    return (
      <div className="space-y-1.5">
        <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">{title}</h4>
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 font-mono italic">
          No metadata recorded
        </div>
      </div>
    )
  }

  const jsonString = JSON.stringify(metadata, null, 2)

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const renderNestedValue = (val: any, keyName: string): React.ReactNode => {
    if (val === null || val === undefined) {
      return <span className="text-slate-400 italic">Not provided</span>
    }
    if (typeof val === 'boolean') {
      return (
        <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-bold ${val ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
          {val ? 'true' : 'false'}
        </span>
      )
    }
    if (typeof val === 'number') {
      return <span className="font-mono text-slate-900 font-bold">{formatAuditValue(val, keyName)}</span>
    }
    if (typeof val === 'string') {
      return <span className="font-mono text-slate-800 break-all whitespace-pre-wrap">{val}</span>
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-slate-400 italic">Empty List</span>
      return (
        <div className="space-y-1">
          {val.map((item, idx) => (
            <div key={idx} className="pl-2 border-l-2 border-slate-200 text-xs">
              {renderNestedValue(item, `${keyName}_${idx}`)}
            </div>
          ))}
        </div>
      )
    }
    if (typeof val === 'object') {
      return (
        <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 bg-slate-50/70 overflow-hidden my-1">
          {Object.entries(val).map(([subKey, subVal]) => (
            <div key={subKey} className="px-3 py-1.5 flex flex-wrap items-baseline justify-between text-xs gap-2">
              <span className="font-semibold text-slate-500 text-[11px] font-mono">{subKey}:</span>
              <div className="text-right">{renderNestedValue(subVal, subKey)}</div>
            </div>
          ))}
        </div>
      )
    }
    return <span className="font-mono text-slate-800 break-all">{String(val)}</span>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">{title}</h4>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewRaw(!viewRaw)}
            className="p-1 px-2 rounded-md text-[11px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors flex items-center gap-1"
            title="Toggle between Formatted Table and Raw JSON"
          >
            {viewRaw ? <TableIcon className="h-3 w-3 text-indigo-600" /> : <Code className="h-3 w-3 text-indigo-600" />}
            <span>{viewRaw ? 'Structured View' : 'JSON'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 px-2 rounded-md text-[11px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors flex items-center gap-1"
            title="Copy formatted JSON metadata to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-slate-500" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {viewRaw ? (
        <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-60 scrollbar-thin shadow-inner border border-slate-800 whitespace-pre">
          {jsonString}
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden text-xs shadow-2xs">
          {Object.entries(metadata).map(([key, val]) => (
            <div key={key} className="px-4 py-2.5 flex flex-wrap items-baseline justify-between gap-2 hover:bg-slate-50/50 transition-colors">
              <span className="font-bold text-slate-600 font-mono text-[11px] capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
              </span>
              <div className="text-right max-w-full font-mono">
                {renderNestedValue(val, key)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
