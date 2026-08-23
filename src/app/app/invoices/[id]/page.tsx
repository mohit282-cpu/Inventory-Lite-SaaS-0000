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
import { formatBSDate, getSellerTaxLabel, getBillSummaryDetails } from '@/lib/localization'

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

  if (loading) {
    return <LoadingPage message="Loading tax invoice..." />
  }

  if (error || !details) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center no-print">
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
  const sellerTaxInfo = getSellerTaxLabel(business)
  const billSummary = getBillSummaryDetails(sale)

  const issueDateObj = new Date(invoice.issueDate || invoice.createdAt || sale.createdAt)
  const formattedADDate = issueDateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const formattedTime = issueDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 text-slate-900 print:space-y-0">
      {/* Top Action Bar (100% Hidden during printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 shadow-sm rounded-xl p-4 no-print print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/app/invoices">
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Invoices
            </Button>
          </Link>
          <div className="h-4 w-[1px] bg-slate-200" />
          <h1 className="text-lg font-bold text-slate-900 font-mono whitespace-nowrap">{invoice.invoiceNumber}</h1>
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
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4"
          >
            <Printer className="mr-2 h-4 w-4" /> Print Invoice
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold h-9 px-4"
          >
            <Download className="mr-2 h-4 w-4 text-emerald-600" /> Save PDF
          </Button>
        </div>
      </div>

      {/* Invoice Printable View Container */}
      <div className="flex justify-center print:block print:w-full">
        {format === 'A4' ? (
          /* ==================== A4 TAX / SALES INVOICE FORMAT ==================== */
          <div className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-sm border border-slate-200 p-8 print:p-0 print:shadow-none print:border-none print:max-w-none print:w-full print:rounded-none">
            {/* Header / Business Info */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">{business.name}</h1>
                {business.address && <p className="text-sm text-slate-600 mt-1">{business.address}</p>}
                <p className="text-sm text-slate-700 font-medium mt-0.5">
                  Mobile No (Seller): <span className="font-mono font-bold text-slate-900">{business.phone || 'N/A'}</span>
                </p>
                {business.email && <p className="text-sm text-slate-600">Email: {business.email}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-2 font-mono text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 print:bg-transparent print:p-0 print:border-none">
                  {sellerTaxInfo.pan && <span>PAN of the seller: <strong className="text-slate-900">{sellerTaxInfo.pan}</strong></span>}
                  {sellerTaxInfo.pan && sellerTaxInfo.vat && <span className="text-slate-300 print:hidden">|</span>}
                  {sellerTaxInfo.vat && <span>VAT of the seller: <strong className="text-slate-900">{sellerTaxInfo.vat}</strong></span>}
                  {!sellerTaxInfo.pan && !sellerTaxInfo.vat && <span>PAN of the seller: <strong className="text-slate-900">N/A</strong></span>}
                </div>
              </div>

              <div className="mt-4 sm:mt-0 text-left sm:text-right">
                <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded font-black text-sm uppercase tracking-wider mb-2 print:bg-transparent print:text-black print:p-0 print:text-base">
                  {billSummary.invoiceTitleEn} ({billSummary.invoiceTitleNe})
                </div>
                <p className="text-xs uppercase text-slate-500 font-extrabold tracking-wider">Bill No</p>
                <p className="font-mono text-lg font-bold text-slate-900 whitespace-nowrap break-keep">{invoice.invoiceNumber}</p>
                
                <p className="text-xs uppercase text-slate-500 font-extrabold tracking-wider mt-2">Billing Date & Time</p>
                <p className="text-xs text-slate-700 font-bold">
                  {formattedADDate} AD ({formattedTime})
                </p>
                <p className="text-xs text-indigo-700 print:text-black font-bold">
                  मिति (B.S.): {formatBSDate(invoice.issueDate || invoice.createdAt, 'en')} ({formatBSDate(invoice.issueDate || invoice.createdAt, 'ne')})
                </p>
                
                <p className="text-xs text-slate-700 font-medium mt-2">
                  Means of Payment: <span className="font-extrabold uppercase text-slate-900">{sale.paymentMethod.replace('_', ' ')}</span>
                </p>
              </div>
            </div>

            {/* Billed To / Customer Details */}
            <div className="bg-slate-50 print:bg-transparent rounded-lg border border-slate-200 print:border-slate-300 p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">Buyer&apos;s Name</p>
                <p className="font-extrabold text-slate-900 text-base">{customer ? customer.name : 'Walk-in Customer'}</p>
                {customer?.address && <p className="text-sm text-slate-600">{customer.address}</p>}
                {customer?.phone && (
                  <p className="text-sm text-slate-700 font-medium mt-0.5">
                    Mobile Number: <span className="font-mono font-bold text-slate-900">{customer.phone}</span>
                  </p>
                )}
                {customer?.panNumber && <p className="text-xs font-mono text-slate-600 mt-1 font-semibold">PAN / VAT: {customer.panNumber}</p>}
              </div>

              <div className="md:text-right">
                <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider mb-1">Invoice Overview</p>
                <p className="text-sm text-slate-700 font-medium">
                  Payment Status: <span className="font-extrabold uppercase text-slate-900">{sale.status}</span>
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
                  <tr className="bg-slate-900 text-white print:bg-slate-100 print:text-black uppercase text-xs tracking-wider border-b-2 border-slate-900">
                    <th className="py-2.5 px-3 rounded-l print:rounded-none">SN</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Discount</th>
                    <th className="py-2.5 px-3 text-right rounded-r print:rounded-none">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                  {saleItems.map((item, idx) => (
                    <tr key={item.$id || idx} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono text-xs text-slate-500 font-medium">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 break-words">{item.productNameSnapshot}</td>
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

              <div className="w-full sm:w-72 bg-slate-50 print:bg-transparent rounded-lg p-4 border border-slate-200 space-y-2">
                <div className="flex justify-between text-sm text-slate-600 font-medium">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">Rs. {billSummary.subtotal.toFixed(2)}</span>
                </div>
                {billSummary.showDiscount && (
                  <div className="flex justify-between text-sm text-emerald-700 font-medium">
                    <span>{billSummary.discountLabel}</span>
                    <span className="font-mono font-bold">{billSummary.discountFormatted}</span>
                  </div>
                )}
                {billSummary.showTaxableAmount && (
                  <div className="flex justify-between text-sm text-slate-600 font-medium">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-bold text-slate-900">Rs. {billSummary.taxableAmount.toFixed(2)}</span>
                  </div>
                )}
                {billSummary.showVat && (
                  <div className="flex justify-between text-sm text-slate-600 font-medium">
                    <span>{billSummary.vatLabel}</span>
                    <span className="font-mono font-bold text-slate-900">{billSummary.vatFormatted}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-2 flex justify-between text-base font-extrabold text-slate-900">
                  <span>Total Amount:</span>
                  <span className="font-mono text-emerald-700 font-black">Rs. {billSummary.grandTotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-xs text-slate-600 font-medium">
                  <span>Paid Amount:</span>
                  <span className="font-mono font-bold text-slate-900">Rs. {billSummary.paidAmount.toFixed(2)}</span>
                </div>
                {billSummary.dueAmount > 0 ? (
                  <div className="flex justify-between text-xs font-extrabold text-amber-800">
                    <span>Outstanding Due (Udhaar):</span>
                    <span className="font-mono">Rs. {billSummary.dueAmount.toFixed(2)}</span>
                  </div>
                ) : billSummary.changeAmount > 0 ? (
                  <div className="flex justify-between text-xs font-extrabold text-emerald-700">
                    <span>Change Returned:</span>
                    <span className="font-mono">Rs. {billSummary.changeAmount.toFixed(2)}</span>
                  </div>
                ) : null}
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
              <p className="text-[10px] text-slate-800 font-bold">TEL: {business.phone || 'N/A'}</p>
              <p className="text-[10px] text-slate-800 font-bold mt-0.5">{sellerTaxInfo.formattedText}</p>
              <div className="my-2 border-t border-slate-900 w-full" />
              <p className="font-bold text-sm tracking-wider uppercase">{billSummary.invoiceTitleEn}</p>
            </div>

            {/* Meta Details */}
            <div className="space-y-1 mb-3 text-[11px]">
              <div className="flex justify-between">
                <span>Bill No:</span>
                <span className="font-bold whitespace-nowrap">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Billing Date:</span>
                <span>{formattedADDate} ({formattedTime})</span>
              </div>
              <div className="flex justify-between">
                <span>B.S. Date:</span>
                <span>{formatBSDate(invoice.issueDate || invoice.createdAt, 'en')}</span>
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
              {saleItems.map((item, idx) => (
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
