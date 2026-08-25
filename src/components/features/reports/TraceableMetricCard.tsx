"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { WhatDoesThisMean } from './WhatDoesThisMean'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, ListFilter } from 'lucide-react'
import Link from 'next/link'

export interface TraceableItem {
  id: string
  title: string
  subtitle?: string
  value: number
  date?: string
  url: string
}

export interface TraceableMetricCardProps {
  title: string
  amount: number
  amountColorClass?: string
  explanation: string
  termKey?: string
  viewLabel?: string
  items?: TraceableItem[]
  calculationFormula?: string
}

export function TraceableMetricCard({
  title,
  amount,
  amountColorClass = 'text-slate-900',
  explanation,
  termKey,
  viewLabel,
  items = [],
  calculationFormula,
}: TraceableMetricCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Card className="border border-slate-200 shadow-xs hover:border-slate-300 transition-all rounded-xl">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>{title}</span>
            {termKey && <WhatDoesThisMean termKey={termKey} />}
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-4 px-5 space-y-2">
          <div className={`text-2xl font-extrabold tracking-tight ${amountColorClass}`}>
            {formatCurrency(amount)}
          </div>
          <p className="text-xs text-slate-500 leading-normal">{explanation}</p>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
            {items.length > 0 ? (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors underline"
              >
                <ListFilter className="h-3.5 w-3.5" />
                {viewLabel || `View ${items.length} records`}
              </button>
            ) : (
              <span className="text-slate-400 font-medium">0 records</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drill-Down Itemized Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white border border-slate-200 shadow-lg rounded-xl p-6">
          <DialogHeader className="pb-3 border-b border-slate-100">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span>{title} Breakdown</span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                Total: {formatCurrency(amount)}
              </span>
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Itemized audit trace of the {items.length} record(s) contributing to this report metric.
            </p>
          </DialogHeader>

          {calculationFormula && (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-mono text-slate-700">
              <span className="font-bold text-slate-900 font-sans block mb-1">Calculation Formula:</span>
              {calculationFormula}
            </div>
          )}

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 block">{item.title}</span>
                  {item.subtitle && <span className="text-slate-500 block">{item.subtitle}</span>}
                  {item.date && <span className="text-[11px] text-slate-400 block">{item.date}</span>}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-slate-900 text-sm">{formatCurrency(item.value)}</span>
                  <Link
                    href={item.url}
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors"
                    title="View record details"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
