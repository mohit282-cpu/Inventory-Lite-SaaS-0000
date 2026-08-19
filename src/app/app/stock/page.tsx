"use client"

import React, { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { StockMovement } from '@/types'

export default function StockMovementsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [movements] = useState<StockMovement[]>([])

  const columns: Column<StockMovement>[] = [
    {
      key: 'productName',
      header: 'Product',
      sortable: true,
      render: (item) => <div className="font-semibold text-white">{item.productName || item.productId}</div>,
    },
    {
      key: 'type',
      header: 'Movement Type',
      render: (item) => <StatusBadge status={item.type} />,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      sortable: true,
      render: (item) => (
        <span className={`font-mono font-bold ${item.type === 'stock_in' ? 'text-emerald-400' : 'text-red-400'}`}>
          {item.type === 'stock_in' ? '+' : '-'}{item.quantity}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason / Note',
      render: (item) => <span className="text-slate-400">{item.reason || 'Routine adjustment'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date & Time',
      sortable: true,
      render: (item) => <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements & Ledger"
        description="Audit stock intakes, sales deductions, damages, and manual adjustments."
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20">
            <Plus className="mr-2 h-4 w-4" /> Record Stock Movement
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search stock logs by product or reason..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <DataTable
        data={movements}
        columns={columns}
        emptyTitle="No stock movements recorded"
        emptyDescription="All inventory entries and stock deductions will be logged here automatically."
      />
    </div>
  )
}
