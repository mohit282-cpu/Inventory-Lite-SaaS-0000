"use client"


import { InvoiceSequenceAudit } from '@/types'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

interface InvoiceSequenceTabProps {
  audit: InvoiceSequenceAudit | null
  loading: boolean
}

export function InvoiceSequenceTab({ audit, loading }: InvoiceSequenceTabProps) {
  if (loading || !audit) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Integrity Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${audit.isSequenceIntact ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {audit.isSequenceIntact ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              Invoice Sequence Status: {audit.isSequenceIntact ? 'Sequential & Duplicate Free' : 'Sequence Discrepancies Detected'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fiscal Year: <span className="font-bold text-slate-700">{audit.fiscalYear}</span> | Prefix:{' '}
              <span className="font-mono font-bold text-indigo-600">{audit.prefix}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            Total Issued: {audit.totalIssued}
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
            Total Cancelled: {audit.totalCancelled}
          </span>
        </div>
      </div>

      {/* Grid of Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">First Invoice Issued</div>
          <div className="text-base font-mono font-extrabold text-indigo-600 mt-1">
            {audit.firstInvoiceNumber || 'None'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Last Invoice Issued</div>
          <div className="text-base font-mono font-extrabold text-indigo-600 mt-1">
            {audit.lastInvoiceNumber || 'None'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Duplicates Detected</div>
          <div
            className={`text-base font-extrabold mt-1 ${
              audit.duplicatesDetected.length > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {audit.duplicatesDetected.length > 0 ? `${audit.duplicatesDetected.length} DUPLICATES` : '0 Duplicates (Safe)'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Sequence Gaps</div>
          <div
            className={`text-base font-extrabold mt-1 ${
              audit.gapsDetected.length > 0 ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {audit.gapsDetected.length > 0 ? `${audit.gapsDetected.length} GAPS` : '0 Gaps (Continuous)'}
          </div>
        </div>
      </div>

      {/* Sequence Gaps Card if any */}
      {audit.gapsDetected.length > 0 && (
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-2">
          <div className="font-extrabold flex items-center gap-2 text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Sequence Gaps Identified in Fiscal Year {audit.fiscalYear}
          </div>
          <div className="flex flex-wrap gap-2 pt-1 font-mono">
            {audit.gapsDetected.map((gap, idx) => (
              <span key={idx} className="px-2 py-1 rounded bg-amber-200 text-amber-950 font-bold">
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
