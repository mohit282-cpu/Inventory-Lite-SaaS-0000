"use client"

import React, { useEffect, useState, useCallback } from 'react'
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
import { Plus, Eye, ShoppingCart } from 'lucide-react'
import { Sale, Customer } from '@/types'

export default function SalesPage() {
  const router = useRouter()
  const { activeBusiness } = useAuth()
  const { toast } = useToast()

  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchSalesData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setIsLoading(true)
      const [salesData, customerData] = await Promise.all([
        saleService.listSales(activeBusiness.$id),
        customerService.listCustomers(activeBusiness.$id),
      ])
      setSales(salesData)
      setFilteredSales(salesData)
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

  // Search Filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSales(sales)
    } else {
      const q = searchQuery.toLowerCase()
      setFilteredSales(
        sales.filter((s) => {
          const cust = customers.find((c) => c.$id === s.customerId)
          return (
            (s.saleNumber && s.saleNumber.toLowerCase().includes(q)) ||
            (s.$id && s.$id.toLowerCase().includes(q)) ||
            (cust && cust.name.toLowerCase().includes(q)) ||
            s.paymentMethod.toLowerCase().includes(q)
          )
        })
      )
    }
  }, [searchQuery, sales, customers])

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
        <span className="text-xs text-slate-500 font-medium">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/app/sales/${item.$id}`)}
          className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
          title="View Receipt / Invoice"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Sales Ledger & POS Orders"
        description="Audit completed cashier transactions, customer invoices, payment methods, and outstanding dues."
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
    </div>
  )
}
