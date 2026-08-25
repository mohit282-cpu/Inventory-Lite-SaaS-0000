"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  Search,
  AlertTriangle,
  Calendar,
  Edit2,
  PackagePlus,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { formatNPR } from '@/lib/localization'
import { DemoProduct } from './demo-pos'

interface DemoInventoryProps {
  products: DemoProduct[]
  onAddProduct: (newProduct: DemoProduct) => void
  onUpdateProduct: (updatedProduct: DemoProduct) => void
  onAdjustStock: (productId: string, delta: number) => void
}

export function DemoInventory({
  products,
  onAddProduct,
  onUpdateProduct,
  onAdjustStock,
}: DemoInventoryProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'lowStock' | 'expiring'>('all')

  // Add/Edit Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('Groceries')
  const [formBarcode, setFormBarcode] = useState('')
  const [formCostPrice, setFormCostPrice] = useState('100')
  const [formSellingPrice, setFormSellingPrice] = useState('130')
  const [formStockQty, setFormStockQty] = useState('25')
  const [formUnit, setFormUnit] = useState('Pcs')
  const [formExpiryDate, setFormExpiryDate] = useState('2026-12-31')

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      p.category.toLowerCase().includes(q)

    if (filterMode === 'lowStock') return matchesSearch && (p.stockQuantity < 10 || p.isLowStock)
    if (filterMode === 'expiring') return matchesSearch && !!p.expiryDate
    return matchesSearch
  })

  const openAddModal = () => {
    setEditingId(null)
    setFormName('')
    setFormCategory('Groceries')
    setFormBarcode(String(Math.floor(1000000000000 + Math.random() * 9000000000000)))
    setFormCostPrice('100')
    setFormSellingPrice('130')
    setFormStockQty('25')
    setFormUnit('Pcs')
    setFormExpiryDate('2026-12-31')
    setIsModalOpen(true)
  }

  const openEditModal = (p: DemoProduct) => {
    setEditingId(p.id)
    setFormName(p.name)
    setFormCategory(p.category)
    setFormBarcode(p.barcode)
    setFormCostPrice(String(p.purchasePrice))
    setFormSellingPrice(String(p.sellingPrice))
    setFormStockQty(String(p.stockQuantity))
    setFormUnit(p.unit)
    setFormExpiryDate(p.expiryDate || '2026-12-31')
    setIsModalOpen(true)
  }

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formName.trim()) {
      toast({ variant: 'destructive', title: 'Name Required', description: 'Please enter product name' })
      return
    }

    const prodData: DemoProduct = {
      id: editingId || `p_${Date.now()}`,
      name: formName.trim(),
      category: formCategory,
      barcode: formBarcode.trim() || '8901030000000',
      purchasePrice: parseFloat(formCostPrice) || 0,
      sellingPrice: parseFloat(formSellingPrice) || 0,
      stockQuantity: parseFloat(formStockQty) || 0,
      unit: formUnit,
      expiryDate: formExpiryDate,
      isLowStock: (parseFloat(formStockQty) || 0) < 10,
    }

    if (editingId) {
      onUpdateProduct(prodData)
      toast({ title: 'Product Updated', description: `${prodData.name} updated successfully.` })
    } else {
      onAddProduct(prodData)
      toast({ title: 'Product Added', description: `${prodData.name} added to catalog.` })
    }

    setIsModalOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Top Header & Search Control */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search stock by item name, barcode, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-slate-50 border-slate-200 text-sm focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('lowStock')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'lowStock' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Low Stock Alert
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('expiring')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterMode === 'expiring' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Batch / Expiry
            </button>
          </div>
        </div>

        <Button
          type="button"
          onClick={openAddModal}
          className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md rounded-xl shrink-0"
        >
          <PackagePlus className="mr-2 h-4 w-4" /> Add New Item
        </Button>
      </div>

      {/* Responsive Inventory Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs sm:text-sm text-slate-800">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200 tracking-wider">
            <tr>
              <th className="py-3.5 px-4">Item & Barcode</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4 text-right">Cost Price</th>
              <th className="py-3.5 px-4 text-right">Selling Price</th>
              <th className="py-3.5 px-4 text-center">Stock Level</th>
              <th className="py-3.5 px-4">Batch / Expiry</th>
              <th className="py-3.5 px-4 text-right">Quick Adjust</th>
              <th className="py-3.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            {filteredProducts.map((p) => {
              const isLow = p.stockQuantity < 10 || p.isLowStock
              return (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-[11px] font-mono text-slate-500">Barcode: {p.barcode}</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {p.category}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {formatNPR(p.purchasePrice)}
                  </td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                    {formatNPR(p.sellingPrice)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <span className={`font-extrabold text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                        {p.stockQuantity} {p.unit}
                      </span>
                      {isLow && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                          <AlertTriangle className="h-3 w-3" /> Low
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-xs font-mono text-slate-600">
                    {p.expiryDate ? (
                      <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        <Calendar className="h-3 w-3 text-slate-400" /> {p.expiryDate}
                      </span>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onAdjustStock(p.id, 10)
                          toast({ title: 'Stock Intake Added', description: `+10 ${p.unit} added to ${p.name}` })
                        }}
                        className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-bold border border-emerald-200 inline-flex items-center gap-0.5"
                      >
                        <ArrowUpRight className="h-3 w-3" /> +10
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (p.stockQuantity >= 5) {
                            onAdjustStock(p.id, -5)
                            toast({ title: 'Stock Reduced', description: `-5 ${p.unit} adjusted from ${p.name}` })
                          }
                        }}
                        className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-bold border border-rose-200 inline-flex items-center gap-0.5"
                      >
                        <ArrowDownRight className="h-3 w-3" /> -5
                      </button>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <form
            onSubmit={handleSaveProduct}
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in text-slate-900"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit Product Item' : 'Add New Inventory Item'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Item Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Wai Wai Noodles 75g"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="h-10 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-medium bg-white"
                  >
                    <option value="Groceries">Groceries</option>
                    <option value="FMCG">FMCG</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Unit</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs font-medium bg-white"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Box">Box</option>
                    <option value="Kg">Kg</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Dzn">Dzn</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Cost Price (Rs.)</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    className="h-10 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block mb-1">Selling Price (Rs.)</label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    className="h-10 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">Stock Quantity</label>
                  <Input
                    type="number"
                    required
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(e.target.value)}
                    className="h-10 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block mb-1">Barcode</label>
                  <Input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="h-10 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Expiry Date (Optional)</label>
                <Input
                  type="date"
                  value={formExpiryDate}
                  onChange={(e) => setFormExpiryDate(e.target.value)}
                  className="h-10 text-xs font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button type="submit" className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                Save Inventory Item
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
