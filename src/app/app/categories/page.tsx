"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CategoryFormDialog } from '@/components/features/categories/category-form-dialog'
import { categoryService } from '@/services/category.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { Category } from '@/types'

export default function CategoriesPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCategories = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setIsLoading(true)
      const data = await categoryService.listCategories(activeBusiness.$id)
      setCategories(data)
      setFilteredCategories(data)
    } catch (err: any) {
      toast({
        title: 'Error loading categories',
        description: err.message || 'Failed to fetch categories.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, toast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Search Filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCategories(categories)
    } else {
      const q = searchQuery.toLowerCase()
      setFilteredCategories(
        categories.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.description && c.description.toLowerCase().includes(q))
        )
      )
    }
  }, [searchQuery, categories])

  const handleCreateOrUpdate = async (data: { name: string; description?: string }) => {
    if (!activeBusiness?.$id || !user?.$id) return
    setIsSubmitting(true)

    try {
      if (selectedCategory) {
        await categoryService.updateCategory(selectedCategory.$id, data, activeBusiness.$id)
        toast({
          title: 'Category Updated',
          description: `Category "${data.name}" has been updated.`,
        })
      } else {
        await categoryService.createCategory(data, activeBusiness.$id, user.$id)
        toast({
          title: 'Category Created',
          description: `Category "${data.name}" has been created.`,
        })
      }
      await fetchCategories()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete || !activeBusiness?.$id) return
    setIsSubmitting(true)

    try {
      await categoryService.deleteCategory(categoryToDelete.$id, activeBusiness.$id)
      toast({
        title: 'Category Deleted',
        description: `Category "${categoryToDelete.name}" was removed.`,
      })
      await fetchCategories()
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete category.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
      setCategoryToDelete(null)
    }
  }

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category Name',
      sortable: true,
      render: (item) => <div className="font-bold text-slate-900">{item.name}</div>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (item) => <span className="text-slate-500">{item.description || 'No description'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-500 font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCategory(item)
              setIsFormOpen(true)
            }}
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
            title="Edit Category"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCategoryToDelete(item)
              setIsDeleteOpen(true)
            }}
            className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
            title="Delete Category"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Product Categories"
        description="Organize products into clear hierarchical categories for easier reporting."
        actions={
          <Button
            onClick={() => {
              setSelectedCategory(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <SearchInput
          placeholder="Search categories by name..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
      </div>

      <DataTable
        data={filteredCategories}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No categories yet"
        emptyDescription="Create categories to organize your products."
        emptyAction={
          <Button
            onClick={() => {
              setSelectedCategory(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        }
      />

      {/* Category Create / Edit Modal */}
      <CategoryFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedCategory(null)
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedCategory}
        isLoading={isSubmitting}
      />

      {/* Category Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setCategoryToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Category"
        description={`Are you sure you want to delete "${categoryToDelete?.name}"? Products assigned to this category will become uncategorized.`}
        confirmText="Delete Category"
        isLoading={isSubmitting}
      />
    </div>
  )
}
