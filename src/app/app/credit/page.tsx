"use client"

import React, { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
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
} from 'lucide-react'
import { Customer } from '@/types'

// Dynamic Dialog Imports for Bundle Optimization
const RecordPaymentDialog = dynamic(
  () => import('@/components/features/credit/record-payment-dialog').then((mod) => mod.RecordPaymentDialog),
  { ssr: false }
)
const CreditDetailsDrawer = dynamic(
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
        <span className="text-slate-600 text-xs font-medium">
          {new Date(item.saleDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
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
          Rs. {item.totalAmount.toFixed(2)}
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
          Rs. {item.paidAmount.toFixed(2)}
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
              : 'text-slate-500 bg-slate-50 border-slate-200'
          }`}
        >
          Rs. {item.dueAmount.toFixed(2)}
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
              : 'bg-red-50 text-red-700 border-red-200'
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
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDrawerItem(item)
              setIsDrawerOpen(true)
            }}
            className="h-9 px-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg"
          >
            <Eye className="mr-1 h-3.5 w-3.5" /> View / Pay
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Credit / Udha"
        description="Manage customer credits, outstanding payments, partial payments, and payment history."
        actions={
          <Button
            onClick={() => setIsRecordPaymentOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-4 rounded-lg shadow-xs"
          >
            <Plus className="mr-2 h-4 w-4" /> Record Payment
          </Button>
        }
      />

      {/* Top 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Credit Due */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Credit Due</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 mt-1">
            Rs. {summary.totalCreditDue.toFixed(2)}
          </div>
        </div>

        {/* Card 2: Customers With Credit */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
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
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Overdue Amount</span>
            <div className="h-8 w-8 rounded-lg bg-red-50 text-red-700 border border-red-100 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-red-700 mt-1">
            Rs. {summary.overdueAmount.toFixed(2)}
          </div>
        </div>

        {/* Card 4: Payments Received This Month */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Payments This Month</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-1">
            Rs. {summary.paymentsThisMonth.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-6">
            <SearchInput
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
              <SelectTrigger className="h-11 bg-white border-slate-300 text-slate-800 text-xs font-medium rounded-lg">
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
              <SelectTrigger className="h-11 bg-white border-slate-300 text-slate-800 text-xs font-medium rounded-lg flex-1">
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

            {(searchQuery || statusFilter !== 'UNPAID' || selectedCustomerId !== 'all') && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="h-11 px-3 border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg shrink-0"
                title="Clear filters"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Credit Ledger Table */}
      <DataTable
        data={ledgerItems}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No outstanding credit records"
        emptyDescription={
          statusFilter === 'UNPAID'
            ? 'All customer payments are up to date! Select "All Transactions" to view past payment history.'
            : 'No credit transactions found matching your filter criteria.'
        }
        emptyAction={
          <Button
            onClick={() => setStatusFilter('ALL')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
          >
            View Payment History
          </Button>
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
