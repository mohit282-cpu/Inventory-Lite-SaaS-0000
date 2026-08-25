"use client"

import React from 'react'
import { X, FileText, CheckCircle, UserCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface DrillDownItem {
  type: 'invoice' | 'payment' | 'vat' | 'stock' | 'customer' | 'supplier'
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
  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-500 font-mono">Ref ID: {item.referenceId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Badge */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Audit Evidence Status</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle className="h-3.5 w-3.5" /> Verified Immutable Line
            </span>
          </div>

          {/* Details Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Transaction Record Fields</h4>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden text-xs">
              {Object.entries(item.details).map(([key, val]) => (
                <div key={key} className="px-4 py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="font-bold text-slate-900 text-right">
                    {typeof val === 'number' && key.toLowerCase().includes('amount') ? formatCurrency(val) : String(val ?? 'N/A')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sublines / Breakdown */}
          {item.subLines && item.subLines.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Associated Line Breakdown</h4>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 overflow-hidden text-xs">
                {item.subLines.map((line, idx) => (
                  <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="font-medium text-slate-600">{line.label}</span>
                    <span className="font-bold text-slate-900">
                      {typeof line.value === 'number' ? formatCurrency(line.value) : line.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Chain Traceability */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
              <UserCheck className="h-4 w-4 text-indigo-600" />
              <span>Full Audit Traceability Chain</span>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>1. Document Entry:</span>
                <span className="font-semibold text-slate-900">Recorded</span>
              </div>
              <div className="flex items-center justify-between">
                <span>2. Tax & VAT Lines:</span>
                <span className="font-semibold text-slate-900">Computed (13% Standard)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>3. Ledger Posting:</span>
                <span className="font-semibold text-slate-900">Synced to Tenant DB</span>
              </div>
              <div className="flex items-center justify-between">
                <span>4. Immutability:</span>
                <span className="font-semibold text-slate-900">Protected against hard delete</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Inventory-Lite Compliance Auditor</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs shadow-xs"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  )
}
