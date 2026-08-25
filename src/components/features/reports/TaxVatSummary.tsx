"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { AlertCircle, Scale, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export interface TaxVatSummaryProps {
  salesTaxable: number
  outputVat: number
  purchasesTaxable: number
  inputVat: number
  creditNoteVatAdjustments?: number
  debitNoteVatAdjustments?: number
}

export function TaxVatSummary({
  salesTaxable,
  outputVat,
  purchasesTaxable,
  inputVat,
  creditNoteVatAdjustments = 0,
  debitNoteVatAdjustments = 0,
}: TaxVatSummaryProps) {
  const netOutputVat = Math.max(0, outputVat - creditNoteVatAdjustments)
  const netInputVat = Math.max(0, inputVat - debitNoteVatAdjustments)
  const netVatPosition = netOutputVat - netInputVat

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4 border-slate-200 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Scale className="h-5 w-5 text-indigo-600" /> Basic System Tax & 13% VAT Summary
        </CardTitle>
        <span className="text-[11px] font-extrabold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
          IRD 13% VAT Standard
        </span>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* IRD Disclaimer Notice */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-tight">
            <strong>System Summary Disclaimer:</strong> This is a system-generated VAT estimation summary based on recorded sales, returns, and purchase invoices. It does not automatically constitute an official IRD VAT Tax Return filing.
          </p>
        </div>

        {/* Output vs Input VAT Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sales Output VAT */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Output VAT (Sales & Billing)</span>
            <div className="space-y-1 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Taxable Sales:</span>
                <span className="font-mono font-semibold">{formatCurrency(salesTaxable)}</span>
              </div>
              <div className="flex justify-between text-emerald-900 font-bold">
                <span>Gross Output VAT (13%):</span>
                <span className="font-mono">{formatCurrency(outputVat)}</span>
              </div>
              {creditNoteVatAdjustments > 0 && (
                <div className="flex justify-between text-rose-700 text-[11px]">
                  <span>Less Credit Note VAT Adjustments:</span>
                  <span className="font-mono">-{formatCurrency(creditNoteVatAdjustments)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-emerald-950 pt-1.5 border-t border-emerald-200">
                <span>Net Output VAT Payable:</span>
                <span className="font-mono">{formatCurrency(netOutputVat)}</span>
              </div>
            </div>
          </div>

          {/* Purchases Input VAT */}
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block">Input VAT (Purchases & Stock Intake)</span>
            <div className="space-y-1 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Taxable Purchases:</span>
                <span className="font-mono font-semibold">{formatCurrency(purchasesTaxable)}</span>
              </div>
              <div className="flex justify-between text-indigo-900 font-bold">
                <span>Gross Input VAT (13%):</span>
                <span className="font-mono">{formatCurrency(inputVat)}</span>
              </div>
              {debitNoteVatAdjustments > 0 && (
                <div className="flex justify-between text-rose-700 text-[11px]">
                  <span>Less Debit Note VAT Adjustments:</span>
                  <span className="font-mono">-{formatCurrency(debitNoteVatAdjustments)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-indigo-950 pt-1.5 border-t border-indigo-200">
                <span>Net Input VAT Credit:</span>
                <span className="font-mono">{formatCurrency(netInputVat)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net VAT Position Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${
          netVatPosition >= 0
            ? 'bg-slate-900 text-white border-slate-800'
            : 'bg-emerald-900 text-white border-emerald-800'
        }`}>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Estimated Net VAT Position (Output VAT - Input VAT)
            </span>
            <span className="text-xs text-slate-400">
              {netVatPosition >= 0 ? 'Net VAT Liability to Tax Office' : 'Net Refundable Input VAT Credit'}
            </span>
          </div>

          <div className="text-right">
            <div className="text-xl sm:text-2xl font-extrabold font-mono">
              {formatCurrency(Math.abs(netVatPosition))}
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded inline-flex items-center gap-1 ${
              netVatPosition >= 0 ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'
            }`}>
              {netVatPosition >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {netVatPosition >= 0 ? 'Payable' : 'Credit Carryforward'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
