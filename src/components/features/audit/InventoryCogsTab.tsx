"use client"

import React from 'react'
import { ProductValuationEntry, InventoryCogsAuditSummary } from '@/services/audit-center.service'
import { formatCurrency } from '@/lib/utils'
import { Boxes, ExternalLink, AlertTriangle } from 'lucide-react'

interface InventoryCogsTabProps {
  data: {
    products: ProductValuationEntry[]
    movements: any[]
    summary: InventoryCogsAuditSummary
  } | null
  loading: boolean
  onDrillDown: (title: string, refId: string, details: Record<string, any>) => void
}

export function InventoryCogsTab({ data, loading, onDrillDown }: InventoryCogsTabProps) {
  if (loading || !data) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4" />
        <div className="h-48 bg-slate-100 rounded" />
      </div>
    )
  }

  const { products, summary } = data

  return (
    <div className="space-y-6">
      {/* Missing Cost Data Alert Banner if any */}
      {summary.costDataMissingCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-extrabold">Cost Data Review Required: </span>
              <span>
                {summary.costDataMissingCount} product items have zero recorded purchase cost. Update catalog purchase costs to ensure 100% accurate Weighted Average Costing (WAC).
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-200 text-amber-950 font-black text-xs font-mono">
            {summary.costDataMissingCount} Items
          </span>
        </div>
      )}

      {/* Valuation & Margin Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Inventory Value (WAC Cost)</div>
          <div className="text-lg font-black text-indigo-600 mt-1">{formatCurrency(summary.closingStockValue)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Asset value based on purchase cost</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Retail Value (Selling Price)</div>
          <div className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(summary.totalRetailValue)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Expected gross realization value</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Potential Gross Margin</div>
          <div className="text-lg font-black text-slate-900 mt-1">{formatCurrency(summary.totalPotentialMargin)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Retail Value minus WAC Cost</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-bold text-slate-500 uppercase">Potential Gross Margin %</div>
          <div className="text-lg font-black text-indigo-950 mt-1">{summary.potentialGrossMarginPercent.toFixed(1)}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Potential margin across catalog</div>
        </div>
      </div>

      {/* Stock Equation Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Boxes className="h-4 w-4 text-cyan-600" />
          Inventory Stock Equation & Valuation Audit
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs text-center">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Opening Stock</div>
            <div className="font-extrabold text-slate-900 mt-1">{formatCurrency(summary.openingStockValue)}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-[10px] font-bold text-emerald-700 uppercase">+ Stock In</div>
            <div className="font-extrabold text-emerald-800 mt-1">{formatCurrency(summary.stockInValue)}</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="text-[10px] font-bold text-blue-700 uppercase">+ Adjustments</div>
            <div className="font-extrabold text-blue-800 mt-1">{formatCurrency(summary.positiveAdjustmentsValue)}</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="text-[10px] font-bold text-purple-700 uppercase">+ Returns</div>
            <div className="font-extrabold text-purple-800 mt-1">{formatCurrency(summary.returnsValue)}</div>
          </div>
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
            <div className="text-[10px] font-bold text-rose-700 uppercase">- Sales (COGS)</div>
            <div className="font-extrabold text-rose-800 mt-1">-{formatCurrency(summary.totalCogs)}</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="text-[10px] font-bold text-amber-700 uppercase">- Stock Out</div>
            <div className="font-extrabold text-amber-800 mt-1">-{formatCurrency(summary.stockOutValue)}</div>
          </div>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="text-[10px] font-bold text-red-700 uppercase">- Damaged</div>
            <div className="font-extrabold text-red-800 mt-1">-{formatCurrency(summary.damagedValue)}</div>
          </div>
          <div className="p-3 rounded-lg bg-indigo-900 text-white font-extrabold">
            <div className="text-[10px] font-bold uppercase text-indigo-200">= Closing Stock</div>
            <div className="font-black text-sm mt-1">{formatCurrency(summary.closingStockValue)}</div>
          </div>
        </div>
      </div>

      {/* Products Valuation Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900">Product Inventory Valuation & Costing Ledger</h3>
          <span className="text-xs text-slate-500 font-medium">{products.length} products total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-right">On Hand Qty</th>
                <th className="py-3 px-4 text-right">Unit Cost (WAC)</th>
                <th className="py-3 px-4 text-right">Closing Value (WAC)</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Retail Value</th>
                <th className="py-3 px-4 text-right">Potential Margin %</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No products found in inventory.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.productId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.isCostMissing && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 uppercase border border-amber-300">
                            COST DATA MISSING
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{p.sku}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">{p.stockQuantity}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700">
                      {p.isCostMissing ? (
                        <span className="text-amber-600 font-bold">Rs. 0.00</span>
                      ) : (
                        formatCurrency(p.unitCost)
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-indigo-600">
                      {formatCurrency(p.closingInventoryValue)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(p.sellingPrice)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                      {formatCurrency(p.retailValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">
                      {p.potentialGrossMarginPercent.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onDrillDown(`Product Valuation - ${p.name}`, p.productId, p)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
