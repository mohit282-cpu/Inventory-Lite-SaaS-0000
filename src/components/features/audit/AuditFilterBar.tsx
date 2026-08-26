"use client"

import { useMemo } from 'react'
import { AuditFilterParams, PaymentMethod } from '@/types'
import { getCurrentFiscalYear } from '@/lib/date/bs-date'
import { Filter, RotateCcw, AlertCircle } from 'lucide-react'
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

// All actual PaymentMethod values from the type definition (types/index.ts)
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card / POS' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'digital_wallet', label: 'Digital Wallet' },
  { value: 'eSewa', label: 'eSewa' },
  { value: 'Khalti', label: 'Khalti' },
  { value: 'credit', label: 'Credit' },
  { value: 'full_udhaar', label: 'Full Udhaar' },
  { value: 'other', label: 'Other' },
]

// Supported fiscal years list
const FISCAL_YEARS = [
  { value: '2081/82', label: 'FY 2081/82 (2024-25)' },
  { value: '2080/81', label: 'FY 2080/81 (2023-24)' },
  { value: '2079/80', label: 'FY 2079/80 (2022-23)' },
  { value: '2078/79', label: 'FY 2078/79 (2021-22)' },
  { value: '2077/78', label: 'FY 2077/78 (2020-21)' },
]

export function AuditFilterBar({
  filters,
  onFilterChange,
  onReset,
  customers = [],
  suppliers = [],
}: AuditFilterBarProps) {
  const currentFY = getCurrentFiscalYear()

  // Date range validation
  const dateError = useMemo(() => {
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      return '"Date From" must not be after "Date To"'
    }
    return null
  }, [filters.dateFrom, filters.dateTo])

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.fiscalYear && filters.fiscalYear !== currentFY) count++
    if (filters.dateFrom) count++
    if (filters.dateTo) count++
    if (filters.customerId) count++
    if (filters.supplierId) count++
    if (filters.documentStatus) count++
    if (filters.paymentMethod) count++
    return count
  }, [filters, currentFY])

  // When FY changes, clear explicit date overrides so FY date bounds take effect
  const handleFiscalYearChange = (val: string) => {
    onFilterChange({ ...filters, fiscalYear: val, dateFrom: undefined, dateTo: undefined })
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Filter className="h-4 w-4 text-indigo-600" />
          <span>Audit &amp; Compliance Filters</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold">
              {activeFilterCount}
            </span>
          )}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Fiscal Year Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Fiscal Year</label>
          <Select
            value={filters.fiscalYear || currentFY}
            onValueChange={handleFiscalYearChange}
          >
            <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Select FY" />
            </SelectTrigger>
            <SelectContent>
              {FISCAL_YEARS.map((fy) => (
                <SelectItem key={fy.value} value={fy.value}>
                  {fy.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Date From</label>
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value || undefined })}
            className={`h-9 text-xs bg-slate-50 border-slate-200 ${dateError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Date To</label>
          <Input
            type="date"
            value={filters.dateTo || ''}
            min={filters.dateFrom || undefined}
            onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value || undefined })}
            className={`h-9 text-xs bg-slate-50 border-slate-200 ${dateError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
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
              <SelectItem value="completed">Completed / Paid</SelectItem>
              <SelectItem value="pending">Pending / Partial</SelectItem>
              <SelectItem value="cancelled">Cancelled / Voided</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Method Filter */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Payment</label>
          <Select
            value={filters.paymentMethod || 'all'}
            onValueChange={(val) => onFilterChange({ ...filters, paymentMethod: val === 'all' ? undefined : val as PaymentMethod })}
          >
            <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date validation error message */}
      {dateError && (
        <div className="flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {dateError} — correct the date range to resume filtering.
        </div>
      )}
    </div>
  )
}


