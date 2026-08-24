"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { Expense } from '@/types'

export interface ExpenseReportProps {
  expenses: Expense[]
}

export function ExpenseReport({ expenses }: ExpenseReportProps) {
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  
  // Group by category
  const categoryMap = new Map<string, number>()
  expenses.forEach(e => {
    const cat = e.category || 'Uncategorized'
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (e.amount || 0))
  })

  const categoryData = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Expense Register & Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold mb-2">Breakdown by Category</h4>
            <div className="space-y-2">
              {categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expenses recorded.</p>
              ) : (
                categoryData.map(c => (
                  <div key={c.category} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                    <span className="text-sm capitalize">{c.category}</span>
                    <span className="font-medium">{formatCurrency(c.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Recent Expenses</h4>
            <div className="rounded-md border max-h-[250px] overflow-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">No expenses found.</TableCell>
                    </TableRow>
                  ) : (
                    expenses.slice(0, 100).map((e) => (
                      <TableRow key={e.$id}>
                        <TableCell>{new Date(e.date || e.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{e.description || e.title || '-'}</TableCell>
                        <TableCell className="capitalize">{e.category}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(e.amount || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
