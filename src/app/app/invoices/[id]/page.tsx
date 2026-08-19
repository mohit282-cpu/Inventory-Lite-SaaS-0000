"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/auth-context'
import { invoiceService, InvoiceFullDetails } from '@/services/invoice.service'
import { LoadingPage } from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Printer, Download, ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { formatBSDate } from '@/lib/localization'

interface InvoiceDetailPageProps {
  params?: { id?: string }
}

export default function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const routeParams = useParams()
  const id = params?.id || (routeParams?.id as string)
  const searchParams = useSearchParams()
  const { activeBusiness } = useAuth()
  const router = useRouter()

  const [details, setDetails] = useState<InvoiceFullDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [format, setFormat] = useState<'A4' | 'THERMAL'>('A4')

  const fetchDetails = useCallback(async () => {
    if (!activeBusiness?.$id || !id) return
    try {
      setLoading(true)
      setError(null)
      const data = await invoiceService.getInvoiceFullDetails(id, activeBusiness.$id)
      setDetails(data)
    } catch (err: any) {
      console.error('Failed to load invoice details:', err)
      setError('Invoice not found or access denied.')
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.$id, id])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  // Auto-trigger print if ?print=true is present in query string
  useEffect(() => {
    if (details && searchParams.get('print') === 'true') {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [details, searchParams])

  if (loading) {
    return <LoadingPage message="Loading tax invoice..." />
  }

  if (error || !details) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
        <div className="rounded-full bg-red-50 p-4 text-red-700 border border-red-200">
          <FileText className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Invoice Not Found</h2>
        <p className="text-slate-500 max-w-md">{error || 'The requested invoice could not be located.'}</p>
        <Button onClick={() => router.push('/app/invoices')} className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
      </div>
    )
  }

  const { invoice, sale, saleItems, customer, business } = details

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 text-slate-900">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 shadow-sm rounded-xl p-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/app/invoices">
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Invoices
            </Button>
          </Link>
          <div className="h-4 w-[1px] bg-slate-200" />
          <h1 className="text-lg font-bold text-slate-900 font-mono">{invoice.invoiceNumber}</h1>
          <StatusBadge status={sale.status} />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Format Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setFormat('A4')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                format === 'A4' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4 Tax Invoice
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
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4"
          >
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold h-9 px-4"
          >
            <Download className="mr-2 h-4 w-4 text-emerald-600" /> PDF
          </Button>
        </div>
      </div>

      {/* Invoice Printable View Container */}
      <div className="flex justify-center">
        {format === 'A4' ? (
          /* ==================== A4 TAX INVOICE FORMAT ==================== */
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-sm border border-slate-200 p-8 print:p-0 print:shadow-none print:border-none print:max-w-none print:w-full print:rounded-none">
            {/* Header / Business Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">{business.name}</h1>
                {business.address && <p className="text-sm text-slate-600 mt-1">{business.address}</p>}
                {business.phone && <p className="text-sm text-slate-600">Phone: {business.phone}</p>}
                {business.email && <p className="text-sm text-slate-600">Email: {business.email}</p>}
                <div className="flex items-center gap-4 mt-2 font-mono text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded inline-flex border border-slate-200">
                  {business.panNumber && <span>PAN: {business.panNumber}</span>}
                  {business.vatNumber && <span>VAT: {business.vatNumber}</span>}
                  {!business.panNumber && !business.vatNumber && <span>PAN/VAT: N/A</span>}
                </div>
              </div>

              <div className="mt-4 sm:mt-0 text-left sm:text-right">
                <div className="inline-block bg-indigo-700 text-white px-4 py-1.5 rounded font-black text-sm uppercase tracking-wider mb-2">
                  TAX INVOICE
                </div>
                <p className="font-mono text-lg font-bold text-slate-900">{invoice.invoiceNumber}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Issue Date: {new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-indigo-700 font-bold">
                  मिति (B.S.): {formatBSDate(invoice.issueDate || invoice.createdAt, 'en')} ({formatBSDate(invoice.issueDate || invoice.createdAt, 'ne')})
                </p>
                <p className="text-xs text-slate-600 font-medium">
                  Payment Method: <span className="font-bold uppercase text-slate-900">{sale.paymentMethod}</span>
                </p>
              </div>
            </div>

            {/* Billed To / Customer Details */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">Billed To (Customer)</p>
                <p className="font-extrabold text-slate-900 text-base">{customer ? customer.name : 'Walk-in Customer'}</p>
                {customer?.address && <p className="text-sm text-slate-600">{customer.address}</p>}
                {customer?.phone && <p className="text-sm text-slate-600">Phone: {customer.phone}</p>}
                {customer?.panNumber && <p className="text-xs font-mono text-slate-600 mt-1 font-semibold">PAN: {customer.panNumber}</p>}
              </div>

              <div className="md:text-right">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">Invoice Overview</p>
                <p className="text-sm text-slate-700 font-medium">
                  Status: <span className="font-extrabold uppercase text-emerald-700">{sale.status}</span>
                </p>
                <p className="text-sm text-slate-700 font-medium">
                  Sale Ref: <span className="font-mono font-bold">{sale.saleNumber || sale.$id.slice(0, 8)}</span>
                </p>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-xs tracking-wider">
                    <th className="py-2.5 px-3 rounded-l">SN</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right rounded-r">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {saleItems.map((item, idx) => (
                    <tr key={item.$id || idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono text-xs text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{item.productNameSnapshot}</td>
                      <td className="py-3 px-3 text-center font-mono font-semibold">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono">Rs. {item.unitPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {item.discount > 0 ? `Rs. ${item.discount.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        Rs. {item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-t border-slate-200 pt-6">
              <div className="max-w-xs text-xs text-slate-500 space-y-1 mb-4 sm:mb-0">
                <p className="font-extrabold text-slate-700 uppercase">Terms & Conditions</p>
                <p>1. Goods once sold are subject to store return policy.</p>
                <p>2. Computer-generated tax invoice valid without signature.</p>
                <p className="mt-4 italic font-bold text-slate-700">Thank you for your business!</p>
              </div>

              <div className="w-full sm:w-72 bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2">
                <div className="flex justify-between text-sm text-slate-600 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">Rs. {sale.subtotal.toFixed(2)}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-700 font-medium">
                    <span>Discount:</span>
                    <span className="font-mono font-bold">- Rs. {sale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-600 font-medium">
                  <span>VAT / Tax (13%):</span>
                  <span className="font-mono font-bold text-slate-900">Rs. {sale.tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-300 pt-2 flex justify-between text-base font-extrabold text-slate-900">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-700">Rs. {sale.total.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-xs text-slate-600 font-medium">
                  <span>Paid Amount:</span>
                  <span className="font-mono font-bold text-slate-900">Rs. {sale.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-extrabold text-amber-800">
                  <span>Due Balance:</span>
                  <span className="font-mono">Rs. {sale.dueAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== 80MM POS THERMAL RECEIPT FORMAT ==================== */
          <div className="w-[80mm] max-w-full bg-white text-slate-900 shadow-sm p-4 font-mono text-xs rounded-lg border border-slate-300 print:p-0 print:shadow-none print:border-none print:w-[80mm]">
            {/* Business Title Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
              <h2 className="font-black text-base uppercase text-slate-900">{business.name}</h2>
              {business.address && <p className="text-[10px] text-slate-600">{business.address}</p>}
              {business.phone && <p className="text-[10px] text-slate-600">TEL: {business.phone}</p>}
              {business.panNumber && <p className="text-[10px] text-slate-800 font-bold mt-1">PAN: {business.panNumber}</p>}
              <div className="my-2 border-t border-slate-900 w-full" />
              <p className="font-bold text-sm tracking-wider">CASH RECEIPT</p>
            </div>

            {/* Meta Details */}
            <div className="space-y-1 mb-3 text-[11px]">
              <div className="flex justify-between">
                <span>INV #:</span>
                <span className="font-bold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{new Date(invoice.issueDate || invoice.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>CUST:</span>
                <span className="font-semibold">{customer ? customer.name : 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span>PAY:</span>
                <span className="uppercase">{sale.paymentMethod}</span>
              </div>
            </div>

            {/* Items List */}
            <div className="border-t border-b border-dashed border-slate-400 py-2 mb-3 space-y-2">
              <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500">
                <span>Item</span>
                <span>Qty x Rate</span>
                <span>Total</span>
              </div>
              {saleItems.map((item, idx) => (
                <div key={item.$id || idx} className="text-[11px]">
                  <div className="font-bold text-slate-900">{item.productNameSnapshot}</div>
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {item.quantity} x Rs. {item.unitPrice.toFixed(2)}
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
                <span>Rs. {sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Discount:</span>
                  <span>- Rs. {sale.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>VAT (13%):</span>
                <span>Rs. {sale.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm border-t border-slate-900 pt-1 mt-1">
                <span>TOTAL:</span>
                <span>Rs. {sale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid:</span>
                <span>Rs. {sale.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800">
                <span>Due:</span>
                <span>Rs. {sale.dueAmount.toFixed(2)}</span>
              </div>
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
