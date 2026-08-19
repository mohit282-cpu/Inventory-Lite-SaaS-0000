"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { saleService } from '@/services/sale.service'
import { saleItemService } from '@/services/sale-item.service'
import { customerService } from '@/services/customer.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Printer, Loader2, Building, User, Calendar, CreditCard } from 'lucide-react'
import { Sale, Customer, SaleItem } from '@/types'

export default function SaleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeBusiness } = useAuth()
  const { toast } = useToast()

  const saleId = params?.id as string

  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSaleDetails = useCallback(async () => {
    if (!saleId || !activeBusiness?.$id) return
    try {
      setIsLoading(true)
      const saleDoc = await saleService.getSale(saleId, activeBusiness.$id)
      setSale(saleDoc)

      const [itemDocs, custDoc] = await Promise.all([
        saleItemService.listSaleItems(saleId, activeBusiness.$id),
        saleDoc.customerId ? customerService.getCustomer(saleDoc.customerId, activeBusiness.$id).catch(() => null) : Promise.resolve(null),
      ])

      setItems(itemDocs)
      setCustomer(custDoc)
    } catch (err: any) {
      toast({
        title: 'Error loading sale invoice',
        description: err.message || 'Failed to fetch invoice details.',
        variant: 'destructive',
      })
      router.push('/app/sales')
    } finally {
      setIsLoading(false)
    }
  }, [saleId, activeBusiness?.$id, router, toast])

  useEffect(() => {
    fetchSaleDetails()
  }, [fetchSaleDetails])

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Loading sales invoice...</p>
      </div>
    )
  }

  if (!sale) return null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Invoice ${sale.saleNumber || `SALE-${sale.$id.slice(-6)}`}`}
        description="Official point-of-sale tax invoice receipt."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/app/sales')}
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sales
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20"
            >
              <Printer className="mr-2 h-4 w-4" /> Print Invoice
            </Button>
          </div>
        }
      />

      {/* Invoice Card Container */}
      <Card className="border-slate-800 bg-slate-900/90 text-slate-100 p-6 md:p-8 space-y-6 shadow-2xl">
        {/* Header: Business Profile & Customer Profile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-lg text-white">
              <Building className="h-5 w-5 text-indigo-400" />
              <span>{activeBusiness?.name || 'Inventory Lite SaaS'}</span>
            </div>
            {activeBusiness?.address && (
              <div className="text-xs text-slate-400">{activeBusiness.address}</div>
            )}
            <div className="text-xs text-slate-400 font-mono">
              PAN/VAT: {activeBusiness?.vatNumber || activeBusiness?.panNumber || 'N/A'}
            </div>
            {activeBusiness?.phone && (
              <div className="text-xs text-slate-400 font-mono">Phone: {activeBusiness.phone}</div>
            )}
          </div>

          <div className="space-y-2 text-right sm:text-right">
            <div className="inline-block">
              <StatusBadge status={sale.status} />
            </div>
            <div className="text-xs text-slate-400 font-mono flex items-center justify-end gap-1.5 mt-1">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              {new Date(sale.createdAt).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-end gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
              Payment: <span className="uppercase font-bold text-white">{sale.paymentMethod.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Billed To Customer */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
          <User className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <div className="text-slate-500 font-semibold uppercase text-[10px]">Billed To</div>
            <div className="font-bold text-white text-sm">
              {customer ? customer.name : 'Walk-in Guest'}
            </div>
            {customer?.phone && <div className="text-slate-400 font-mono">Phone: {customer.phone}</div>}
            {customer?.address && <div className="text-slate-400">{customer.address}</div>}
            {customer?.panNumber && <div className="text-slate-400 font-mono">PAN: {customer.panNumber}</div>}
          </div>
        </div>

        {/* Itemized Products Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950 uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((item, index) => (
                <tr key={item.$id}>
                  <td className="px-4 py-3 text-slate-500 font-mono">{index + 1}</td>
                  <td className="px-4 py-3 font-semibold text-white">{item.productNameSnapshot}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{item.quantity}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">Rs. {item.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">Rs. {item.discount.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400 text-right">
                    Rs. {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Totals Breakdown */}
        <div className="flex justify-end pt-2">
          <div className="w-full max-w-xs space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono text-white font-semibold">Rs. {sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Discount</span>
                <span className="font-mono text-red-400">-Rs. {sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>VAT Tax</span>
              <span className="font-mono text-white font-semibold">Rs. {sale.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
              <span>Grand Total</span>
              <span className="font-mono text-emerald-400">Rs. {sale.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-1">
              <span>Paid Amount</span>
              <span className="font-mono text-slate-200">Rs. {sale.paidAmount.toFixed(2)}</span>
            </div>
            {sale.dueAmount > 0 && (
              <div className="flex justify-between text-red-400 font-bold pt-1 border-t border-slate-800/60">
                <span>Outstanding Due</span>
                <span className="font-mono">Rs. {sale.dueAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
