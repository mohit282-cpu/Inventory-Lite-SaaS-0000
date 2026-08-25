"use client"

import React from 'react'
import { IrdReadinessStatus } from '@/types'
import { ShieldCheck, Building2, FileCheck2, Info } from 'lucide-react'

interface IrdReadinessTabProps {
  status: IrdReadinessStatus | null
  loading: boolean
}

export function IrdReadinessTab({ status, loading }: IrdReadinessTabProps) {
  if (loading || !status) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-5 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-extrabold">Inland Revenue Department (IRD) Readiness Overview</h2>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Electronic Billing Readiness & Taxpayer Compliance Profile
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {status.electronicBillingStatus}
          </span>
        </div>
      </div>

      {/* Taxpayer Profile Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="h-4 w-4 text-indigo-600" />
          Taxpayer Profile & Fiscal Identification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Business Name</span>
            <div className="font-extrabold text-slate-900 text-sm mt-1">{status.businessName}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">PAN Number</span>
            <div className="font-mono font-extrabold text-indigo-600 text-sm mt-1">{status.panNumber}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">VAT Registration</span>
            <div className="font-mono font-extrabold text-emerald-600 text-sm mt-1">{status.vatNumber}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Fiscal Year</span>
            <div className="font-extrabold text-slate-900 text-sm mt-1">{status.currentFiscalYear}</div>
          </div>
        </div>
      </div>

      {/* CBMS Integration Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-slate-700" />
            Central Billing Monitoring System (CBMS) Integration Architecture
          </h3>
          <span className="px-2.5 py-1 rounded text-xs font-extrabold bg-slate-100 text-slate-700 font-mono">
            Status: {status.cbmsIntegrationStatus}
          </span>
        </div>

        {/* Regulatory Truth Banner */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Compliance Status Notice:</p>
            <p>
              Inventory-Lite is engineered for <strong>Technical & Electronic Billing Readiness</strong>. Direct CBMS real-time API sync is currently <span className="font-extrabold text-amber-950">NOT CONFIGURED</span> for this environment. Official IRD listing occurs upon verified API endpoint pairing.
            </p>
          </div>
        </div>

        {/* CBMS Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Submissions</div>
            <div className="font-extrabold text-slate-900 text-sm mt-1">{status.cbmsSubmissionCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-[10px] font-bold text-emerald-700 uppercase">Accepted</div>
            <div className="font-extrabold text-emerald-800 text-sm mt-1">{status.cbmsAcceptedCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="text-[10px] font-bold text-amber-700 uppercase">Pending</div>
            <div className="font-extrabold text-amber-800 text-sm mt-1">{status.cbmsPendingCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
            <div className="text-[10px] font-bold text-rose-700 uppercase">Failed</div>
            <div className="font-extrabold text-rose-800 text-sm mt-1">{status.cbmsFailedCount}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
