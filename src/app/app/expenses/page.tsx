"use client"

import React, { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Expense } from '@/types'

export default function ExpensesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expenses] = useState<Expense[]>([])

  const columns: Column<Expense>[] = [
    {
      key: 'title',
      header: 'Expense Title',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-white">{item.title}</div>
          {item.category && <div className="text-xs text-slate-500">{item.category}</div>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (item) => <span className="font-mono font-bold text-red-400">Rs. {item.amount.toFixed(2)}</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Payment Method',
      render: (item) => <span className="text-xs uppercase bg-slate-800 text-slate-300 px-2 py-1 rounded font-semibold">{item.paymentMethod}</span>,
    },
    {
      key: 'date',
      header: 'Expense Date',
      sortable: true,
      render: (item) => <span className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString()}</span>,
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
        title="Operating Expenses"
        description="Log store overheads, supplier payouts, rent, utilities, and daily costs."
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20">
            <Plus className="mr-2 h-4 w-4" /> Record Expense
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search expenses by title or category..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <DataTable
        data={expenses}
        columns={columns}
        emptyTitle="No expenses recorded"
        emptyDescription="Keep track of operational costs to calculate accurate net profit margin."
        emptyAction={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="mr-2 h-4 w-4" /> Record First Expense
          </Button>
        }
      />
    </div>
  )
}
