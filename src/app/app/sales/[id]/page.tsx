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
import { getSellerTaxLabel, getBillSummaryDetails } from '@/lib/localization'
import { formatBSDateTime, getBSFinancialYear } from '@/lib/date/bs-date'

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
  const [format, setFormat] = useState<'A4' | 'THERMAL'>('A4')

  const sellerTaxInfo = getSellerTaxLabel(activeBusiness)

  // Update body class for thermal print layout override
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (format === 'THERMAL') {
      document.body.classList.add('print-format-thermal')
    } else {
      document.body.classList.remove('print-format-thermal')
    }
    return () => {
      document.body.classList.remove('print-format-thermal')
    }
  }, [format])

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

  const billSummary = getBillSummaryDetails(sale)

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-slate-900 print:max-w-none print:space-y-0">
      <div className="no-print print:hidden">
        <PageHeader
          title={`Invoice ${sale.saleNumber || `SALE-${sale.$id.slice(-6)}`}`}
          description="Official point-of-sale tax invoice receipt."
          actions={
            <div className="flex items-center flex-wrap gap-2">
              {/* Format Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setFormat('A4')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                    format === 'A4' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4 Print Format
                </button>
                <button
                  onClick={() => setFormat('THERMAL')}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                    format === 'THERMAL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  80mm Thermal Receipt
                </button>
              </div>

              <Button
                variant="outline"
                onClick={() => router.push('/app/sales')}
                className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-semibold h-9"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sales
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4"
              >
                <Printer className="mr-2 h-4 w-4" /> Print Invoice
              </Button>
            </div>
          }
        />
      </div>

      {/* Invoice Card Container */}
      <div className="flex justify-center print:block print:w-full">
        {format === 'A4' ? (
          /* ==================== A4 TAX / SALES INVOICE FORMAT ==================== */
          <Card className="w-full border-slate-200 bg-white text-slate-900 p-6 md:p-8 space-y-6 shadow-sm print:shadow-none print:border-none print:p-0">
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
                  <span className="font-mono font-bold text-slate-900">{sellerTaxInfo.formattedText}</span>
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
                <div className="text-xs text-emerald-800 dark:text-emerald-400 font-mono flex items-center sm:justify-end gap-1.5 mt-1 font-bold">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Billing Date (BS):</span>
                  <span>{formatBSDateTime(sale.createdAt)}</span>
                </div>
                <div className="text-xs text-slate-500 font-mono flex items-center sm:justify-end gap-1.5 text-[11px]">
                  <span className="font-semibold text-slate-600">Financial Year:</span>
                  <span>{getBSFinancialYear(sale.createdAt).label}</span>
                  <span className="text-slate-400 ml-1">({new Date(sale.createdAt).toLocaleDateString('en-US')} AD)</span>
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
                {customer?.phone && (
                  <div className="text-slate-700 font-medium">
                    Mobile Number: <span className="font-mono font-bold text-slate-900">{customer.phone}</span>
                  </div>
                )}
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
                  <span className="font-mono text-slate-900 font-bold">Rs. {billSummary.subtotal.toFixed(2)}</span>
                </div>
                {billSummary.showDiscount && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>{billSummary.discountLabel}</span>
                    <span className="font-mono text-emerald-700 font-bold">{billSummary.discountFormatted}</span>
                  </div>
                )}
                {billSummary.showTaxableAmount && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>Taxable Amount</span>
                    <span className="font-mono text-slate-900 font-bold">Rs. {billSummary.taxableAmount.toFixed(2)}</span>
                  </div>
                )}
                {billSummary.showVat && (
                  <div className="flex justify-between text-slate-600 font-medium">
                    <span>{billSummary.vatLabel}</span>
                    <span className="font-mono text-slate-900 font-bold">{billSummary.vatFormatted}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="font-mono text-emerald-700 text-base">Rs. {billSummary.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 font-medium">
                  <span>Paid Amount</span>
                  <span className="font-mono text-slate-900 font-bold">Rs. {billSummary.paidAmount.toFixed(2)}</span>
                </div>
                {billSummary.dueAmount > 0 ? (
                  <div className="flex justify-between text-amber-800 font-extrabold pt-1 border-t border-slate-200">
                    <span>Outstanding Due (Udhaar)</span>
                    <span className="font-mono text-amber-900">Rs. {billSummary.dueAmount.toFixed(2)}</span>
                  </div>
                ) : billSummary.changeAmount > 0 ? (
                  <div className="flex justify-between text-emerald-800 font-extrabold pt-1 border-t border-slate-200">
                    <span>Change Returned</span>
                    <span className="font-mono text-emerald-900">Rs. {billSummary.changeAmount.toFixed(2)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        ) : (
          /* ==================== 80MM POS THERMAL RECEIPT FORMAT ==================== */
          <div className="w-[80mm] max-w-full bg-white text-slate-900 shadow-sm p-4 font-mono text-xs rounded-lg border border-slate-300 print:p-0 print:shadow-none print:border-none print:w-[80mm]">
            {/* Business Title Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
              <h2 className="font-black text-base uppercase text-slate-900">{activeBusiness?.name || 'Inventory Lite SaaS'}</h2>
              {activeBusiness?.address && <p className="text-[10px] text-slate-600">{activeBusiness.address}</p>}
              <p className="text-[10px] text-slate-800 font-bold">TEL: {activeBusiness?.phone || 'N/A'}</p>
              <p className="text-[10px] text-slate-800 font-bold mt-0.5">{sellerTaxInfo.formattedText}</p>
              <div className="my-2 border-t border-slate-900 w-full" />
              <p className="font-bold text-sm tracking-wider uppercase">{billSummary.invoiceTitleEn}</p>
            </div>

            {/* Meta Details */}
            <div className="space-y-1 mb-3 text-[11px]">
              <div className="flex justify-between">
                <span>Bill No:</span>
                <span className="font-bold whitespace-nowrap">{sale.saleNumber || sale.$id}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Date (BS):</span>
                <span>{formatBSDateTime(sale.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Fiscal Year:</span>
                <span>{getBSFinancialYear(sale.createdAt).label}</span>
              </div>
              <div className="flex justify-between">
                <span>Buyer Name:</span>
                <span className="font-semibold">{customer ? customer.name : 'Walk-in'}</span>
              </div>
              {customer?.phone && (
                <div className="flex justify-between">
                  <span>Buyer Mobile:</span>
                  <span className="font-mono">{customer.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="uppercase font-bold">{sale.paymentMethod}</span>
              </div>
            </div>

            {/* Items List */}
            <div className="border-t border-b border-dashed border-slate-400 py-2 mb-3 space-y-2">
              <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Total</span>
              </div>
              {items.map((item, idx) => (
                <div key={item.$id || idx} className="text-[11px]">
                  <div className="font-bold text-slate-900 break-words">{item.productNameSnapshot}</div>
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {item.quantity} x Rs. {item.unitPrice.toFixed(2)}
                      {item.discount > 0 && ` (Disc: -${item.discount.toFixed(2)})`}
                    </span>
                    <span className="font-bold text-slate-900">Rs. {item.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[11px] mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rs. {billSummary.subtotal.toFixed(2)}</span>
              </div>
              {billSummary.showDiscount && (
                <div className="flex justify-between text-slate-700 font-bold">
                  <span>{billSummary.discountLabel}</span>
                  <span>{billSummary.discountFormatted}</span>
                </div>
              )}
              {billSummary.showTaxableAmount && (
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Amount:</span>
                  <span>Rs. {billSummary.taxableAmount.toFixed(2)}</span>
                </div>
              )}
              {billSummary.showVat && (
                <div className="flex justify-between">
                  <span>{billSummary.vatLabel}</span>
                  <span>{billSummary.vatFormatted}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm border-t border-slate-900 pt-1 mt-1">
                <span>GRAND TOTAL:</span>
                <span>Rs. {billSummary.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid:</span>
                <span>Rs. {billSummary.paidAmount.toFixed(2)}</span>
              </div>
              {billSummary.dueAmount > 0 ? (
                <div className="flex justify-between font-bold text-amber-800">
                  <span>Udhaar/Due:</span>
                  <span>Rs. {billSummary.dueAmount.toFixed(2)}</span>
                </div>
              ) : billSummary.changeAmount > 0 ? (
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Change Return:</span>
                  <span>Rs. {billSummary.changeAmount.toFixed(2)}</span>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-600 border-t border-dashed border-slate-400 pt-3">
              <p>*** THANK YOU FOR VISITING ***</p>
              <p className="text-[9px] text-slate-400 mt-1">Inventory Lite SaaS</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
