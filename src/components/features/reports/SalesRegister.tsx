"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { Sale, Customer, Invoice } from '@/types'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatBSDate } from '@/lib/date/bs-date'

export interface SalesRegisterProps {
  sales: Sale[]
  customers?: Customer[]
  invoices?: Invoice[]
}

export function SalesRegister({ sales, customers = [], invoices = [] }: SalesRegisterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const getCustomerName = (id?: string) => customers.find(c => c.$id === id)?.name || 'Walk-in Customer'
  const getInvoiceNumber = (id?: string) => invoices.find(i => i.$id === id)?.invoiceNumber || '-'

  const filteredSales = sales.filter((sale) => {
    const custName = getCustomerName(sale.customerId)
    const invNum = getInvoiceNumber(sale.invoiceId)
    const matchesSearch = sale.saleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          invNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          custName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalSalesAmount = filteredSales.reduce((acc, sale) => acc + (sale.total || 0), 0)

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4">
      <CardHeader>
        <CardTitle>Sales Register</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <Input 
            placeholder="Search Sale or Invoice #" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:w-1/3"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-1/4">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto text-right">
            <p className="text-sm text-muted-foreground">Filtered Total</p>
            <p className="text-lg font-bold">{formatCurrency(totalSalesAmount)}</p>
          </div>
        </div>
        
        <div className="rounded-md border max-h-[400px] overflow-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>BS Date</TableHead>
                <TableHead>AD Date</TableHead>
                <TableHead>Sale #</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    No sales found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.$id}>
                    <TableCell className="font-medium whitespace-nowrap">{formatBSDate(sale.createdAt, { format: 'YYYY/MM/DD' })} BS</TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{new Date(sale.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} AD</TableCell>
                    <TableCell>{sale.saleNumber || '-'}</TableCell>
                    <TableCell>{getInvoiceNumber(sale.invoiceId)}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{getCustomerName(sale.customerId)}</TableCell>
                    <TableCell className="capitalize">{sale.paymentMethod?.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                        sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {sale.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total || 0)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(sale.paidAmount || 0)}
                    </TableCell>
                    <TableCell className="text-right text-red-500">
                      {formatCurrency(sale.dueAmount || 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
