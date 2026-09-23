"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { useDebounce } from '@/hooks/use-debounce'
import { formatCurrency } from '@/lib/utils'
import { logger } from '@/lib/logger'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Product, Category } from '@/types'

// Dynamic Dialog Imports for Bundle Optimization
const ProductFormDialog = dynamic(
  () => import('@/components/features/products/product-form-dialog').then((mod) => mod.ProductFormDialog),
  { ssr: false }
)

const ProductDetailsDialog = dynamic(
  () => import('@/components/features/products/product-details-dialog').then((mod) => mod.ProductDetailsDialog),
  { ssr: false }
)

import { useRouter } from 'next/navigation'

type SortColumn = 'name' | 'sellingPrice' | 'stockQuantity'
type SortDirection = 'asc' | 'desc'

export default function ProductsPage() {
  const router = useRouter()
  const { activeBusiness, user, isAuthLoading, isWorkspaceLoading } = useAuth()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Sorting & Pagination State
  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)
  const [copiedSku, setCopiedSku] = useState<string | null>(null)

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!activeBusiness?.$id) {
      if (!isAuthLoading && !isWorkspaceLoading) {
        setIsLoading(false)
      }
      return
    }
    const bId = activeBusiness.$id

    try {
      setIsLoading(true)
      setIsError(false)
      setErrorMessage('')

      const [prods, cats] = await Promise.all([
        productService.listProducts(bId, { isActive: true, limit: 500 }),
        categoryService.listCategories(bId),
      ])
      setProducts(prods || [])
      setCategories(cats || [])
    } catch (err: any) {
      const errRef = logger.error('Failed to load products inventory', err, {
        category: 'APPWRITE',
        path: '/app/products',
        businessId: bId,
      })
      setIsError(true)
      setErrorMessage(err.message || 'Failed to fetch inventory dataset.')
      toast({
        title: 'Error loading inventory',
        description: `${err.message || 'Failed to load products.'} (Ref: ${errRef})`,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, isAuthLoading, isWorkspaceLoading, toast])

  // Reset filter & pagination state when active business switches to guarantee tenant isolation
  useEffect(() => {
    setProducts([])
    setCategories([])
    setCurrentPage(1)
    setSelectedCategoryFilter('ALL')
    setSelectedStatusFilter('ALL')
    setSearchQuery('')
    fetchData()
  }, [fetchData])

  // Reset pagination to page 1 on search or filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, selectedCategoryFilter, selectedStatusFilter, itemsPerPage])

  const currency = activeBusiness?.currency || 'NPR'

  // Handle Sort Toggle
  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection('asc')
    }
  }

  // Handle Copy SKU
  const handleCopySku = (sku: string, productName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!sku) return
    navigator.clipboard.writeText(sku)
    setCopiedSku(sku)
    toast({
      title: 'SKU Copied',
      description: `Copied "${sku}" for ${productName} to clipboard.`,
    })
    setTimeout(() => setCopiedSku(null), 2000)
  }

  // Clear all filters handler
  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategoryFilter('ALL')
    setSelectedStatusFilter('ALL')
    setCurrentPage(1)
  }

  const isFilterActive = searchQuery.trim() !== '' || selectedCategoryFilter !== 'ALL' || selectedStatusFilter !== 'ALL'

  // Memoized Filtered & Sorted Products Dataset
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products]

    // 1. Search Filter
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim()
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
    }

    // 2. Category Filter
    if (selectedCategoryFilter !== 'ALL') {
      result = result.filter((p) => p.categoryId === selectedCategoryFilter)
    }

    // 3. Stock Status Filter
    if (selectedStatusFilter !== 'ALL') {
      if (selectedStatusFilter === 'IN_STOCK') {
        result = result.filter((p) => p.stockQuantity > (p.lowStockThreshold ?? 5))
      } else if (selectedStatusFilter === 'LOW_STOCK') {
        result = result.filter(
          (p) => p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold ?? 5)
        )
      } else if (selectedStatusFilter === 'OUT_OF_STOCK') {
        result = result.filter((p) => p.stockQuantity === 0)
      }
    }

    // 4. Sorting Evaluation
    result.sort((a, b) => {
      let valA: any = a[sortColumn]
      let valB: any = b[sortColumn]

      if (sortColumn === 'name') {
        valA = (a.name || '').toLowerCase()
        valB = (b.name || '').toLowerCase()
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [debouncedSearchQuery, selectedCategoryFilter, selectedStatusFilter, products, sortColumn, sortDirection])

  // Pagination Calculations
  const totalItems = filteredAndSortedProducts.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const validPage = Math.min(Math.max(1, currentPage), totalPages)
  
  const startIndex = (validPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedProducts = filteredAndSortedProducts.slice(startIndex, endIndex)

  const handleCreateOrUpdate = async (data: any) => {
    if (!activeBusiness?.$id || !user?.$id) return
    setIsSubmitting(true)

    try {
      if (selectedProduct) {
        await productService.updateProduct(
          selectedProduct.$id,
          {
            categoryId: data.categoryId,
            name: data.name,
            sku: data.sku,
            barcode: data.barcode,
            unit: data.unit,
            purchasePrice: data.purchasePrice,
            sellingPrice: data.sellingPrice,
            stockQuantity: data.openingStock,
            lowStockThreshold: data.minStockAlert,
            imageUrl: data.imageUrl,
            isActive: data.isActive,
          },
          activeBusiness.$id
        )
        toast({
          title: 'Product Updated',
          description: `Product "${data.name}" has been updated.`,
        })
      } else {
        await productService.createProduct(
          {
            categoryId: data.categoryId,
            name: data.name,
            sku: data.sku,
            barcode: data.barcode,
            unit: data.unit,
            purchasePrice: data.purchasePrice,
            sellingPrice: data.sellingPrice,
            stockQuantity: data.openingStock,
            lowStockThreshold: data.minStockAlert,
            imageUrl: data.imageUrl,
            isActive: data.isActive,
          },
          activeBusiness.$id,
          user.$id
        )
        toast({
          title: 'Product Created',
          description: `Product "${data.name}" added to inventory with opening stock movement.`,
        })
      }
      await fetchData()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!productToDelete || !activeBusiness?.$id) return
    setIsSubmitting(true)

    try {
      await productService.deleteProduct(productToDelete.$id, activeBusiness.$id)
      toast({
        title: 'Product Deactivated',
        description: `Product "${productToDelete.name}" was soft-archived to preserve historical financial ledgers.`,
      })
      await fetchData()
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to remove product.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
      setProductToDelete(null)
      setIsDeleteOpen(false)
    }
  }

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'Uncategorized'
    const found = categories.find((c) => c.$id === catId)
    return found ? found.name : 'Uncategorized'
  }

  const getStockStatus = (qty: number, lowThreshold?: number) => {
    if (qty === 0) return 'OUT_OF_STOCK'
    if (qty <= (lowThreshold ?? 5)) return 'LOW_STOCK'
    return 'IN_STOCK'
  }

  // Column definitions with accessible headers and sort indicators
  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: (
        <button
          type="button"
          onClick={() => handleSort('name')}
          className="flex items-center gap-1.5 font-extrabold text-slate-700 hover:text-slate-900 focus:outline-none"
        >
          <span>Product Name</span>
          {sortColumn === 'name' ? (
            sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-60" />
          )}
        </button>
      ),
      sortable: true,
      render: (item) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 truncate max-w-xs">{item.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <span>SKU: {item.sku || 'N/A'}</span>
            {item.sku && (
              <button
                type="button"
                onClick={(e) => handleCopySku(item.sku, item.name, e)}
                aria-label={`Copy SKU for ${item.name}`}
                title={`Copy SKU ${item.sku}`}
                className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors"
              >
                {copiedSku === item.sku ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'categoryId',
      header: 'Category',
      render: (item) => (
        <span className="text-slate-700 font-medium text-xs">
          {getCategoryName(item.categoryId)}
        </span>
      ),
    },
    {
      key: 'sellingPrice',
      header: (
        <button
          type="button"
          onClick={() => handleSort('sellingPrice')}
          className="flex items-center gap-1.5 font-extrabold text-slate-700 hover:text-slate-900 focus:outline-none"
        >
          <span>Selling Price</span>
          {sortColumn === 'sellingPrice' ? (
            sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-60" />
          )}
        </button>
      ),
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-emerald-700 text-xs">
          {formatCurrency(item.sellingPrice, currency)}
        </span>
      ),
    },
    {
      key: 'stockQuantity',
      header: (
        <button
          type="button"
          onClick={() => handleSort('stockQuantity')}
          className="flex items-center gap-1.5 font-extrabold text-slate-700 hover:text-slate-900 focus:outline-none"
        >
          <span>In Stock</span>
          {sortColumn === 'stockQuantity' ? (
            sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-indigo-600" /> : <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 opacity-60" />
          )}
        </button>
      ),
      sortable: true,
      render: (item) => {
        const threshold = item.lowStockThreshold ?? 5
        const isLow = item.stockQuantity > 0 && item.stockQuantity <= threshold
        const isOut = item.stockQuantity === 0

        return (
          <div>
            <span
              className={`font-mono font-bold text-xs ${
                isOut ? 'text-rose-700' : isLow ? 'text-amber-800' : 'text-slate-900'
              }`}
            >
              {item.stockQuantity} {item.unit || 'pcs'}
            </span>
            {isLow && (
              <span className="text-[10px] text-slate-500 block font-normal">
                Threshold: {threshold}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (item) => {
        const status = getStockStatus(item.stockQuantity, item.lowStockThreshold)
        if (status === 'OUT_OF_STOCK') {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-600 shrink-0" /> OUT OF STOCK
            </span>
          )
        }
        if (status === 'LOW_STOCK') {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0" /> LOW STOCK
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" /> IN STOCK
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setDetailsProduct(item)
              setIsDetailsOpen(true)
            }}
            aria-label={`View product details for ${item.name}`}
            title={`View details for ${item.name}`}
            className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedProduct(item)
              setIsFormOpen(true)
            }}
            aria-label={`Edit product: ${item.name}`}
            title={`Edit ${item.name}`}
            className="h-8 w-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setProductToDelete(item)
              setIsDeleteOpen(true)
            }}
            aria-label={`Delete product: ${item.name}`}
            title={`Delete ${item.name}`}
            className="h-8 w-8 text-slate-600 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      {/* 1. Page Header */}
      <PageHeader
        title="Products Inventory"
        description={`Manage catalog pricing, SKUs, and stock alert thresholds for ${activeBusiness?.name || 'your store'}.`}
        actions={
          <Button
            onClick={() => {
              setSelectedProduct(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-4 shadow-xs"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        }
      />

      {/* 2. Control Bar: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          placeholder="Search products by name, SKU, or barcode..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:max-w-md bg-white border-slate-300"
        />

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Category Filter */}
          <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44 bg-white border-slate-300 text-xs font-semibold" aria-label="Filter products by category">
              <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.$id} value={cat.$id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stock Status Filter */}
          <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-white border-slate-300 text-xs font-semibold" aria-label="Filter products by stock status">
              <SelectValue placeholder="All Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stock Status</SelectItem>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {isFilterActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 px-3 text-xs font-bold text-slate-700 border-slate-300 bg-white hover:bg-slate-50"
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* 3. Result Summary Header */}
      {!isLoading && !isError && (
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium px-1">
          <div>
            Showing <span className="font-bold text-slate-900">{totalItems > 0 ? startIndex + 1 : 0}–{endIndex}</span> of{' '}
            <span className="font-bold text-slate-900">{products.length}</span> cataloged products
            {isFilterActive && <span className="text-indigo-600 font-semibold ml-1">(filtered)</span>}
          </div>
          {totalPages > 1 && (
            <div>
              Page <span className="font-bold text-slate-900">{validPage}</span> of{' '}
              <span className="font-bold text-slate-900">{totalPages}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. Error State Banner */}
      {isError && (
        <div className="p-8 text-center border border-rose-200 rounded-xl bg-white shadow-xs space-y-3 max-w-md mx-auto my-6">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Unable to load products</h3>
          <p className="text-xs text-slate-500">{errorMessage || 'An error occurred while fetching your product inventory.'}</p>
          <Button onClick={fetchData} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry Loading
          </Button>
        </div>
      )}

      {/* 5. Main Table & Mobile Cards View */}
      {!isError && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            {products.length === 0 && !isLoading ? (
              /* State A: Business has NO products total */
              <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No products yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add your first product to start managing inventory, pricing, SKUs, and stock threshold alerts.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedProduct(null)
                    setIsFormOpen(true)
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4 shadow-xs"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Add Product
                </Button>
              </div>
            ) : filteredAndSortedProducts.length === 0 && !isLoading ? (
              /* State B: Search/Filter returns 0 products */
              <div className="p-12 text-center border border-slate-200 rounded-xl bg-white space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Filter className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No products found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No products matched your search term or selected filters. Try adjusting your criteria.
                  </p>
                </div>
                <Button variant="outline" onClick={handleClearFilters} className="h-9 px-4 text-xs font-bold border-slate-300">
                  <X className="mr-1.5 h-3.5 w-3.5" /> Clear Filters
                </Button>
              </div>
            ) : (
              <DataTable
                data={paginatedProducts}
                columns={columns}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div className="h-4 bg-slate-200 rounded" />
                    <div className="h-4 bg-slate-200 rounded" />
                  </div>
                </div>
              ))
            ) : products.length === 0 ? (
              /* State A Mobile */
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 space-y-3">
                <Package className="h-8 w-8 mx-auto text-indigo-600 opacity-80" />
                <h3 className="text-sm font-bold text-slate-900">No products yet</h3>
                <p className="text-xs text-slate-500">Add your first product to start managing inventory.</p>
                <Button
                  onClick={() => {
                    setSelectedProduct(null)
                    setIsFormOpen(true)
                  }}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Product
                </Button>
              </div>
            ) : filteredAndSortedProducts.length === 0 ? (
              /* State B Mobile */
              <div className="p-8 text-center border border-slate-200 rounded-xl bg-white space-y-3">
                <Filter className="h-8 w-8 mx-auto text-amber-600 opacity-80" />
                <h3 className="text-sm font-bold text-slate-900">No products found</h3>
                <p className="text-xs text-slate-500">No products matched your search or filters.</p>
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs font-bold">
                  <X className="mr-1.5 h-3.5 w-3.5" /> Clear Filters
                </Button>
              </div>
            ) : (
              paginatedProducts.map((p) => {
                const status = getStockStatus(p.stockQuantity, p.lowStockThreshold)

                return (
                  <div key={p.$id} className="p-4 border border-slate-200 rounded-xl bg-white shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{p.name}</h4>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {p.sku || 'N/A'}</div>
                        <div className="text-[11px] text-indigo-600 font-semibold mt-1">
                          Category: {getCategoryName(p.categoryId)}
                        </div>
                      </div>

                      {/* Stock Status Badge */}
                      <div className="shrink-0">
                        {status === 'OUT_OF_STOCK' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            OUT OF STOCK
                          </span>
                        ) : status === 'LOW_STOCK' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            IN STOCK
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Selling Price</span>
                        <span className="font-mono font-extrabold text-emerald-700">{formatCurrency(p.sellingPrice, currency)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">In Stock</span>
                        <span className="font-mono font-bold text-slate-900">{p.stockQuantity} {p.unit || 'pcs'}</span>
                      </div>
                    </div>

                    {/* Touch Accessible Action Buttons (min-h 44px) */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDetailsProduct(p)
                          setIsDetailsOpen(true)
                        }}
                        aria-label={`View product details for ${p.name}`}
                        className="h-10 text-xs font-bold border-slate-200 text-slate-700"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5 text-slate-500" /> Details
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(p)
                          setIsFormOpen(true)
                        }}
                        aria-label={`Edit product: ${p.name}`}
                        className="h-10 text-xs font-bold border-slate-200 text-indigo-600"
                      >
                        <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProductToDelete(p)
                          setIsDeleteOpen(true)
                        }}
                        aria-label={`Delete product: ${p.name}`}
                        className="h-10 text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 6. Pagination & Controls */}
          {totalPages > 1 && !isLoading && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Per Page:</span>
                <Select value={String(itemsPerPage)} onValueChange={(val) => setItemsPerPage(Number(val))}>
                  <SelectTrigger className="h-8 w-20 bg-white border-slate-300 text-xs font-bold" aria-label="Items per page">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={validPage === 1}
                  className="h-9 px-3 text-xs font-bold border-slate-300 disabled:opacity-50"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1
                    // Only show first, last, and pages within +- 1 of current
                    if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - validPage) <= 1) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
                            validPage === pageNum
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    }
                    if (pageNum === 2 && validPage > 3) {
                      return <span key="ellipsis-start" className="text-slate-400 px-1 text-xs">...</span>
                    }
                    if (pageNum === totalPages - 1 && validPage < totalPages - 2) {
                      return <span key="ellipsis-end" className="text-slate-400 px-1 text-xs">...</span>
                    }
                    return null
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={validPage === totalPages}
                  className="h-9 px-3 text-xs font-bold border-slate-300 disabled:opacity-50"
                  aria-label="Next Page"
                >
                  Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 7. Dialogs & Modals */}
      <ProductFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedProduct(null)
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedProduct}
        categories={categories}
        currencyCode={activeBusiness?.currency || 'NPR'}
        isLoading={isSubmitting}
        onCreateCategory={() => {
          setIsFormOpen(false)
          router.push('/app/categories')
        }}
      />

      <ProductDetailsDialog
        product={detailsProduct}
        categoryName={getCategoryName(detailsProduct?.categoryId)}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false)
          setDetailsProduct(null)
        }}
      />

      {/* Safe Product Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setProductToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Deactivate & Remove Product"
        description={`Are you sure you want to remove "${productToDelete?.name}" (SKU: ${productToDelete?.sku || 'N/A'})? Current recorded stock is ${productToDelete?.stockQuantity || 0} ${productToDelete?.unit || 'pcs'}. This product will be deactivated from your active catalog while preserving historical sales, audit, and financial ledgers.`}
        confirmText="Deactivate Product"
        isLoading={isSubmitting}
      />
    </div>
  )
}
