"use client"


import { formatCurrency } from '@/lib/utils'
import { Percent, ShieldCheck } from 'lucide-react'

interface VatSummaryData {
  taxableSales: number
  outputVat: number
  taxablePurchases: number
  inputVat: number
  creditNotesVat: number
  debitNotesVat: number
  salesReturnsVat: number
  purchaseReturnsVat: number
  netVatPosition: number
  vatRate: number
}

interface VatSummaryTabProps {
  data: VatSummaryData | null
  loading: boolean
}

export function VatSummaryTab({ data, loading }: VatSummaryTabProps) {
  if (loading || !data) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  const netOutputVat = Math.max(0, data.outputVat - data.salesReturnsVat)

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-xl bg-emerald-950 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <Percent className="h-5 w-5 text-emerald-400" />
            Nepal Tax & VAT Audit Ledger (Standard 13% Rate Engine)
          </h2>
          <p className="text-xs text-emerald-200 mt-0.5">
            Traceable Output VAT vs Input VAT reconciliation for monthly and quarterly filing.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-emerald-900/80 px-3 py-1.5 rounded-lg border border-emerald-800 font-mono font-bold">
          Standard Tax Rate: {data.vatRate}%
        </div>
      </div>

      {/* Main Calculation Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Output VAT Column */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">1. Output VAT (Sales Tax)</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
              COLLECTED
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Gross Taxable Sales</span>
              <span className="font-bold text-slate-900">{formatCurrency(data.taxableSales)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Output VAT (13% on Sales)</span>
              <span className="font-extrabold text-emerald-600">{formatCurrency(data.outputVat)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 italic">
              <span>Less: Sales Return VAT</span>
              <span className="font-medium text-rose-600">-{formatCurrency(data.salesReturnsVat)}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-black text-slate-900">
              <span>Net Output VAT</span>
              <span className="text-emerald-700">{formatCurrency(netOutputVat)}</span>
            </div>
          </div>
        </div>

        {/* Input VAT Column */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">2. Input VAT (Purchases)</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-teal-100 text-teal-800">
              CLAIMABLE
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Taxable Purchases</span>
              <span className="font-bold text-slate-900">{formatCurrency(data.taxablePurchases)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Input VAT (13% on Purchases)</span>
              <span className="font-extrabold text-teal-600">{formatCurrency(data.inputVat)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 italic">
              <span>Less: Purchase Return VAT</span>
              <span className="font-medium text-slate-400">-{formatCurrency(data.purchaseReturnsVat)}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-black text-slate-900">
              <span>Net Claimable Input VAT</span>
              <span className="text-teal-700">{formatCurrency(data.inputVat)}</span>
            </div>
          </div>
        </div>

        {/* Net VAT Position */}
        <div className="bg-white p-5 rounded-xl border-2 border-indigo-500 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-indigo-900">3. Net VAT Position</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                TAX OFFICE DUE
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs text-slate-500">Formula: Net Output VAT − Eligible Input VAT</div>
              <div className="text-2xl font-black text-indigo-600 tracking-tight">
                {formatCurrency(data.netVatPosition)}
              </div>
              <p className="text-[11px] text-slate-600 mt-2">
                {data.netVatPosition > 0
                  ? 'Net VAT payable to the Inland Revenue Department (IRD) for this period.'
                  : 'Input VAT exceeds Output VAT. Eligible for VAT credit carry-forward.'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600" />
            <span>Traceable to line-level customer invoices and supplier bills.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
