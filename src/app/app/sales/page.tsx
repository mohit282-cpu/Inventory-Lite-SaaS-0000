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

interface EnrichedInvoice extends Invoice {
  saleNumber: string
  customerName: string
  totalAmount: number
  paidAmount: number
  dueAmount: number
  saleStatus?: string
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

  const filteredInvoices = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return invoices
    }
    const q = debouncedSearchQuery.toLowerCase()
    return invoices.filter((item) => {
      return (
        item.invoiceNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.saleNumber.toLowerCase().includes(q)
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
          className="font-mono font-bold text-indigo-700 hover:text-indigo-800 transition-colors flex items-center gap-1.5"
        >
          <FileText className="h-3.5 w-3.5" />
          {item.invoiceNumber}
        </NextLink>
      ),
    },
    {
      key: 'saleNumber',
      header: 'Sale Ref',
      render: (item) => <span className="font-mono text-slate-500 text-xs font-medium">{item.saleNumber}</span>,
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
        <span className="font-mono font-bold text-emerald-700">Rs. {item.totalAmount.toFixed(2)}</span>
      ),
    },
    {
      key: 'paidAmount',
      header: 'Paid (Rs.)',
      render: (item) => (
        <span className="font-mono text-slate-700 font-medium">Rs. {item.paidAmount.toFixed(2)}</span>
      ),
    },
    {
      key: 'dueAmount',
      header: 'Due (Rs.)',
      render: (item) => (
        <span className={`font-mono font-bold ${item.dueAmount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
          Rs. {item.dueAmount.toFixed(2)}
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
            className="h-8 px-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            title="View Invoice"
          >
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/app/invoices/${item.$id}?print=true`)}
            className="h-8 px-2.5 border-slate-300 text-indigo-700 hover:bg-indigo-50 font-bold"
            title="Print Tax Invoice"
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

  // Memoized Search Filter
  const filteredSales = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return sales
    }
    const q = debouncedSearchQuery.toLowerCase()
    return sales.filter((s) => {
      const cust = customers.find((c) => c.$id === s.customerId)
      return (
        (s.saleNumber && s.saleNumber.toLowerCase().includes(q)) ||
        (s.$id && s.$id.toLowerCase().includes(q)) ||
        (cust && cust.name.toLowerCase().includes(q)) ||
        s.paymentMethod.toLowerCase().includes(q)
      )
    })
  }, [debouncedSearchQuery, sales, customers])

  const getCustomerName = (customerId?: string) => {
    if (!customerId || customerId.trim() === '' || customerId === 'guest') return 'Walk-in Guest'
    const cust = customers.find((c) => c.$id === customerId)
    return cust ? cust.name : 'Registered Customer'
  }

  const columns: Column<Sale>[] = [
    {
      key: 'saleNumber',
      header: 'Sale / Order #',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-indigo-700">
          {item.saleNumber || `SALE-${item.$id.slice(-6)}`}
        </span>
      ),
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
          Rs. {item.total.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'paidAmount',
      header: 'Paid Amount',
      render: (item) => (
        <span className="font-mono text-slate-700 font-medium">Rs. {item.paidAmount.toFixed(2)}</span>
      ),
    },
    {
      key: 'dueAmount',
      header: 'Due Amount',
      render: (item) => (
        <span className={`font-mono font-bold ${item.dueAmount > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
          Rs. {item.dueAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      render: (item) => (
        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {item.paymentMethod.replace('_', ' ')}
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
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/app/sales/${item.$id}`)}
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
            title="View Receipt / Invoice"
          >
            <Eye className="h-4 w-4" />
          </Button>

          {item.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReturnSale(item)
                setIsReturnOpen(true)
              }}
              className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-50"
              title="Sales Return"
            >
              <RotateCcw className="h-4 w-4" />
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
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              title="Cancel / Void Bill (Owner/Admin)"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Sales & Invoices"
        description="Audit cashier transactions, sales returns, bill cancellations, and tax invoices."
        actions={
          <Button
            onClick={() => router.push('/app/sales/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
          >
            <Plus className="mr-2 h-4 w-4" /> Create New Sale (POS)
          </Button>
        }
      />

      {/* Tabs: Sales Ledger / Tax Invoices */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${
            activeTab === 'sales'
              ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/60'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <ShoppingCart className="h-4 w-4" /> Sales Ledger
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors ${
            activeTab === 'invoices'
              ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/60'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
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
              ? 'Search by invoice number, customer name, or sale ref...'
              : 'Search sales by receipt #, customer, or payment method...'
          }
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:max-w-md"
        />
      </div>

      {activeTab === 'invoices' ? (
        <DataTable
          data={filteredInvoices}
          columns={invoiceColumns}
          isLoading={invoicesLoading}
          emptyTitle="No invoices yet"
          emptyDescription="Invoices generated from completed POS sales will appear here."
          emptyAction={
            <Button onClick={() => router.push('/app/sales/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              <Plus className="mr-2 h-4 w-4" /> Open POS Terminal
            </Button>
          }
        />
      ) : (
        <DataTable
          data={filteredSales}
          columns={columns}
          isLoading={isLoading}
          emptyTitle="No sales recorded"
          emptyDescription="Create your first sale from the POS terminal counter."
          emptyAction={
            <Button
              onClick={() => router.push('/app/sales/new')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> Open POS Terminal
            </Button>
          }
        />
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
