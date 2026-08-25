"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { saleService } from '@/services/sale.service'
import { customerService } from '@/services/customer.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import { SalesReturnDialog } from '@/components/features/sales/sales-return-dialog'
import { CancelSaleDialog } from '@/components/features/sales/cancel-sale-dialog'
import { salesReturnService } from '@/services/sales-return.service'
import { Plus, Eye, ShoppingCart, RotateCcw, XCircle } from 'lucide-react'
import { Sale, Customer } from '@/types'
import { formatBSDateTime } from '@/lib/date/bs-date'

export default function SalesPage() {
  const router = useRouter()
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

  const handleProcessSalesReturn = async (data: any) => {
    if (!activeBusiness?.$id || !user?.$id) return
    setActionLoading(true)
    try {
      await salesReturnService.createSalesReturn(data, activeBusiness.$id, user.$id)
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
        title="Sales Ledger & POS Orders"
        description="Audit completed cashier transactions, customer invoices, sales returns, and bill cancellations."
        actions={
          <Button
            onClick={() => router.push('/app/sales/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
          >
            <Plus className="mr-2 h-4 w-4" /> Create New Sale (POS)
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search sales by receipt #, customer, or payment method..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:max-w-md"
        />
      </div>

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
