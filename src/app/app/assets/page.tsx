"use client"

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { assetService } from '@/services/asset.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { formatNPR } from '@/lib/localization'
import { StoreAsset, AssetStatus } from '@/types'
import { Plus, RefreshCw, HardDrive, ShieldCheck, Wrench, Trash2, Edit3, DollarSign } from 'lucide-react'

export default function StoreAssetsPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [assets, setAssets] = useState<StoreAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<StoreAsset | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [category, setCategory] = useState('POS Hardware')
  const [cost, setCost] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<AssetStatus>('ACTIVE')
  const [notes, setNotes] = useState('')

  const fetchAssets = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setLoading(true)
      const data = await assetService.listAssets(activeBusiness.$id)
      setAssets(data)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load assets',
        description: err?.message || 'Could not retrieve store equipment records.',
      })
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.$id, toast])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const openCreateDialog = () => {
    setEditingAsset(null)
    setName('')
    setSerialNumber('')
    setCategory('POS Hardware')
    setCost('')
    setPurchaseDate(new Date().toISOString().split('T')[0])
    setStatus('ACTIVE')
    setNotes('')
    setIsDialogOpen(true)
  }

  const openEditDialog = (asset: StoreAsset) => {
    setEditingAsset(asset)
    setName(asset.name)
    setSerialNumber(asset.serialNumber || '')
    setCategory(asset.category || 'POS Hardware')
    setCost(String(asset.cost))
    setPurchaseDate(asset.purchaseDate || new Date().toISOString().split('T')[0])
    setStatus(asset.status)
    setNotes(asset.notes || '')
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBusiness?.$id || !user?.$id) return

    const parsedCost = parseFloat(cost)
    if (isNaN(parsedCost) || parsedCost < 0) {
      toast({ variant: 'destructive', title: 'Invalid Cost', description: 'Cost must be a valid positive amount.' })
      return
    }

    try {
      setIsSubmitting(true)
      if (editingAsset) {
        await assetService.updateAsset(
          editingAsset.$id,
          { name, serialNumber, category, cost: parsedCost, purchaseDate, status, notes },
          activeBusiness.$id,
          user.$id
        )
        toast({ title: 'Asset Updated', description: `${name} record updated successfully.` })
      } else {
        await assetService.createAsset(
          { name, serialNumber, category, cost: parsedCost, purchaseDate, status, notes },
          activeBusiness.$id,
          user.$id
        )
        toast({ title: 'Asset Registered', description: `${name} added to store equipment registry.` })
      }
      setIsDialogOpen(false)
      fetchAssets()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Failed to save asset.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (assetId: string, assetName: string) => {
    if (!activeBusiness?.$id || !user?.$id) return
    if (!confirm(`Are you sure you want to delete asset "${assetName}"?`)) return

    try {
      await assetService.deleteAsset(assetId, activeBusiness.$id, user.$id)
      toast({ title: 'Asset Deleted', description: `${assetName} removed from registry.` })
      fetchAssets()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: err?.message })
    }
  }

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q))
      return matchesStatus && matchesSearch
    })
  }, [assets, statusFilter, searchQuery])

  // Summary Metrics
  const totalValuation = useMemo(() => assets.reduce((sum, a) => sum + (a.cost || 0), 0), [assets])
  const activeCount = useMemo(() => assets.filter((a) => a.status === 'ACTIVE').length, [assets])
  const maintenanceCount = useMemo(() => assets.filter((a) => a.status === 'MAINTENANCE').length, [assets])

  const columns: Column<StoreAsset>[] = [
    {
      key: 'name',
      header: 'Asset Name',
      render: (item) => (
        <div>
          <span className="font-bold text-slate-900 block">{item.name}</span>
          {item.serialNumber && <span className="text-xs font-mono text-slate-500">S/N: {item.serialNumber}</span>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => <span className="text-xs font-semibold text-slate-700">{item.category || 'General'}</span>,
    },
    {
      key: 'cost',
      header: 'Cost (NPR)',
      render: (item) => <span className="font-semibold text-slate-900">{formatNPR(item.cost)}</span>,
    },
    {
      key: 'purchaseDate',
      header: 'Purchase Date',
      render: (item) => <span className="text-xs text-slate-600">{item.purchaseDate || '-'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'id',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)} className="h-8 w-8 p-0 text-slate-600">
            <Edit3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.$id, item.name)}
            className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
        title="Store Assets Management"
        description="Track physical shop hardware, refrigerators, inverters, counters, and POS terminals."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAssets} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              <Plus className="h-4 w-4 mr-2" /> Add Asset
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Asset Valuation</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{formatNPR(totalValuation)}</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Equipment</span>
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{activeCount} items</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Under Maintenance</span>
            <Wrench className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{maintenanceCount} items</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Search assets, S/N..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-10 text-xs font-bold">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              <SelectItem value="DISPOSED">Disposed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Assets Table */}
      <DataTable
        columns={columns}
        data={filteredAssets}
        isLoading={loading}
        emptyTitle="No store assets recorded"
        emptyDescription="Add physical hardware, refrigerators, counters, or POS equipment to track shop asset valuation."
      />

      {/* Add / Edit Asset Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-indigo-600" />
              {editingAsset ? 'Edit Store Asset' : 'Register Store Asset'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold">Asset Name *</Label>
              <Input
                placeholder="e.g. Inverter 1500VA / Barcode Scanner"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 mt-1 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Serial Number</Label>
                <Input
                  placeholder="SN-908123"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="h-10 mt-1 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-10 mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POS Hardware">POS Hardware</SelectItem>
                    <SelectItem value="Electrical Equipment">Electrical Equipment</SelectItem>
                    <SelectItem value="Furniture & Fixtures">Furniture & Fixtures</SelectItem>
                    <SelectItem value="Refrigeration">Refrigeration</SelectItem>
                    <SelectItem value="General Equipment">General Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Cost (NPR) *</Label>
                <Input
                  type="number"
                  placeholder="25000"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                  min="0"
                  className="h-10 mt-1 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Purchase Date</Label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="h-10 mt-1 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Status</Label>
              <Select value={status} onValueChange={(val: string) => setStatus(val as AssetStatus)}>
                <SelectTrigger className="h-10 mt-1 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                  <SelectItem value="DISPOSED">DISPOSED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Notes / Description</Label>
              <Input
                placeholder="Warranty terms, supplier notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-10 mt-1 text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                {isSubmitting ? 'Saving...' : editingAsset ? 'Update Asset' : 'Save Asset'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
