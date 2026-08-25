"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, X, QrCode } from 'lucide-react'
import { formatNPR } from '@/lib/localization'

export interface DemoReceiptItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  total: number
}

export interface DemoReceiptData {
  shopName: string
  shopAddress: string
  panVatNumber: string
  phone: string
  invoiceNumber: string
  date: string
  bsDate: string
  cashierName: string
  customerName?: string
  taxMode: 'pan' | 'vat' // 0% PAN vs 13% VAT
  items: DemoReceiptItem[]
  subtotal: number
  taxAmount: number
  totalAmount: number
  paymentMethod: string
  paidAmount: number
  changeAmount: number
  paperWidth?: '58mm' | '80mm'
}

interface DemoThermalReceiptProps {
  data: DemoReceiptData
  isOpen: boolean
  onClose: () => void
}

export function DemoThermalReceipt({ data, isOpen, onClose }: DemoThermalReceiptProps) {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(data.paperWidth || '80mm')

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const widthClass = paperWidth === '58mm' ? 'max-w-[280px]' : 'max-w-[360px]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white space-y-6 shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black print:p-0 print:max-w-none">
        
        {/* Modal Controls (Hidden when printing) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Thermal Receipt Preview</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper Size Toggle */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  paperWidth === '58mm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm (2&quot;)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  paperWidth === '80mm' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm (3&quot;)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Roll View */}
        <div className="flex justify-center print:block">
          <div
            id="thermal-receipt-content"
            className={`w-full ${widthClass} bg-white text-slate-900 p-4 font-mono text-xs shadow-md border border-slate-200 rounded-lg print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none`}
          >
            {/* Shop Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
              <h2 className="text-sm font-extrabold tracking-tight uppercase text-slate-950 leading-tight">
                {data.shopName}
              </h2>
              <p className="text-[11px] text-slate-700">{data.shopAddress}</p>
              <p className="text-[11px] font-bold text-slate-900">
                {data.taxMode === 'vat' ? 'VAT Reg No:' : 'PAN No:'} {data.panVatNumber}
              </p>
              <p className="text-[11px] text-slate-700">Tel: {data.phone}</p>
              <div className="pt-1 font-bold text-[11px] uppercase tracking-wider text-slate-800">
                {data.taxMode === 'vat' ? 'TAX INVOICE' : 'ABBREVIATED TAX INVOICE (PAN)'}
              </div>
            </div>

            {/* Bill Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Inv No:</span>
                <span className="font-bold">{data.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date/Time:</span>
                <span>{data.bsDate} ({data.date})</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{data.cashierName}</span>
              </div>
              {data.customerName && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold">{data.customerName}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
              <div className="grid grid-cols-12 font-bold text-[10px] uppercase pb-1 border-b border-slate-300">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Total</span>
              </div>

              {data.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px] py-0.5 items-start">
                  <div className="col-span-6 leading-tight pr-1 font-medium">
                    {item.name}
                    <div className="text-[10px] text-slate-500">@ {formatNPR(item.unitPrice, false)}</div>
                  </div>
                  <div className="col-span-2 text-center font-bold">{item.quantity}</div>
                  <div className="col-span-4 text-right font-bold">{formatNPR(item.total, false)}</div>
                </div>
              ))}
            </div>

            {/* Totals & Tax Summary */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatNPR(data.subtotal)}</span>
              </div>

              {data.taxMode === 'vat' ? (
                <div className="flex justify-between">
                  <span>13% VAT:</span>
                  <span>{formatNPR(data.taxAmount)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>Tax (0% PAN):</span>
                  <span>Rs. 0.00</span>
                </div>
              )}

              <div className="flex justify-between text-xs font-extrabold pt-1 border-t border-slate-300 text-slate-950">
                <span>GRAND TOTAL:</span>
                <span>{formatNPR(data.totalAmount)}</span>
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="py-2 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-bold uppercase text-slate-900">{data.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Tendered:</span>
                <span>{formatNPR(data.paidAmount)}</span>
              </div>
              {data.changeAmount > 0 && (
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Change Given:</span>
                  <span>{formatNPR(data.changeAmount)}</span>
                </div>
              )}
            </div>

            {/* Receipt Footer & Fonepay Verification Stamp */}
            <div className="pt-3 border-t border-dashed border-slate-400 text-center space-y-2">
              <p className="text-[10px] font-semibold text-slate-700 uppercase">
                *** Thank You for Shopping! ***
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-500">
                <QrCode className="h-3.5 w-3.5" /> Verified by Fonepay / Inventory Lite POS
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (Print / Close) */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 print:hidden">
          <Button
            type="button"
            onClick={handlePrint}
            className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md"
          >
            <Printer className="mr-2 h-4 w-4" /> Print Thermal Receipt
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-semibold text-sm"
          >
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  )
}
