import React from 'react'
import {
  Notebook,
  FileSpreadsheet,
  Calculator,
  MessageSquare,
  FileText,
  Check,
  X,
  Package,
  Boxes,
  ShoppingCart,
  Users,
} from 'lucide-react'

const BEFORE_ITEMS = [
  { icon: Notebook, text: 'Paper notebooks with crossed-out prices' },
  { icon: FileSpreadsheet, text: 'Un-synced Excel spreadsheets' },
  { icon: Calculator, text: 'Manual phone calculator tallying' },
  { icon: MessageSquare, text: 'WhatsApp messages for stock inquiries' },
  { icon: FileText, text: 'Handwritten paper bill pads' },
]

const AFTER_ITEMS = [
  { icon: Package, text: 'Single product catalog with SKUs & rates' },
  { icon: Boxes, text: 'Automatic stock level deductions' },
  { icon: ShoppingCart, text: 'Instant POS sale recording' },
  { icon: Users, text: 'Clear customer due (Udharo) ledgers' },
  { icon: FileText, text: 'Printable A4 & thermal tax invoices' },
]

export function LandingProblemSolution() {
  return (
    <section className="py-16 sm:py-24 bg-white text-slate-900 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-14 text-left">
          <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
            The Everyday Reality
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mt-2 leading-[1.15]">
            Running a shop shouldn&apos;t mean keeping five different records.
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            When stock numbers live in paper registers and customer dues live in notebooks, simple daily sales become unnecessarily stressful.
          </p>
        </div>

        {/* Editorial Before / After Contrast Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Before Column */}
          <div className="p-6 sm:p-8 rounded-xl bg-slate-50 border border-slate-200 space-y-6">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
              <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </div>
              <span>Before Inventory Lite</span>
            </div>

            <div className="space-y-3">
              {BEFORE_ITEMS.map((item, idx) => {
                const Icon = item.icon
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700">
                    <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{item.text}</span>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
              Result: Unclear stock levels, forgotten customer debts, and slow checkout lines.
            </p>
          </div>

          {/* After Column */}
          <div className="p-6 sm:p-8 rounded-xl bg-indigo-900 text-white border border-indigo-800 space-y-6">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <Check className="h-4 w-4" />
              </div>
              <span>With Inventory Lite</span>
            </div>

            <div className="space-y-3">
              {AFTER_ITEMS.map((item, idx) => {
                const Icon = item.icon
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-indigo-950/80 border border-indigo-800/80 text-xs font-medium text-indigo-100">
                    <Icon className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>{item.text}</span>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-indigo-200/80 pt-2 border-t border-indigo-800/80">
              Result: Complete clarity on products, instant billing, and automatic customer credit records.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
