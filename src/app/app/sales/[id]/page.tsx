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
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-medium">Loading sales invoice...</p>
      </div>
    )
  }

  if (!sale) return null

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-slate-900">
      <PageHeader
        title={`Invoice ${sale.saleNumber || `SALE-${sale.$id.slice(-6)}`}`}
        description="Official point-of-sale tax invoice receipt."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/app/sales')}
              className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-semibold"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sales
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
            >
              <Printer className="mr-2 h-4 w-4" /> Print Invoice
            </Button>
          </div>
        }
      />

      {/* Invoice Card Container */}
      <Card className="border-slate-200 bg-white text-slate-900 p-6 md:p-8 space-y-6 shadow-sm print:shadow-none print:border-none">
        {/* Header: Business Profile & Customer Profile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-extrabold text-xl text-slate-900">
              <Building className="h-5 w-5 text-indigo-600" />
              <span>{activeBusiness?.name || 'Inventory Lite SaaS'}</span>
            </div>
            {activeBusiness?.address && (
              <div className="text-xs text-slate-600">{activeBusiness.address}</div>
            )}
            <div className="text-xs text-slate-700 font-medium">
              PAN of the seller: <span className="font-mono font-bold text-slate-900">{activeBusiness?.vatNumber || activeBusiness?.panNumber || 'N/A'}</span>
            </div>
            <div className="text-xs text-slate-700 font-medium">
              Seller Mobile: <span className="font-mono font-bold text-slate-900">{activeBusiness?.phone || 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-2 sm:text-right">
            <div className="inline-block">
              <StatusBadge status={sale.status} />
            </div>
            <div className="text-xs text-slate-500 font-mono flex items-center sm:justify-end gap-1.5 mt-1 font-medium">
              <span className="font-bold text-slate-700">Bill No:</span>
              <span className="font-bold text-indigo-700">{sale.saleNumber || sale.$id}</span>
            </div>
            <div className="text-xs text-slate-500 font-mono flex items-center sm:justify-end gap-1.5 mt-1 font-medium">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
              <span className="font-bold text-slate-700">Billing Date:</span>
              {new Date(sale.createdAt).toLocaleString()}
            </div>
            <div className="text-xs text-slate-600 flex items-center sm:justify-end gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
              Means of Payment: <span className="uppercase font-bold text-slate-900">{sale.paymentMethod.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Billed To Customer */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
          <User className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <div className="text-slate-500 font-extrabold uppercase text-[10px]">Buyer&apos;s Name</div>
            <div className="font-extrabold text-slate-900 text-sm">
              {customer ? customer.name : 'Walk-in Customer'}
            </div>
            <div className="text-slate-700 font-medium">
              Mobile Number: <span className="font-mono font-bold text-slate-900">{customer?.phone || 'N/A'}</span>
            </div>
            {customer?.address && <div className="text-slate-600">{customer.address}</div>}
            {customer?.panNumber && <div className="text-slate-600 font-mono">PAN: {customer.panNumber}</div>}
          </div>
        </div>

        {/* Itemized Products Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs text-slate-900">
            <thead className="bg-slate-50 uppercase tracking-wider text-slate-500 border-b border-slate-200 font-extrabold">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={item.$id}>
                  <td className="px-4 py-3 text-slate-400 font-mono">{index + 1}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{item.productNameSnapshot}</td>
                  <td className="px-4 py-3 font-mono text-slate-700 font-medium">{item.quantity}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">Rs. {item.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">Rs. {item.discount.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-700 text-right">
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
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Subtotal</span>
              <span className="font-mono text-slate-900 font-bold">Rs. {sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Discount</span>
                <span className="font-mono text-red-600 font-bold">-Rs. {sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 font-medium">
              <span>VAT Tax</span>
              <span className="font-mono text-slate-900 font-bold">Rs. {sale.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total</span>
              <span className="font-mono text-emerald-700 text-base">Rs. {sale.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-1 font-medium">
              <span>Paid Amount</span>
              <span className="font-mono text-slate-900 font-bold">Rs. {sale.paidAmount.toFixed(2)}</span>
            </div>
            {sale.dueAmount > 0 ? (
              <div className="flex justify-between text-amber-800 font-extrabold pt-1 border-t border-slate-200">
                <span>Outstanding Due (Udhaar)</span>
                <span className="font-mono text-amber-900">Rs. {sale.dueAmount.toFixed(2)}</span>
              </div>
            ) : sale.paidAmount > sale.total || (sale.changeAmount && sale.changeAmount > 0) ? (
              <div className="flex justify-between text-emerald-800 font-extrabold pt-1 border-t border-slate-200">
                <span>Change Returned</span>
                <span className="font-mono text-emerald-900">
                  Rs. {(sale.changeAmount || sale.paidAmount - sale.total).toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between text-slate-600 font-medium pt-1 border-t border-slate-200">
                <span>Udhaar / Due</span>
                <span className="font-mono text-slate-900 font-bold">Rs. 0.00</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
