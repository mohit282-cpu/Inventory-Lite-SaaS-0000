"use client"

import React from 'react'
import {
  Notebook,
  HelpCircle,
  Clock,
  Coins,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  FileText,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

const PROBLEMS = [
  {
    icon: Notebook,
    title: 'Manual Notebook Records',
    desc: 'Stock numbers and sales get lost in handwritten paper registers and messy spreadsheets.',
  },
  {
    icon: HelpCircle,
    title: 'Unclear Stock Levels',
    desc: "You don't know exact stock availability, leading to over-ordering or turning customers away.",
  },
  {
    icon: Clock,
    title: 'Slow Manual Billing',
    desc: 'Handwriting bills line by line wastes customer time during busy rush hours.',
  },
  {
    icon: Coins,
    title: 'Hard-to-Track Customer Dues',
    desc: 'Tracking customer credit (Udharo) across notebooks leads to forgotten payments and lost revenue.',
  },
]

const SOLUTION_ITEMS = [
  { icon: Package, label: 'Products' },
  { icon: Boxes, label: 'Stock' },
  { icon: ShoppingCart, label: 'Sales' },
  { icon: Users, label: 'Customers' },
  { icon: FileText, label: 'Invoices' },
]

export function LandingProblemSolution() {
  return (
    <div className="space-y-16 py-16 sm:py-20 border-b border-slate-800/60">
      {/* Problem Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Still managing your inventory manually?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400">
            Paper notebooks and basic spreadsheets make daily store management chaotic as your business grows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROBLEMS.map((prob, idx) => {
            const Icon = prob.icon
            return (
              <div
                key={idx}
                className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3"
              >
                <div className="h-10 w-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white">{prob.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{prob.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Solution Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 sm:p-12 text-center space-y-8">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" /> The Modern Solution
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              One simple place to run your daily inventory.
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Inventory Lite brings your essential business operations together in one easy-to-use dashboard.
            </p>
          </div>

          {/* Visual Formula Flow */}
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto pt-2">
            {SOLUTION_ITEMS.map((item, idx) => {
              const Icon = item.icon
              return (
                <React.Fragment key={idx}>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200">
                    <Icon className="h-4 w-4 text-indigo-400" />
                    <span>{item.label}</span>
                  </div>
                  {idx < SOLUTION_ITEMS.length - 1 && (
                    <span className="text-slate-600 font-bold text-sm">+</span>
                  )}
                </React.Fragment>
              )}
            )}

            <div className="flex items-center gap-2 ml-1">
              <ArrowRight className="h-4 w-4 text-indigo-400" />
              <div className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30">
                Inventory Lite
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
