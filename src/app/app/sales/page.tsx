"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { saleService } from '@/services/sale.service'
import { customerService } from '@/services/customer.service'
import { invoiceService } from '@/services/invoice.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import { SalesReturnDialog } from '@/components/features/sales/sales-return-dialog'
import { CancelSaleDialog } from '@/components/features/sales/cancel-sale-dialog'
import { salesReturnService } from '@/services/sales-return.service'
import { Plus, Eye, ShoppingCart, RotateCcw, XCircle, FileText, ReceiptText, Printer } from 'lucide-react'
import { Sale, Customer, Invoice } from '@/types'
import NextLink from 'next/link'
import { formatBSDateTime, formatBSDate } from '@/lib/date/bs-date'
import { formatMoney } from '@/lib/money'

interface EnrichedInvoice extends Invoice {
  saleNumber: string
  customerName: string
  totalAmount: number
  paidAmount: number
  dueAmount: number
  saleStatus?: string
}

function formatPaymentMethod(method?: string): string {
  if (!method) return 'N/A'
  const lower = method.toLowerCase().trim()
  if (lower === 'cash') return 'Cash'
  if (lower === 'full_udhar' || lower === 'credit' || lower === 'udhaar') return 'Full Udhaar'
  if (lower === 'bank_transfer' || lower === 'bank') return 'Bank Transfer'
  if (lower === 'digital_wallet' || lower === 'wallet' || lower === 'esewa' || lower === 'khalti') return 'Digital Wallet'
  return method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function SalesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get('tab') === 'invoices' ? 'invoices' : 'sales'
  const [activeTab, setActiveTab] = useState<'sales' | 'invoices'>(initialTab)
  const { activeBusiness, user, memberships } = useAuth()
  const { toast } = useToast()

  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [returnSale, setReturnSale] = useState<Sale | null>(null)
  const [isReturnOpen, setIsReturnOpen] = useState(false)

  const [cancelTargetSale, setCancelTargetSale] = useState<Sale | null>(null)
  const [isCancelOpen, setIsCancelOpen] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)

  const currentRole = memberships.find((m) => m.businessId === activeBusiness?.$id)?.role || 'owner'
  const isOwnerOrAdmin = currentRole === 'owner' || currentRole === 'admin'

  const fetchSalesData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setIsLoading(true)
      const [salesData, customerData] = await Promise.all([
        saleService.listSales(activeBusiness.$id),
        customerService.listCustomers(activeBusiness.$id),
      ])
      setSales(salesData)
      setCustomers(customerData)
    } catch (err: any) {
      toast({
        title: 'Error loading sales ledger',
        description: err.message || 'Failed to fetch sales transactions.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, toast])

  useEffect(() => {
    fetchSalesData()
  }, [fetchSalesData])

  // ---- Invoices registry (merged tab) ----
  const [invoices, setInvoices] = useState<EnrichedInvoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)

  const fetchInvoices = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setInvoicesLoading(true)
      const [rawInvoices, rawSales, rawCustomers] = await Promise.all([
        invoiceService.listInvoices(activeBusiness.$id),
        saleService.listSales(activeBusiness.$id),
        customerService.listCustomers(activeBusiness.$id),
      ])
      const salesMap = new Map<string, Sale>(rawSales.map((s) => [s.$id, s]))
      const customersMap = new Map<string, Customer>(rawCustomers.map((c) => [c.$id, c]))

      const enriched: EnrichedInvoice[] = rawInvoices.map((inv) => {
        const linkedSale = salesMap.get(inv.saleId)
        let custName = 'Walk-in Customer'
        if (linkedSale?.customerId && customersMap.has(linkedSale.customerId)) {
          custName = customersMap.get(linkedSale.customerId)!.name
        }
        return {
          ...inv,
          saleNumber: linkedSale?.saleNumber || inv.saleId.slice(0, 8),
          customerName: custName,
          totalAmount: linkedSale?.total || 0,
          paidAmount: linkedSale?.paidAmount || 0,
          dueAmount: linkedSale?.dueAmount || 0,
          saleStatus: linkedSale?.status || 'completed',
        }
      })

      setInvoices(enriched)
    } catch (err: any) {
      toast({
        title: 'Error loading tax invoices',
        description: err.message || 'Failed to fetch invoices.',
        variant: 'destructive',
      })
    } finally {
      setInvoicesLoading(false)
    }
  }, [activeBusiness?.$id, toast])

  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices()
    }
  }, [activeTab, fetchInvoices])

  const getCustomerName = useCallback((customerId?: string) => {
    if (!customerId || customerId.trim() === '' || customerId === 'guest') return 'Walk-in Guest'
    const cust = customers.find((c) => c.$id === customerId)
    return cust ? cust.name : 'Registered Customer'
  }, [customers])

  // Multi-field search for sales
  const filteredSales = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return sales
    }
    const q = debouncedSearchQuery.trim().toLowerCase()
    return sales.filter((s) => {
      const custName = getCustomerName(s.customerId).toLowerCase()
      const rawNum = (s.saleNumber || `Sale-${s.$id.slice(-6)}`).toLowerCase()
      const formattedNum = rawNum.replace(/^sale-/i, 'sale-')
      const formattedPm = formatPaymentMethod(s.paymentMethod).toLowerCase()
      const rawPm = (s.paymentMethod || '').toLowerCase()
      const statusStr = (s.status || '').toLowerCase()

      return (
        rawNum.includes(q) ||
        formattedNum.includes(q) ||
        (s.$id && s.$id.toLowerCase().includes(q)) ||
        custName.includes(q) ||
        rawPm.includes(q) ||
        formattedPm.includes(q) ||
        statusStr.includes(q)
      )
    })
  }, [debouncedSearchQuery, sales, getCustomerName])

  // Multi-field search for tax invoices
  const filteredInvoices = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return invoices
    }
    const q = debouncedSearchQuery.trim().toLowerCase()
    return invoices.filter((item) => {
      const invNum = (item.invoiceNumber || '').toLowerCase()
      const custName = (item.customerName || '').toLowerCase()
      const saleRef = (item.saleNumber || '').toLowerCase()
      const statusStr = (item.saleStatus || item.status || '').toLowerCase()

      return (
        invNum.includes(q) ||
        custName.includes(q) ||
        saleRef.includes(q) ||
        statusStr.includes(q)
      )
    })
  }, [debouncedSearchQuery, invoices])

  const invoiceColumns: Column<EnrichedInvoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (item) => (
        <NextLink
          href={`/app/invoices/${item.$id}`}
          className="font-mono font-bold text-indigo-700 hover:text-indigo-900 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
        >
          <FileText className="h-3.5 w-3.5" />
          {(item.invoiceNumber || '').replace(/^INV-/i, 'Inv-')}
        </NextLink>
      ),
    },
    {
      key: 'saleNumber',
      header: 'Sale Ref',
      render: (item) => (
        <NextLink
          href={`/app/sales/${item.saleId}`}
          className="font-mono text-slate-600 hover:text-indigo-700 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
        >
          {(item.saleNumber || '').replace(/^SALE-/i, 'Sale-')}
        </NextLink>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (item) => <span className="text-slate-900 font-bold">{item.customerName}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total (Rs.)',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-emerald-700">Rs. {formatMoney(item.totalAmount)}</span>
      ),
    },
    {
      key: 'paidAmount',
      header: 'Paid (Rs.)',
      render: (item) => (
        <span className="font-mono text-slate-700 font-medium">Rs. {formatMoney(item.paidAmount)}</span>
      ),
    },
    {
      key: 'dueAmount',
      header: 'Due (Rs.)',
      render: (item) => (
        <span className={`font-mono font-bold ${item.dueAmount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
          Rs. {formatMoney(item.dueAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.saleStatus || item.status} />,
    },
    {
      key: 'issueDate',
      header: 'Date',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-700 font-bold font-mono">
          {formatBSDate(item.issueDate || item.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/app/invoices/${item.$id}`)}
            title="View Invoice"
            aria-label={`View tax invoice ${item.invoiceNumber}`}
            className="h-8 px-2.5 text-xs text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/app/invoices/${item.$id}?print=true`)}
            title="Print Tax Invoice"
            aria-label={`Print tax invoice ${item.invoiceNumber}`}
            className="h-8 px-2.5 text-xs border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Printer className="h-3.5 w-3.5 mr-1" /> Print
          </Button>
        </div>
      ),
    },
  ]

  const handleProcessSalesReturn = async (data: any) => {
    if (!activeBusiness?.$id || !user?.$id) return
    setActionLoading(true)
    try {
      await salesReturnService.createSalesReturn(
        {
          ...data,
          returnDate: new Date().toISOString(),
        },
        activeBusiness.$id,
        user.$id
      )
      toast({
        title: 'Sales Return Processed',
        description: 'Returned items restored to inventory and financial balance adjusted.',
      })
      await fetchSalesData()
    } catch (err: any) {
      toast({
        title: 'Sales Return Error',
        description: err.message || 'Failed to process sales return',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmCancelSale = async (saleId: string, reason: string) => {
    if (!activeBusiness?.$id || !user?.$id) return
    setActionLoading(true)
    try {
      await saleService.cancelSale(saleId, activeBusiness.$id, user.$id, reason)
      toast({
        title: 'Bill Voided / Cancelled',
        description: 'Sale status updated to cancelled, stock restored, and customer due reversed.',
      })
      await fetchSalesData()
    } catch (err: any) {
      toast({
        title: 'Bill Cancellation Error',
        description: err.message || 'Failed to cancel bill transaction',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  const columns: Column<Sale>[] = [
    {
      key: 'saleNumber',
      header: 'Sale / Order #',
      sortable: true,
      render: (item) => {
        const rawNum = item.saleNumber || `Sale-${item.$id.slice(-6)}`
        const formattedNum = rawNum.replace(/^SALE-/i, 'Sale-')
        return (
          <NextLink
            href={`/app/sales/${item.$id}`}
            className="font-mono font-bold text-indigo-700 hover:text-indigo-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            {formattedNum}
          </NextLink>
        )
      },
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (item) => (
        <span className="text-slate-900 font-bold">{getCustomerName(item.customerId)}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total Amount',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-emerald-700">
          Rs. {formatMoney(item.total)}
        </span>
      ),
    },
    {
      key: 'paidAmount',
      header: 'Paid Amount',
      render: (item) => (
        <span className="font-mono text-slate-700 font-medium">Rs. {formatMoney(item.paidAmount)}</span>
      ),
    },
    {
      key: 'dueAmount',
      header: 'Due Amount',
      render: (item) => (
        <span className={`font-mono font-bold ${item.dueAmount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
          Rs. {formatMoney(item.dueAmount)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      render: (item) => (
        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {formatPaymentMethod(item.paymentMethod)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'createdAt',
      header: 'Date & Time',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-800 font-mono font-bold">
          {formatBSDateTime(item.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => {
        const rawNum = item.saleNumber || item.$id
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/app/sales/${item.$id}`)}
              title="View Sale"
              aria-label={`View sale ${rawNum}`}
              className="h-8 w-8 text-slate-500 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Eye className="h-4 w-4" />
            </Button>

            {item.status !== 'cancelled' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setReturnSale(item)
                  setIsReturnOpen(true)
                }}
                title="Return Sale"
                aria-label={`Return sale ${rawNum}`}
                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}

            {isOwnerOrAdmin && item.status !== 'cancelled' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setCancelTargetSale(item)
                  setIsCancelOpen(true)
                }}
                title="Cancel Sale"
                aria-label={`Cancel sale ${rawNum}`}
                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Sales & Invoices"
        description="Audit cashier transactions, sales returns, bill cancellations, and tax invoices."
        actions={
          <Button onClick={() => router.push('/app/sales/new')}>
            <Plus className="mr-2 h-4 w-4" /> Create New Sale (POS)
          </Button>
        }
      />

      {/* Tabs: Sales Ledger / Tax Invoices */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            activeTab === 'sales'
              ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShoppingCart className="h-4 w-4" /> Sales Ledger
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            activeTab === 'invoices'
              ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ReceiptText className="h-4 w-4" /> Tax Invoices
          {invoicesLoading ? null : (
            <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
              {invoices.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder={
            activeTab === 'invoices'
              ? 'Search invoices by invoice #, customer, or sale ref...'
              : 'Search sales by receipt #, customer, or payment method...'
          }
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:max-w-md"
        />
      </div>

      {/* Responsive Content Display */}
      {activeTab === 'invoices' ? (
        <>
          {/* Desktop / Tablet Table (>= 768px) */}
          <div className="hidden md:block">
            <DataTable
              data={filteredInvoices}
              columns={invoiceColumns}
              isLoading={invoicesLoading}
              searchQuery={debouncedSearchQuery}
              isFiltered={!!debouncedSearchQuery.trim()}
              itemLabel="tax invoices"
              emptyTitle={debouncedSearchQuery.trim() ? "No invoices match search" : "No invoices found"}
              emptyDescription={
                debouncedSearchQuery.trim()
                  ? "Try adjusting your search criteria or clear the query filter."
                  : "Invoices generated from completed POS sales will appear here."
              }
              emptyAction={
                !debouncedSearchQuery.trim() ? (
                  <Button onClick={() => router.push('/app/sales/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                    <Plus className="mr-2 h-4 w-4" /> Open POS Terminal
                  </Button>
                ) : undefined
              }
            />
          </div>

          {/* Mobile Card Layout (< 768px) */}
          <div className="md:hidden space-y-3">
            {invoicesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-28 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-8 px-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <ReceiptText className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  {debouncedSearchQuery.trim() ? "No invoices match search" : "No invoices found"}
                </p>
                <p className="text-xs text-slate-500">
                  {debouncedSearchQuery.trim()
                    ? "Try adjusting your search criteria."
                    : "Invoices generated from POS sales will appear here."}
                </p>
              </div>
            ) : (
              filteredInvoices.map((item) => (
                <div key={item.$id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <NextLink
                      href={`/app/invoices/${item.$id}`}
                      className="font-mono font-bold text-indigo-700 text-sm hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {(item.invoiceNumber || '').replace(/^INV-/i, 'Inv-')}
                    </NextLink>
                    <StatusBadge status={item.saleStatus || item.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer</span>
                      <span className="font-bold text-slate-900">{item.customerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Sale Ref</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {(item.saleNumber || '').replace(/^SALE-/i, 'Sale-')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Amount</span>
                      <span className="font-mono font-bold text-emerald-700">Rs. {formatMoney(item.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Due Amount</span>
                      <span className={`font-mono font-bold ${item.dueAmount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                        Rs. {formatMoney(item.dueAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-mono text-slate-500 text-[11px] font-medium">
                      {formatBSDate(item.issueDate || item.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/app/invoices/${item.$id}`)}
                        aria-label={`View invoice ${item.invoiceNumber}`}
                        className="h-8 px-2.5 text-xs text-indigo-700 font-semibold"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/app/invoices/${item.$id}?print=true`)}
                        aria-label={`Print invoice ${item.invoiceNumber}`}
                        className="h-8 px-2.5 text-xs border-slate-300 font-semibold"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1" /> Print
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          {/* Desktop / Tablet Table (>= 768px) */}
          <div className="hidden md:block">
            <DataTable
              data={filteredSales}
              columns={columns}
              isLoading={isLoading}
              searchQuery={debouncedSearchQuery}
              isFiltered={!!debouncedSearchQuery.trim()}
              itemLabel="sales"
              emptyTitle={debouncedSearchQuery.trim() ? "No sales match search" : "No sales found"}
              emptyDescription={
                debouncedSearchQuery.trim()
                  ? "Try adjusting your search criteria or clear the query filter."
                  : "Create your first sale from the POS terminal counter."
              }
              emptyAction={
                !debouncedSearchQuery.trim() ? (
                  <Button
                    onClick={() => router.push('/app/sales/new')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" /> Open POS Terminal
                  </Button>
                ) : undefined
              }
            />
          </div>

          {/* Mobile Card Layout (< 768px) */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-8 px-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <ShoppingCart className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  {debouncedSearchQuery.trim() ? "No sales match search" : "No sales found"}
                </p>
                <p className="text-xs text-slate-500">
                  {debouncedSearchQuery.trim()
                    ? "Try adjusting your search criteria or clear the query filter."
                    : "Create your first sale from the POS terminal counter."}
                </p>
              </div>
            ) : (
              filteredSales.map((item) => {
                const rawNum = item.saleNumber || `Sale-${item.$id.slice(-6)}`
                const formattedNum = rawNum.replace(/^SALE-/i, 'Sale-')
                return (
                  <div key={item.$id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <NextLink
                        href={`/app/sales/${item.$id}`}
                        className="font-mono font-bold text-indigo-700 text-sm hover:underline"
                      >
                        {formattedNum}
                      </NextLink>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer</span>
                        <span className="font-bold text-slate-900">{getCustomerName(item.customerId)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Payment Method</span>
                        <span className="font-semibold text-slate-700">{formatPaymentMethod(item.paymentMethod)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Amount</span>
                        <span className="font-mono font-bold text-emerald-700">Rs. {formatMoney(item.total)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Due Amount</span>
                        <span className={`font-mono font-bold ${item.dueAmount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
                          Rs. {formatMoney(item.dueAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="font-mono text-slate-500 text-[11px] font-medium">
                        {formatBSDateTime(item.createdAt)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/app/sales/${item.$id}`)}
                          aria-label={`View sale ${formattedNum}`}
                          className="h-8 px-2 text-slate-600"
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        {item.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReturnSale(item)
                              setIsReturnOpen(true)
                            }}
                            aria-label={`Return sale ${formattedNum}`}
                            className="h-8 px-2 text-amber-600"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" /> Return
                          </Button>
                        )}
                        {isOwnerOrAdmin && item.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCancelTargetSale(item)
                              setIsCancelOpen(true)
                            }}
                            aria-label={`Cancel sale ${formattedNum}`}
                            className="h-8 px-2 text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <SalesReturnDialog
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        onSubmit={handleProcessSalesReturn}
        sale={returnSale}
        isLoading={actionLoading}
      />

      <CancelSaleDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onSubmit={handleConfirmCancelSale}
        sale={cancelTargetSale}
        isLoading={actionLoading}
      />
    </div>
  )
}
