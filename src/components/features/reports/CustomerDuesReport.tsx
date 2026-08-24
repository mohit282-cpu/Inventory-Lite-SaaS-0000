"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { Customer } from '@/types'

export interface CustomerDuesReportProps {
  customers: Customer[]
}

export function CustomerDuesReport({ customers }: CustomerDuesReportProps) {
  const customersWithDue = customers.filter(c => (c.totalDue || 0) > 0)
    .sort((a, b) => (b.totalDue || 0) - (a.totalDue || 0))

  const totalDueAmount = customersWithDue.reduce((sum, c) => sum + (c.totalDue || 0), 0)

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Customer Udhaar (Dues) Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Total Outstanding Udhaar</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDueAmount)}</p>
        </div>

        <div className="rounded-md border max-h-[300px] overflow-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Due Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customersWithDue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4">No pending udhaar.</TableCell>
                </TableRow>
              ) : (
                customersWithDue.map(c => (
                  <TableRow key={c.$id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatCurrency(c.totalDue || 0)}
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
