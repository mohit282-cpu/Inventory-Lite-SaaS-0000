"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { Sale } from '@/types'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface SalesRegisterProps {
  sales: Sale[]
}

export function SalesRegister({ sales }: SalesRegisterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = sale.saleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          sale.invoiceId?.toLowerCase().includes(searchTerm.toLowerCase())
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
                <TableHead>Date</TableHead>
                <TableHead>Sale #</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No sales found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.$id}>
                    <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{sale.saleNumber || `SALE-${sale.$id.slice(-6)}`}</TableCell>
                    <TableCell>{sale.invoiceId || '-'}</TableCell>
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
