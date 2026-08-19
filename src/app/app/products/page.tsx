"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ProductFormDialog } from '@/components/features/products/product-form-dialog'
import { ProductDetailsDialog } from '@/components/features/products/product-details-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { productService } from '@/services/product.service'
import { categoryService } from '@/services/category.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Trash2, Eye, Filter } from 'lucide-react'
import { Product, Category } from '@/types'

export default function ProductsPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL')
  const [isLoading, setIsLoading] = useState(true)

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setIsLoading(true)
      const [prods, cats] = await Promise.all([
        productService.listProducts(activeBusiness.$id),
        categoryService.listCategories(activeBusiness.$id),
      ])
      setProducts(prods)
      setCategories(cats)
      setFilteredProducts(prods)
    } catch (err: any) {
      toast({
        title: 'Error loading inventory',
        description: err.message || 'Failed to load products.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.$id, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter & Search Evaluation
  useEffect(() => {
    let result = [...products]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
    }

    if (selectedCategoryFilter !== 'ALL') {
      result = result.filter((p) => p.categoryId === selectedCategoryFilter)
    }

    if (selectedStatusFilter !== 'ALL') {
      if (selectedStatusFilter === 'IN_STOCK') {
        result = result.filter((p) => p.stockQuantity > (p.lowStockThreshold || 5))
      } else if (selectedStatusFilter === 'LOW_STOCK') {
        result = result.filter(
          (p) => p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold || 5)
        )
      } else if (selectedStatusFilter === 'OUT_OF_STOCK') {
        result = result.filter((p) => p.stockQuantity === 0)
      }
    }

    setFilteredProducts(result)
  }, [searchQuery, selectedCategoryFilter, selectedStatusFilter, products])

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
        title: 'Product Deleted',
        description: `Product "${productToDelete.name}" was removed from inventory.`,
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
    }
  }

  const getCategoryName = (catId?: string) => {
    if (!catId) return 'Uncategorized'
    const found = categories.find((c) => c.$id === catId)
    return found ? found.name : 'Uncategorized'
  }

  const getStockStatus = (qty: number, lowThreshold?: number) => {
    if (qty === 0) return 'Out of Stock'
    if (qty <= (lowThreshold || 5)) return 'Low Stock'
    return 'In Stock'
  }

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product Name',
      sortable: true,
      render: (item) => (
        <div>
          <div className="font-semibold text-white">{item.name}</div>
          <div className="text-xs text-slate-500 font-mono">SKU: {item.sku}</div>
        </div>
      ),
    },
    {
      key: 'categoryId',
      header: 'Category',
      render: (item) => (
        <span className="text-slate-300 font-medium">
          {getCategoryName(item.categoryId)}
        </span>
      ),
    },
    {
      key: 'sellingPrice',
      header: 'Selling Price',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-emerald-400">
          Rs. {item.sellingPrice.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'stockQuantity',
      header: 'In Stock',
      sortable: true,
      render: (item) => (
        <span
          className={`font-mono font-bold ${
            item.stockQuantity === 0
              ? 'text-red-400'
              : item.stockQuantity <= (item.lowStockThreshold || 5)
              ? 'text-amber-400'
              : 'text-slate-200'
          }`}
        >
          {item.stockQuantity} {item.unit}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Stock Status',
      render: (item) => (
        <StatusBadge status={getStockStatus(item.stockQuantity, item.lowStockThreshold)} />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDetailsProduct(item)
              setIsDetailsOpen(true)
            }}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            title="View Specs"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedProduct(item)
              setIsFormOpen(true)
            }}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            title="Edit Product"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setProductToDelete(item)
              setIsDeleteOpen(true)
            }}
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
            title="Delete Product"
          >
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
        description="Manage store products, pricing, SKUs, and stock alert thresholds."
        actions={
          <Button
            onClick={() => {
              setSelectedProduct(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        }
      />

      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          placeholder="Search products by name, SKU, or barcode..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:max-w-md"
        />

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Category Filter */}
          <Select
            value={selectedCategoryFilter}
            onValueChange={setSelectedCategoryFilter}
          >
            <SelectTrigger className="w-full sm:w-44 bg-slate-900 border-slate-800 text-slate-200">
              <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.$id} value={cat.$id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Stock Status Filter */}
          <Select
            value={selectedStatusFilter}
            onValueChange={setSelectedStatusFilter}
          >
            <SelectTrigger className="w-full sm:w-40 bg-slate-900 border-slate-800 text-slate-200">
              <SelectValue placeholder="All Stock Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
              <SelectItem value="ALL">All Stock Status</SelectItem>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Table */}
      <DataTable
        data={filteredProducts}
        columns={columns}
        isLoading={isLoading}
        emptyTitle="No products found"
        emptyDescription="No inventory items match your current search and filter criteria."
        emptyAction={
          <Button
            onClick={() => {
              setSelectedProduct(null)
              setIsFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Your First Product
          </Button>
        }
      />

      {/* Create / Edit Form Modal */}
      <ProductFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedProduct(null)
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedProduct}
        categories={categories}
        isLoading={isSubmitting}
      />

      {/* Product Specification Modal */}
      <ProductDetailsDialog
        product={detailsProduct}
        categoryName={getCategoryName(detailsProduct?.categoryId)}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false)
          setDetailsProduct(null)
        }}
      />

      {/* Product Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setProductToDelete(null)
        }}
        onConfirm={handleDelete}
        title="Delete Product"
        description={`Are you sure you want to remove "${productToDelete?.name}" (SKU: ${productToDelete?.sku}) from your inventory?`}
        confirmText="Delete Product"
        isLoading={isSubmitting}
      />
    </div>
  )
}
