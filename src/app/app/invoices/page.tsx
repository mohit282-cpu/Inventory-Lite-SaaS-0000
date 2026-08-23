"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { Plus, Eye, Printer, FileText } from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { invoiceService } from '@/services/invoice.service'
import { saleService } from '@/services/sale.service'
import { customerService } from '@/services/customer.service'
import { useDebounce } from '@/hooks/use-debounce'
import { Invoice, Sale, Customer } from '@/types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface EnrichedInvoice extends Invoice {
  saleNumber: string
  customerName: string
  totalAmount: number
  paidAmount: number
  dueAmount: number
  status: string
}

export default function InvoicesPage() {
  const { activeBusiness } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [invoices, setInvoices] = useState<EnrichedInvoice[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInvoices = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setLoading(true)
      const rawInvoices = await invoiceService.listInvoices(activeBusiness.$id)
      const rawSales = await saleService.listSales(activeBusiness.$id)
      const salesMap = new Map<string, Sale>(rawSales.map((s) => [s.$id, s]))

      const customers = await customerService.listCustomers(activeBusiness.$id)
      const customersMap = new Map<string, Customer>(customers.map((c) => [c.$id, c]))

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
          status: linkedSale?.status || 'completed',
        }
      })

      setInvoices(enriched)
    } catch (err) {
      console.error('Error fetching invoices:', err)
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.$id])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const filteredInvoices = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return invoices
    }
    const query = debouncedSearchQuery.toLowerCase()
    return invoices.filter((item) => {
      return (
        item.invoiceNumber.toLowerCase().includes(query) ||
        item.customerName.toLowerCase().includes(query) ||
        item.saleNumber.toLowerCase().includes(query)
      )
    })
  }, [debouncedSearchQuery, invoices])

  const columns: Column<EnrichedInvoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (item) => (
        <Link
          href={`/app/invoices/${item.$id}`}
          className="font-mono font-bold text-indigo-700 hover:text-indigo-800 transition-colors flex items-center gap-1.5"
        >
          <FileText className="h-3.5 w-3.5" />
          {item.invoiceNumber}
        </Link>
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
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'issueDate',
      header: 'Date',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-500 font-medium">
          {new Date(item.issueDate || item.createdAt).toLocaleDateString()}
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

  if (loading) {
    return <LoadingPage message="Loading tax invoices registry..." />
  }

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Tax Invoices"
        description="Generate, view, and print PAN/VAT compliant sales invoices."
        actions={
          <Button
            onClick={() => router.push('/app/sales/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
          >
            <Plus className="mr-2 h-4 w-4" /> Issue New Invoice (POS)
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search by invoice number, customer name, or sale ref..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <DataTable
        data={filteredInvoices}
        columns={columns}
        emptyTitle="No invoices yet"
        emptyDescription="Invoices generated from completed POS sales will appear here."
        emptyAction={
          <Button onClick={() => router.push('/app/sales/new')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
            <Plus className="mr-2 h-4 w-4" /> Open POS Terminal
          </Button>
        }
      />
    </div>
  )
}
