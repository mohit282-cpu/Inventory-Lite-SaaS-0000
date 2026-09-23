"use client"

import { useMemo, useState } from 'react'
import { AuditFilterParams, PaymentMethod } from '@/types'
import { getCurrentFiscalYear } from '@/lib/date/bs-date'
import { Filter, RotateCcw, AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AuditFilterBarProps {
  filters: AuditFilterParams
  onFilterChange: (newFilters: AuditFilterParams) => void
  onReset: () => void
  customers?: { id: string; name: string }[]
  suppliers?: { id: string; name: string }[]
}

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
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false)

  // Date range validation
  const dateError = useMemo(() => {
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      return '"From" date must not be after "To" date'
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

  // Active filter chips list for quick deletion
  const activeChips = useMemo(() => {
    const chips: { key: keyof AuditFilterParams; label: string }[] = []
    if (filters.fiscalYear && filters.fiscalYear !== currentFY) {
      chips.push({ key: 'fiscalYear', label: `FY ${filters.fiscalYear}` })
    }
    if (filters.dateFrom) {
      chips.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}` })
    }
    if (filters.dateTo) {
      chips.push({ key: 'dateTo', label: `To: ${filters.dateTo}` })
    }
    if (filters.customerId) {
      const cName = customers.find((c) => c.id === filters.customerId)?.name || 'Selected Customer'
      chips.push({ key: 'customerId', label: `Customer: ${cName}` })
    }
    if (filters.supplierId) {
      const sName = suppliers.find((s) => s.id === filters.supplierId)?.name || 'Selected Supplier'
      chips.push({ key: 'supplierId', label: `Supplier: ${sName}` })
    }
    if (filters.documentStatus) {
      chips.push({ key: 'documentStatus', label: `Status: ${filters.documentStatus}` })
    }
    if (filters.paymentMethod) {
      const pmLabel = PAYMENT_METHODS.find((p) => p.value === filters.paymentMethod)?.label || filters.paymentMethod
      chips.push({ key: 'paymentMethod', label: `Payment: ${pmLabel}` })
    }
    return chips
  }, [filters, currentFY, customers, suppliers])

  const removeChip = (key: keyof AuditFilterParams) => {
    const updated = { ...filters }
    if (key === 'fiscalYear') {
      updated.fiscalYear = currentFY
    } else {
      delete updated[key]
    }
    onFilterChange(updated)
  }

  const handleFiscalYearChange = (val: string) => {
    onFilterChange({ ...filters, fiscalYear: val, dateFrom: undefined, dateTo: undefined })
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
      {/* Header Row */}
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

        <div className="flex items-center gap-2">
          {/* Mobile Filter Toggle Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpenMobile(!isOpenMobile)}
            className="md:hidden h-8 text-xs gap-1 border-slate-300 text-slate-700"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            {isOpenMobile ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>

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
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[11px] font-medium text-slate-500 mr-1">Active:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip.key)}
                className="hover:text-indigo-600 focus:outline-none ml-0.5"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filter Grid (Desktop visible, Mobile toggleable) */}
      <div className={`space-y-3 ${isOpenMobile ? 'block' : 'hidden md:block'}`}>
        {/* Desktop Row 1: Fiscal Year, From, To, Customer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Fiscal Year */}
          <div className="space-y-1">
            <Label htmlFor="audit-filter-fy" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Fiscal Year
            </Label>
            <Select
              value={filters.fiscalYear || currentFY}
              onValueChange={handleFiscalYearChange}
            >
              <SelectTrigger id="audit-filter-fy" aria-label="Fiscal Year" className="h-9 text-xs bg-slate-50 border-slate-200">
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

          {/* From Date */}
          <div className="space-y-1">
            <Label htmlFor="audit-filter-date-from" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              From
            </Label>
            <Input
              id="audit-filter-date-from"
              type="date"
              aria-label="From Date"
              value={filters.dateFrom || ''}
              onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value || undefined })}
              className={`h-9 text-xs bg-slate-50 border-slate-200 ${dateError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <Label htmlFor="audit-filter-date-to" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              To
            </Label>
            <Input
              id="audit-filter-date-to"
              type="date"
              aria-label="To Date"
              value={filters.dateTo || ''}
              min={filters.dateFrom || undefined}
              onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value || undefined })}
              className={`h-9 text-xs bg-slate-50 border-slate-200 ${dateError ? 'border-red-400 ring-1 ring-red-400' : ''}`}
            />
          </div>

          {/* Customer Filter */}
          <div className="space-y-1">
            <Label htmlFor="audit-filter-customer" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Customer
            </Label>
            <Select
              value={filters.customerId || 'all'}
              onValueChange={(val) => onFilterChange({ ...filters, customerId: val === 'all' ? undefined : val })}
            >
              <SelectTrigger id="audit-filter-customer" aria-label="Customer" className="h-9 text-xs bg-slate-50 border-slate-200">
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
        </div>

        {/* Desktop Row 2: Supplier, Status, Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Supplier Filter */}
          <div className="space-y-1">
            <Label htmlFor="audit-filter-supplier" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Supplier
            </Label>
            <Select
              value={filters.supplierId || 'all'}
              onValueChange={(val) => onFilterChange({ ...filters, supplierId: val === 'all' ? undefined : val })}
            >
              <SelectTrigger id="audit-filter-supplier" aria-label="Supplier" className="h-9 text-xs bg-slate-50 border-slate-200">
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
            <Label htmlFor="audit-filter-status" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Status
            </Label>
            <Select
              value={filters.documentStatus || 'all'}
              onValueChange={(val) => onFilterChange({ ...filters, documentStatus: val === 'all' ? undefined : val })}
            >
              <SelectTrigger id="audit-filter-status" aria-label="Status" className="h-9 text-xs bg-slate-50 border-slate-200">
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
            <Label htmlFor="audit-filter-payment" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Payment Method
            </Label>
            <Select
              value={filters.paymentMethod || 'all'}
              onValueChange={(val) => onFilterChange({ ...filters, paymentMethod: val === 'all' ? undefined : (val as PaymentMethod) })}
            >
              <SelectTrigger id="audit-filter-payment" aria-label="Payment Method" className="h-9 text-xs bg-slate-50 border-slate-200">
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



