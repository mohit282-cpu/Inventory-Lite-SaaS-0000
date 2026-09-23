"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CategoryFormDialog } from '@/components/features/categories/category-form-dialog'
import { categoryService } from '@/services/category.service'
import { productService } from '@/services/product.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, AlertTriangle, RefreshCw, X, Package } from 'lucide-react'
import { Category, Product } from '@/types'
import { formatBSDate } from '@/lib/date/bs-date'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function CategoriesPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleteBlockedOpen, setIsDeleteBlockedOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setIsLoading(true)
      setError(null)

      // Fetch categories & products in parallel for category usage counts
      const [categoryList, productList] = await Promise.all([
        categoryService.listCategories(activeBusiness.$id),
        productService.listAllProducts(activeBusiness.$id).catch((err) => {
          console.warn('[Categories] Failed to load products for counts:', err)
          return [] as Product[]
        }),
      ])

      setCategories(categoryList)
      setProducts(productList)
    } catch (err: any) {
      console.error('[Categories] Error loading categories:', err)
      const msg = err.message || 'Failed to fetch categories.'
      setError(msg)
      toast({
        title: 'Error loading categories',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Map category ID/name to product count
  const productCountMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const prod of products) {
      if (prod.categoryId) {
        map.set(prod.categoryId, (map.get(prod.categoryId) || 0) + 1)
      }
    }
    return map
  }, [products])

  const getProductCount = useCallback(
    (category: Category): number => {
      const byId = productCountMap.get(category.$id) || 0
      const byName = productCountMap.get(category.name) || 0
      return Math.max(byId, byName)
    },
    [productCountMap]
  )

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.trim().toLowerCase()
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }, [searchQuery, categories])

  const handleCreateOrUpdate = async (data: { name: string; description?: string }) => {
    if (!activeBusiness?.$id || !user?.$id) return
    setIsSubmitting(true)

    try {
      const normalizedData = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
      }

      if (selectedCategory) {
        await categoryService.updateCategory(selectedCategory.$id, normalizedData, activeBusiness.$id)
        toast({
          title: 'Category Updated',
          description: `Category "${normalizedData.name}" has been updated successfully.`,
        })
      } else {
        await categoryService.createCategory(normalizedData, activeBusiness.$id, user.$id)
        toast({
          title: 'Category Created',
          description: `Category "${normalizedData.name}" has been created.`,
        })
      }
      await fetchData()
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Failed to save category.',
        variant: 'destructive',
      })
      throw err
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInitiateDelete = (category: Category) => {
    const count = getProductCount(category)
    setCategoryToDelete(category)
    if (count > 0) {
      setIsDeleteBlockedOpen(true)
    } else {
      setIsDeleteOpen(true)
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!categoryToDelete || !activeBusiness?.$id) return
    setIsSubmitting(true)

    try {
      await categoryService.deleteCategory(categoryToDelete.$id, activeBusiness.$id)
      toast({
        title: 'Category Deleted',
        description: `Category "${categoryToDelete.name}" was successfully removed.`,
      })
      await fetchData()
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete category.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
      setIsDeleteOpen(false)
      setCategoryToDelete(null)
    }
  }

  const columns: Column<Category>[] = [
    {
      key: 'name',
      header: 'Category Name',
      sortable: true,
      render: (item) => (
        <div className="font-bold text-slate-900 flex items-center gap-2">
          <span>{item.name}</span>
        </div>
      ),
    },
    {
      key: 'productsCount',
      header: 'Products',
      render: (item) => {
        const count = getProductCount(item)
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              count > 0 ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {count} {count === 1 ? 'product' : 'products'}
          </span>
        )
      },
    },
    {
      key: 'description',
      header: 'Description',
      render: (item) => (
        <span className="text-slate-600">
          {item.description ? item.description : <span className="text-slate-400 italic">No description</span>}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-700 font-mono font-bold">{formatBSDate(item.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedCategory(item)
              setIsFormOpen(true)
            }}
            aria-label={`Edit category: ${item.name}`}
            title={`Edit category: ${item.name}`}
            className="h-8 w-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleInitiateDelete(item)}
            aria-label={`Delete category: ${item.name}`}
            title={`Delete category: ${item.name}`}
            className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ),
    },
  ]

  const activeDeleteCount = categoryToDelete ? getProductCount(categoryToDelete) : 0

  return (
    <div className="space-y-6 text-slate-900">
      {/* Header */}
      <PageHeader
        title="Product Categories"
        description="Organize products into categories for easier inventory management and reporting."
        actions={
          <Button
            onClick={() => {
              setSelectedCategory(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        }
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Unable to load categories</h4>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="border-red-300 text-red-700 hover:bg-red-100 font-semibold"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Search & Results Summary Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchInput
            placeholder="Search categories by name or description..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-600 font-medium">
          {searchQuery.trim() ? (
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-slate-900">{filteredCategories.length}</strong> of{' '}
                <strong className="text-slate-900">{categories.length}</strong> categories
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="h-7 text-xs text-indigo-600 hover:text-indigo-800 px-2"
              >
                <X className="h-3 w-3 mr-1" /> Clear Search
              </Button>
            </div>
          ) : (
            <span>
              Total Categories: <strong className="text-slate-900">{categories.length}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {!isLoading && !error && categories.length === 0 ? (
        /* State A: Store Has 0 Categories */
        <EmptyState
          title="No categories yet"
          description="Create your first category to organize your products and make inventory reporting easier."
          icon={Package}
          action={
            <Button
              onClick={() => {
                setSelectedCategory(null)
                setIsFormOpen(true)
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          }
        />
      ) : !isLoading && !error && filteredCategories.length === 0 && searchQuery.trim() !== '' ? (
        /* State B: Search Returns 0 Results */
        <EmptyState
          title="No categories found"
          description={`No categories match "${searchQuery}". Try a different category name or clear your search.`}
          icon={Package}
          action={
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
              className="border-slate-300 font-medium"
            >
              <X className="mr-2 h-4 w-4" /> Clear Search
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <DataTable
              data={filteredCategories}
              columns={columns}
              isLoading={isLoading}
              pageSize={10}
              searchQuery={searchQuery}
            />
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 font-medium text-sm">Loading categories...</div>
            ) : (
              filteredCategories.map((item) => {
                const count = getProductCount(item)
                return (
                  <div
                    key={item.$id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{item.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.description ? item.description : 'No description'}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                          count > 0 ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count} {count === 1 ? 'product' : 'products'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-mono">Created: {formatBSDate(item.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCategory(item)
                            setIsFormOpen(true)
                          }}
                          aria-label={`Edit category: ${item.name}`}
                          className="h-9 px-3 text-xs font-semibold text-slate-700 min-h-[44px]"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1 text-slate-500" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInitiateDelete(item)}
                          aria-label={`Delete category: ${item.name}`}
                          className="h-9 px-3 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 min-h-[44px]"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1 text-red-600" /> Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

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

      {/* Standard Delete Confirmation Dialog (for unused category) */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setCategoryToDelete(null)
        }}
        onConfirm={handleDeleteConfirmed}
        title="Delete Category"
        description={`Are you sure you want to delete "${categoryToDelete?.name}"? This category has no products assigned to it.`}
        confirmText="Delete Category"
        isLoading={isSubmitting}
      />

      {/* Blocked Delete Modal (when category has assigned products) */}
      <Dialog open={isDeleteBlockedOpen} onOpenChange={setIsDeleteBlockedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-slate-900">
              Cannot Delete Category
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-slate-600 pt-1">
              Category <strong className="text-slate-900">&quot;{categoryToDelete?.name}&quot;</strong> is currently assigned to{' '}
              <strong className="text-slate-900">{activeDeleteCount}</strong> product{activeDeleteCount === 1 ? '' : 's'}.
              <br />
              Please reassign or delete these products before deleting this category.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteBlockedOpen(false)}
              className="w-full sm:w-auto font-medium"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setIsDeleteBlockedOpen(false)
                router.push('/app/products')
              }}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Manage Products
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

