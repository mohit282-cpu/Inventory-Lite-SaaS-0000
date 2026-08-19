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
      header: 'Sale / Invoice #',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-white">
          {item.saleNumber || `SALE-${item.$id.slice(-6)}`}
        </span>
      ),
    },
    {
      key: 'customerId',
      header: 'Customer',
      render: (item) => (
        <span className="text-slate-300 font-medium">{getCustomerName(item.customerId)}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total Amount',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-emerald-400">
          Rs. {item.total.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'paidAmount',
      header: 'Paid Amount',
      render: (item) => (
        <span className="font-mono text-slate-300">Rs. {item.paidAmount.toFixed(2)}</span>
      ),
    },
    {
      key: 'dueAmount',
      header: 'Due Amount',
      render: (item) => (
        <span className={`font-mono font-semibold ${item.dueAmount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
          Rs. {item.dueAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      render: (item) => (
        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
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
        <span className="text-xs text-slate-400">
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
          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
          title="View Invoice Preview"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & Transactions"
        description="View past billing invoices, track customer payments, and issue point-of-sale orders."
        actions={
          <Button
            onClick={() => router.push('/app/sales/new')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-600/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Create New Sale (POS)
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search sales by invoice #, customer name, or payment method..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <DataTable
        data={filteredSales}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No sales transactions recorded"
        emptyDescription="Process customer billing via POS terminal to record sales and deduct inventory."
        emptyAction={
          <Button
            onClick={() => router.push('/app/sales/new')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <ShoppingCart className="mr-2 h-4 w-4" /> Open POS Terminal
          </Button>
        }
      />
    </div>
  )
}
