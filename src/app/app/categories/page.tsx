"use client"

import React, { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Category } from '@/types'

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categories] = useState<Category[]>([])

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category Name',
      sortable: true,
      render: (item) => <div className="font-semibold text-white">{item.name}</div>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (item) => <span className="text-slate-400">{item.description || 'No description'}</span>,
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
        title="Product Categories"
        description="Organize products into clear hierarchical categories for easier reporting."
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20">
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search categories..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <DataTable
        data={categories}
        columns={columns}
        emptyTitle="No categories created"
        emptyDescription="Create categories (e.g. Electronics, Groceries, Apparel) to group your items."
        emptyAction={
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="mr-2 h-4 w-4" /> Create First Category
          </Button>
        }
      />
    </div>
  )
}
