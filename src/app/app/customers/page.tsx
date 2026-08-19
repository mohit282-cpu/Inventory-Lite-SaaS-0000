"use client"

import React, { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Customer } from '@/types'

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers] = useState<Customer[]>([])

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer Name',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-white">{item.name}</div>
          {item.panNumber && <div className="text-xs text-slate-500 font-mono">PAN: {item.panNumber}</div>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      render: (item) => <span className="font-mono text-slate-300">{item.phone || '-'}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (item) => <span className="text-slate-400">{item.email || '-'}</span>,
    },
    {
      key: 'outstandingBalance',
      header: 'Balance Due',
      sortable: true,
      render: (item) => (
        <span className={`font-mono font-bold ${(item.outstandingBalance || 0) > 0 ? 'text-red-400' : 'text-slate-400'}`}>
          Rs. {(item.outstandingBalance || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: () => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-400">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers Directory"
        description="Maintain customer contacts, credit ledger, and purchase history."
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20">
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search customers by name, phone, or PAN..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <DataTable
        data={customers}
        columns={columns}
        emptyTitle="No customers added yet"
        emptyDescription="Add customers to associate sales orders and issue formal tax invoices."
        emptyAction={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add First Customer
          </Button>
        }
      />
    </div>
  )
}
