"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { Purchase, Supplier } from '@/types'
import { Input } from '@/components/ui/input'
import { formatBSDate } from '@/lib/date/bs-date'

export interface PurchaseRegisterProps {
  purchases: Purchase[]
  suppliers?: Supplier[]
}

export function PurchaseRegister({ purchases, suppliers = [] }: PurchaseRegisterProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const getSupplierName = (id?: string) => suppliers.find(s => s.$id === id)?.name || 'Direct Supplier'

  const filteredPurchases = purchases.filter((p) => {
    const suppName = getSupplierName(p.supplierId)
    const billNum = p.supplierBillNumber || p.purchaseNumber || ''
    const q = searchTerm.toLowerCase().trim()
    return !q || billNum.toLowerCase().includes(q) || suppName.toLowerCase().includes(q)
  })

  const totalPurchaseAmount = filteredPurchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0)
  const totalPaidAmount = filteredPurchases.reduce((acc, p) => acc + (p.paidAmount || 0), 0)
  const totalDueAmount = filteredPurchases.reduce((acc, p) => acc + (p.dueAmount || 0), 0)

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Purchase Register</CardTitle>
        <span className="text-xs text-slate-500 font-mono">
          Count: {filteredPurchases.length} | Total: {formatCurrency(totalPurchaseAmount)}
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Input 
            placeholder="Search Supplier Name or Bill #" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:w-1/3 text-xs"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-[11px] uppercase tracking-wider font-bold">
                <TableHead>Date (BS)</TableHead>
                <TableHead>Bill / Ref #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 text-xs py-8">
                    No purchase transactions found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => {
                  const bsDateStr = formatBSDate(purchase.purchaseDate || purchase.createdAt)
                  return (
                    <TableRow key={purchase.$id} className="text-xs font-medium hover:bg-slate-50">
                      <TableCell className="font-mono">{bsDateStr}</TableCell>
                      <TableCell className="font-mono font-bold text-indigo-700">
                        {purchase.supplierBillNumber || purchase.purchaseNumber || purchase.$id.slice(-6)}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {getSupplierName(purchase.supplierId)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(purchase.totalAmount || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-700">
                        {formatCurrency(purchase.paidAmount || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-amber-700 font-bold">
                        {formatCurrency(purchase.dueAmount || 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          purchase.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                          purchase.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {purchase.paymentStatus || 'unpaid'}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap justify-between text-xs font-bold text-slate-700">
          <span>Total Purchases: {formatCurrency(totalPurchaseAmount)}</span>
          <span className="text-emerald-700">Total Paid: {formatCurrency(totalPaidAmount)}</span>
          <span className="text-amber-700">Total Outstanding Payable: {formatCurrency(totalDueAmount)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
