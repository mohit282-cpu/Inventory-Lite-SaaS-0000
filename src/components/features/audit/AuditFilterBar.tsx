"use client"


import { AuditFilterParams } from '@/types'
import { getCurrentFiscalYear } from '@/lib/date/bs-date'
import { Filter, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface AuditFilterBarProps {
  filters: AuditFilterParams
  onFilterChange: (newFilters: AuditFilterParams) => void
  onReset: () => void
  customers?: { id: string; name: string }[]
  suppliers?: { id: string; name: string }[]
}

export function AuditFilterBar({
  filters,
  onFilterChange,
  onReset,
  customers = [],
  suppliers = [],
}: AuditFilterBarProps) {
  const currentFY = getCurrentFiscalYear()

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Filter className="h-4 w-4 text-indigo-600" />
          <span>Audit & Compliance Filters</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-8 text-xs gap-1.5 text-slate-600 hover:text-slate-900 border-slate-300"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Fiscal Year Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Fiscal Year</label>
          <Select
            value={filters.fiscalYear || currentFY}
            onValueChange={(val) => onFilterChange({ ...filters, fiscalYear: val })}
          >
            <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Select FY" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2081/82">FY 2081/82 (2024-25)</SelectItem>
              <SelectItem value="2080/81">FY 2080/81 (2023-24)</SelectItem>
              <SelectItem value="2079/80">FY 2079/80 (2022-23)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Date From</label>
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
            className="h-9 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Date To</label>
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
            className="h-9 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        {/* Customer Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Customer</label>
          <Select
            value={filters.customerId || 'all'}
            onValueChange={(val) => onFilterChange({ ...filters, customerId: val === 'all' ? undefined : val })}
          >
            <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="All Customers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Supplier Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Supplier</label>
          <Select
            value={filters.supplierId || 'all'}
            onValueChange={(val) => onFilterChange({ ...filters, supplierId: val === 'all' ? undefined : val })}
          >
            <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Document Status Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status</label>
          <Select
            value={filters.documentStatus || 'all'}
            onValueChange={(val) => onFilterChange({ ...filters, documentStatus: val === 'all' ? undefined : val })}
          >
            <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed / Issued</SelectItem>
              <SelectItem value="cancelled">Cancelled / Voided</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
