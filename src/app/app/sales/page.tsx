"use client"

import React, { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Plus, Eye, FileText } from 'lucide-react'
import { Sale } from '@/types'

export default function SalesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sales] = useState<Sale[]>([])

  const columns: Column<Sale>[] = [
    {
      key: 'saleNumber',
      header: 'Sale #',
      sortable: true,
      render: (item) => <span className="font-mono font-semibold text-white">{item.saleNumber}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (item) => <span className="text-slate-300">{item.customerName || 'Walk-in Customer'}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      sortable: true,
      render: (item) => <span className="font-mono font-bold text-emerald-400">Rs. {item.totalAmount.toFixed(2)}</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Payment Mode',
      render: (item) => <span className="text-xs uppercase bg-slate-800 text-slate-300 px-2 py-1 rounded font-semibold">{item.paymentMethod}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (item) => <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: () => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white" title="View Order">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-400" title="Generate Invoice">
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Transactions"
        description="Process point-of-sale orders, track billing status, and issue receipts."
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20">
            <Plus className="mr-2 h-4 w-4" /> Create New Sale
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search sales by order # or customer..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <DataTable
        data={sales}
        columns={columns}
        emptyTitle="No sales recorded"
        emptyDescription="Create your first POS sale or bill transaction to track revenue."
        emptyAction={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="mr-2 h-4 w-4" /> Record First Sale
          </Button>
        }
      />
    </div>
  )
}
