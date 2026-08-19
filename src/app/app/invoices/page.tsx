"use client"

import React, { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Plus, Download, Eye } from 'lucide-react'
import { Invoice } from '@/types'

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [invoices] = useState<Invoice[]>([])

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (item) => <span className="font-mono font-semibold text-white">{item.invoiceNumber}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (item) => <span className="text-slate-300">{item.customerName}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total Amount',
      sortable: true,
      render: (item) => <span className="font-mono font-bold text-slate-100">Rs. {item.totalAmount.toFixed(2)}</span>,
    },
    {
      key: 'taxAmount',
      header: 'VAT / Tax',
      render: (item) => <span className="font-mono text-slate-400">Rs. {item.taxAmount.toFixed(2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (item) => <span className="text-xs text-slate-400">{new Date(item.dueDate).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: () => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white" title="Preview Invoice">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-400" title="Download PDF">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Invoices"
        description="Generate, track, and export compliant PAN/VAT tax invoices."
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20">
            <Plus className="mr-2 h-4 w-4" /> Generate Invoice
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search invoices by number or customer..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <DataTable
        data={invoices}
        columns={columns}
        emptyTitle="No invoices generated"
        emptyDescription="Invoices created from sales or custom bills will appear in this registry."
        emptyAction={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="mr-2 h-4 w-4" /> Issue New Invoice
          </Button>
        }
      />
    </div>
  )
}
