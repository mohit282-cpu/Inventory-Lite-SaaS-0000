"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import nextDynamic from 'next/dynamic'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { paymentService, CreditLedgerItem } from '@/services/payment.service'
import { customerService } from '@/services/customer.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import {
  Wallet,
  Users,
  AlertCircle,
  TrendingUp,
  Plus,
  Eye,
  FilterX,
  CheckCircle2,
} from 'lucide-react'
import { Customer } from '@/types'
import { formatBSDate } from '@/lib/date/bs-date'
import { formatMoney } from '@/lib/money'

// Dynamic Dialog Imports for Bundle Optimization
const RecordPaymentDialog = nextDynamic(
  () => import('@/components/features/credit/record-payment-dialog').then((mod) => mod.RecordPaymentDialog),
  { ssr: false }
)
const CreditDetailsDrawer = nextDynamic(
  () => import('@/components/features/credit/credit-details-drawer').then((mod) => mod.CreditDetailsDrawer),
  { ssr: false }
)

export default function CreditPage() {
  const { activeBusiness } = useAuth()
  const { toast } = useToast()

  const [summary, setSummary] = useState({
    totalCreditDue: 0,
    customersWithCredit: 0,
    overdueAmount: 0,
    paymentsThisMonth: 0,
  })

  const [ledgerItems, setLedgerItems] = useState<CreditLedgerItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'>('UNPAID')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all')

  // Modals
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false)
  const [selectedDrawerItem, setSelectedDrawerItem] = useState<CreditLedgerItem | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const fetchData = useCallback(async () => {
    if (!activeBusiness?.$id) return

    try {
      setIsLoading(true)
      const [sumData, ledgerData, custDocs] = await Promise.all([
        paymentService.getCreditSummary(activeBusiness.$id),
        paymentService.getCreditLedger(activeBusiness.$id, {
          searchQuery: debouncedSearchQuery,
          status: statusFilter,
          customerId: selectedCustomerId === 'all' ? undefined : selectedCustomerId,
        }),
        customerService.listCustomers(activeBusiness.$id),
      ])

      setSummary(sumData)
      setLedgerItems(ledgerData)
      setCustomers(custDocs)
    } catch (err: any) {
      toast({
        title: 'Error loading credit ledger',
        description: err.message || 'Failed to fetch credit records.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, debouncedSearchQuery, statusFilter, selectedCustomerId, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('UNPAID')
    setSelectedCustomerId('all')
  }

  const isFilterActive = searchQuery.trim() !== '' || statusFilter !== 'UNPAID' || selectedCustomerId !== 'all'
  const hasTotalDue = summary.totalCreditDue > 0
  const hasOverdue = summary.overdueAmount > 0

  const columns: Column<CreditLedgerItem>[] = [
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      width: '18%',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900 text-sm">{item.customerName}</div>
          {item.customerPhone && (
            <div className="text-xs text-slate-500 font-mono mt-0.5">{item.customerPhone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'saleNumber',
      header: 'Invoice / Sale #',
      sortable: true,
      width: '14%',
      render: (item) => (
        <div>
          <div className="font-mono font-bold text-indigo-700 text-xs sm:text-sm">{item.saleNumber}</div>
          {item.invoiceNumber && (
            <div className="text-xs text-slate-500 font-mono mt-0.5">{item.invoiceNumber}</div>
          )}
        </div>
      ),
    },
    {
      key: 'saleDate',
      header: 'Sale Date',
      sortable: true,
      width: '12%',
      render: (item) => (
        <span className="text-slate-800 text-xs font-mono font-bold">
          {formatBSDate(item.saleDate)}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      sortable: true,
      width: '12%',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-semibold text-slate-800 text-xs sm:text-sm">
          Rs. {formatMoney(item.totalAmount)}
        </span>
      ),
    },
    {
      key: 'paidAmount',
      header: 'Paid Amount',
      sortable: true,
      width: '12%',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
          Rs. {formatMoney(item.paidAmount)}
        </span>
      ),
    },
    {
      key: 'dueAmount',
      header: 'Credit / Due',
      sortable: true,
      width: '12%',
      align: 'right',
      render: (item) => (
        <span
          className={`font-mono font-bold px-2 py-0.5 rounded-md border text-xs sm:text-sm inline-block ${
            item.dueAmount > 0
              ? 'text-amber-800 bg-amber-50 border-amber-200'
              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}
        >
          Rs. {formatMoney(item.dueAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '10%',
      render: (item) => (
        <span
          className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-md border ${
            item.status === 'PAID'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : item.status === 'PARTIAL'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : item.status === 'OVERDUE'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '10%',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedDrawerItem(item)
              setIsDrawerOpen(true)
            }}
            aria-label={`View credit details for ${item.customerName}`}
            className="text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1"
          >
            <Eye className="h-3.5 w-3.5" /> View / Pay
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Credit / Udhar"
        description="Manage customer credits, outstanding payments, partial payments, and payment history."
        actions={
          <Button
            onClick={() => setIsRecordPaymentOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Record Payment
          </Button>
        }
      />

      {/* Top 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Credit Due */}
        <div className={`p-4 rounded-xl border shadow-2xs space-y-1 transition-colors ${
          hasTotalDue ? 'bg-amber-50/40 border-amber-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Total Credit Due</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              hasTotalDue ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200'
            }`}>
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold font-mono mt-1 ${hasTotalDue ? 'text-amber-900' : 'text-slate-900'}`}>
            Rs. {formatMoney(summary.totalCreditDue)}
          </div>
        </div>

        {/* Card 2: Customers With Credit */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Customers With Credit</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {summary.customersWithCredit}
          </div>
        </div>

        {/* Card 3: Overdue Amount */}
        <div className={`p-4 rounded-xl border shadow-2xs space-y-1 transition-colors ${
          hasOverdue ? 'bg-red-50/70 border-red-200 text-red-900' : 'bg-slate-50/50 border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className={hasOverdue ? 'text-red-700' : 'text-slate-500'}>Overdue Amount</span>
            {hasOverdue ? (
              <div className="h-8 w-8 rounded-lg bg-red-100 text-red-700 border border-red-200 flex items-center justify-center">
                <AlertCircle className="h-4 w-4" />
              </div>
            ) : (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Settled
              </span>
            )}
          </div>
          <div className={`text-2xl font-extrabold font-mono mt-1 ${hasOverdue ? 'text-red-700' : 'text-slate-800'}`}>
            Rs. {formatMoney(summary.overdueAmount)}
          </div>
        </div>

        {/* Card 4: Payments Received This Month */}
        <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Payments This Month</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-800 mt-1">
            Rs. {formatMoney(summary.paymentsThisMonth)}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-6">
            <SearchInput
              aria-label="Search customer, phone, sale, or invoice number"
              placeholder="Search customer, phone, sale #, or invoice #..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full max-w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as any)}
            >
              <SelectTrigger aria-label="Filter transactions by credit status" className="h-11 bg-white border-slate-300 text-slate-800 text-xs font-medium rounded-lg">
                <SelectValue placeholder="Status: Unpaid / Partial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNPAID">Outstanding Dues (Default)</SelectItem>
                <SelectItem value="PARTIAL">Partial Payments</SelectItem>
                <SelectItem value="OVERDUE">Overdue Only</SelectItem>
                <SelectItem value="PAID">Fully Paid Only</SelectItem>
                <SelectItem value="ALL">All Transactions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customer Filter */}
          <div className="sm:col-span-3 flex gap-2">
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger aria-label="Filter transactions by customer" className="h-11 bg-white border-slate-300 text-slate-800 text-xs font-medium rounded-lg flex-1">
                <SelectValue placeholder="Filter Customer" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                <SelectItem value="all">All Customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.$id} value={c.$id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isFilterActive && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="h-11 px-3 border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg shrink-0"
                title="Clear filters"
                aria-label="Clear active filters"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {statusFilter === 'UNPAID' && (
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
            Currently showing <strong className="text-slate-700">Outstanding Dues</strong>. Select &quot;All Transactions&quot; to view fully settled credit history.
          </div>
        )}
      </div>

      {/* Main Credit Ledger Table */}
      <DataTable
        data={ledgerItems}
        columns={columns}
        isLoading={isLoading}
        emptyTitle={
          isFilterActive && statusFilter !== 'UNPAID'
            ? 'No matching credit records'
            : 'No outstanding credit records'
        }
        emptyDescription={
          statusFilter === 'UNPAID'
            ? 'All customer payments are up to date! Select "All Transactions" to view past payment history.'
            : 'No credit transactions found matching your search or filter criteria.'
        }
        emptyAction={
          isFilterActive ? (
            <Button
              onClick={handleClearFilters}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4 text-xs"
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              onClick={() => setStatusFilter('ALL')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4 text-xs"
            >
              View Payment History
            </Button>
          )
        }
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        onSuccess={fetchData}
      />

      {/* Credit Details Drawer */}
      <CreditDetailsDrawer
        item={selectedDrawerItem}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setSelectedDrawerItem(null)
        }}
        onRefresh={fetchData}
      />
    </div>
  )
}

