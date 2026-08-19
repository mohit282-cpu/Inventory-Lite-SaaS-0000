"use client"

import React, { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Product } from '@/types'

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [products] = useState<Product[]>([])

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product Name',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-white">{item.name}</div>
          {item.sku && <div className="text-xs text-slate-500 font-mono">SKU: {item.sku}</div>}
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'Category',
      render: (item) => <span className="text-slate-300">{item.categoryName || 'Uncategorized'}</span>,
    },
    {
      key: 'sellingPrice',
      header: 'Selling Price',
      sortable: true,
      render: (item) => <span className="font-mono font-medium text-emerald-400">Rs. {item.sellingPrice.toFixed(2)}</span>,
    },
    {
      key: 'quantity',
      header: 'In Stock',
      sortable: true,
      render: (item) => (
        <span className={`font-mono font-bold ${item.quantity <= (item.minStockAlert || 5) ? 'text-amber-400' : 'text-slate-200'}`}>
          {item.quantity} {item.unit}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (item) => <StatusBadge status={item.isActive ? 'active' : 'inactive'} />,
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
        title="Products Inventory"
        description="Manage your store products, pricing, stock levels, and SKUs."
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20">
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search products by name, SKU, or category..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <DataTable
        data={products}
        columns={columns}
        emptyTitle="No products added yet"
        emptyDescription="Start building your inventory by adding your first product item."
        emptyAction={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Your First Product
          </Button>
        }
      />
    </div>
  )
}
