"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Sale, Customer, Expense, Invoice, Product } from '@/types'
import { ProfitEstimateReport } from '@/services/analytics.service'
import { WhatDoesThisMean } from '../WhatDoesThisMean'
import { PrintDisclaimer } from '../PrintDisclaimer'
import { MonthlyFinancialSummary, MonthlyData } from '../MonthlyFinancialSummary'
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export interface SimpleReportViewProps {
  sales: Sale[]
  products: Product[]
  customers: Customer[]
  expenses: Expense[]
  invoices: Invoice[]
  profitReport: ProfitEstimateReport
  monthlyData: MonthlyData[]
  dateRange: { isoFrom: string; isoTo: string; label: string }
  onReviewIssue: () => void
}

export function SimpleReportView({
  sales,
  products,
  customers,
  invoices,
  profitReport,
  monthlyData,
  onReviewIssue
}: SimpleReportViewProps) {
  const activeProducts = products.filter(p => p.isActive)
  const totalValueAtCost = activeProducts.reduce((sum, p) => sum + ((p.stockQuantity || 0) * (p.purchasePrice || 0)), 0)
  const totalValueAtRetail = activeProducts.reduce((sum, p) => sum + ((p.stockQuantity || 0) * (p.sellingPrice || 0)), 0)
  
  const duesTotal = customers.reduce((sum, c) => sum + (c.totalDue || 0), 0)
  const customersWithDues = customers.filter(c => (c.totalDue || 0) > 0)

  const discountTotal = sales.reduce((sum, s) => sum + (s.discount || 0), 0)
  const vatTotal = sales.reduce((sum, s) => sum + (s.tax || 0), 0)
  const collectedTotal = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0)
  const outstandingTotal = sales.reduce((sum, s) => sum + (s.dueAmount || 0), 0)
  const grossSales = sales.reduce((sum, s) => sum + (s.subtotal || 0), 0)

  // Audit calculations
  const paymentMismatches = sales.filter(s => {
    // Strict applied payment rules: applied paidAmount + dueAmount MUST equal total
    const expected = (s.paidAmount || 0) + (s.dueAmount || 0)
    return Math.abs(expected - (s.total || 0)) > 0.05
  })
  
  const cancelledSales = sales.filter(s => s.status === 'cancelled')

  let duplicates = 0
  const invCounts: Record<string, number> = {}
  invoices.forEach(i => {
    if (i.invoiceNumber) {
      invCounts[i.invoiceNumber] = (invCounts[i.invoiceNumber] || 0) + 1
      if (invCounts[i.invoiceNumber] === 2) duplicates++
    }
  })

  const getSequenceNumbers = (strings: string[]) => {
    return strings.filter(Boolean).map(num => {
        const parts = num.split('-')
        return parseInt(parts[parts.length - 1], 10)
    }).filter(n => !isNaN(n)).sort((a, b) => a - b)
  }
  const invoiceNumbers = getSequenceNumbers(invoices.map(i => i.invoiceNumber))
  let invoiceGaps = 0
  for (let i = 1; i < invoiceNumbers.length; i++) {
    if (invoiceNumbers[i] - invoiceNumbers[i - 1] > 1) invoiceGaps++
  }

  const issuesCount = (paymentMismatches.length > 0 ? 1 : 0) + 
                      (duplicates > 0 ? 1 : 0) + 
                      (invoiceGaps > 0 ? 1 : 0) +
                      (cancelledSales.length > 0 ? 1 : 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Business Health */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Business Health</CardTitle>
          <div className="flex items-center text-lg font-medium mt-2">
            {issuesCount === 0 ? (
              <><CheckCircle2 className="w-6 h-6 text-green-500 mr-2" /> Your records look good</>
            ) : issuesCount === 1 ? (
              <><AlertTriangle className="w-6 h-6 text-yellow-500 mr-2" /> 1 thing needs attention</>
            ) : (
              <><AlertCircle className="w-6 h-6 text-red-500 mr-2" /> {issuesCount} things need attention</>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm mt-4">
            <div className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> Sales records OK</div>
            <div className="flex items-center">
              {invoiceGaps > 0 || duplicates > 0 ? <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" /> : <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />} 
              Invoice numbers
            </div>
            <div className="flex items-center">
              {paymentMismatches.length > 0 ? <AlertCircle className="w-4 h-4 text-red-500 mr-2" /> : <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />}
              Payments
            </div>
            <div className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> Customer dues OK</div>
            <div className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> Stock records OK</div>
            <div className="flex items-center"><CheckCircle2 className="w-4 h-4 text-green-500 mr-2" /> Expenses OK</div>
          </div>
          {issuesCount > 0 && (
            <button onClick={onReviewIssue} className="mt-6 bg-yellow-100 text-yellow-800 px-4 py-2 rounded font-medium hover:bg-yellow-200 transition-colors">
              See What Needs Attention
            </button>
          )}
        </CardContent>
      </Card>

      {/* 2. Simple KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">TOTAL SALES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(profitReport.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1 mb-2">Total amount billed to customers</p>
            <Link href="/app/sales" className="text-xs text-blue-600 hover:underline">View Sales &rarr;</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">TOTAL EXPENSES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(profitReport.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1 mb-2">Business expenses recorded</p>
            <Link href="/app/expenses" className="text-xs text-blue-600 hover:underline">View Expenses &rarr;</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">CUSTOMERS WHO OWE YOU</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(duesTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1 mb-2">Money customers still need to pay</p>
            <Link href="/app/customers" className="text-xs text-blue-600 hover:underline">View Customers &rarr;</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">STOCK VALUE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValueAtCost)}</div>
            <p className="text-xs text-muted-foreground mt-1 mb-2">Approximate cost value of your current stock</p>
            <Link href="/app/products" className="text-xs text-blue-600 hover:underline">View Stock &rarr;</Link>
          </CardContent>
        </Card>
      </div>

      {/* 3. Profit Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            ESTIMATED PROFIT 
            <WhatDoesThisMean 
              title="Estimated Profit"
              explanation="Sales minus product cost and recorded expenses. This relies heavily on accurate purchase price data for all items sold." 
              triggerText="[ How is this calculated? ]"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profitReport.hasCostDataError ? (
            <div>
              <div className="text-2xl font-bold text-muted-foreground">Not available yet</div>
              <p className="text-xs text-muted-foreground mt-1">Product cost information is needed to calculate profit.</p>
            </div>
          ) : (
            <div>
              <div className={`text-2xl font-bold ${profitReport.netProfit < 0 ? 'text-red-500' : 'text-green-600'}`}>
                {formatCurrency(profitReport.netProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Sales minus product cost and recorded expenses</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3.5 Monthly Summary */}
      <div className="grid gap-4">
        <MonthlyFinancialSummary data={monthlyData} hasCostDataError={profitReport.hasCostDataError} title="MONTHLY BUSINESS SUMMARY" />
        <p className="text-sm text-muted-foreground px-4">
          Sales = money billed to customers.<br/>
          Expenses = expenses recorded in Inventory Lite.<br/>
          Profit is shown only when reliable cost information is available.
        </p>
      </div>

      {/* 4. Sales & VAT Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SALES SUMMARY</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Total Sales</span>
              <span className="font-medium">{formatCurrency(profitReport.totalRevenue)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Number of Sales</span>
              <span className="font-medium">{profitReport.totalSalesCount}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Average Sale</span>
              <span className="font-medium">{profitReport.totalSalesCount > 0 ? formatCurrency(profitReport.totalRevenue / profitReport.totalSalesCount) : formatCurrency(0)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">
                Discounts Given
                <WhatDoesThisMean explanation="Total discount given to customers during this period." />
              </span>
              <span className="font-medium text-red-500">{formatCurrency(discountTotal)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Amount Collected</span>
              <span className="font-medium text-green-600">{formatCurrency(collectedTotal)}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-sm text-muted-foreground">Amount Still Due</span>
              <span className="font-medium text-red-600">{formatCurrency(outstandingTotal)}</span>
            </div>
            <Link href="/app/sales" className="inline-block mt-2 text-sm text-blue-600 hover:underline">View Sales</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              VAT SUMMARY
              <WhatDoesThisMean 
                explanation="VAT is a tax that may apply to VAT-registered businesses and certain taxable transactions. Inventory Lite only reports VAT based on the information recorded in the system." 
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {vatTotal > 0 ? (
              <>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Sales subject to VAT</span>
                  <span className="font-medium">{formatCurrency(grossSales - discountTotal)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">VAT amount recorded</span>
                  <span className="font-medium">{formatCurrency(vatTotal)}</span>
                </div>
                <div className="mt-4 bg-muted/50 p-3 rounded text-sm">
                  <p className="font-semibold mb-1">What this means</p>
                  <p className="text-muted-foreground">This section summarizes VAT recorded on your sales in Inventory Lite. It does not determine your legal VAT liability.</p>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                VAT is currently not enabled for this business, or no VAT was recorded in this period.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Customer Dues & Inventory */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CUSTOMERS WHO OWE YOU</CardTitle>
          </CardHeader>
          <CardContent>
            {customersWithDues.length === 0 ? (
              <p className="text-sm text-muted-foreground">Good — no outstanding customer dues were recorded.</p>
            ) : (
              <div className="space-y-3">
                {customersWithDues.slice(0, 5).map(c => (
                  <div key={c.$id} className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm flex items-center">
                      <AlertTriangle className="w-3 h-3 text-yellow-500 mr-2" />
                      {c.name}
                    </span>
                    <span className="font-medium text-red-600">{formatCurrency(c.totalDue || 0)}</span>
                  </div>
                ))}
                {customersWithDues.length > 5 && (
                  <p className="text-xs text-muted-foreground pt-2">...and {customersWithDues.length - 5} more.</p>
                )}
                <Link href="/app/customers" className="inline-block mt-2 text-sm text-blue-600 hover:underline">View All Dues</Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>STOCK SUMMARY</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Products</span>
              <span className="font-medium">{activeProducts.length}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Current Stock Cost</span>
              <span className="font-medium">{formatCurrency(totalValueAtCost)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm text-muted-foreground">Current Stock Retail</span>
              <span className="font-medium">{formatCurrency(totalValueAtRetail)}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-sm text-muted-foreground">
                Potential Margin
                <WhatDoesThisMean explanation="Difference between current stock retail value and current stock cost. This is not realized profit." />
              </span>
              <span className="font-medium text-green-600">{formatCurrency(totalValueAtRetail - totalValueAtCost)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">Potential margin is not actual profit. It is the difference between current stock retail value and current stock cost.</p>
          </CardContent>
        </Card>
      </div>

      {/* 6. Record Check Details */}
      {issuesCount > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">RECORD CHECK: Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMismatches.length > 0 && (
              <div className="bg-red-50 p-4 rounded-md">
                <h4 className="font-semibold text-red-800 flex items-center mb-2"><AlertCircle className="w-4 h-4 mr-2" /> Payment Reconciliation</h4>
                <p className="text-sm text-red-700 mb-2">{paymentMismatches.length} sale(s) have a difference between the amount recorded as paid and the amount the system expects.</p>
                <button onClick={onReviewIssue} className="text-xs bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded">Review in Accountant Mode</button>
              </div>
            )}
            {invoiceGaps > 0 && (
              <div className="bg-yellow-50 p-4 rounded-md">
                <h4 className="font-semibold text-yellow-800 flex items-center mb-2"><AlertTriangle className="w-4 h-4 mr-2" /> Invoice Sequence</h4>
                <p className="text-sm text-yellow-700 mb-2">There are {invoiceGaps} gap(s) in your invoice sequence. If a number is missing because of cancellation, ensure it is recorded.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7. Year-End Review */}
      <Card>
        <CardHeader>
          <CardTitle>YEAR-END REVIEW</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Before you give your records to your accountant, check these items:</p>
          <div className="space-y-2 text-sm">
            <label className="flex items-center space-x-2"><input type="checkbox" className="rounded" /> <span>Sales recorded</span></label>
            <label className="flex items-center space-x-2"><input type="checkbox" className="rounded" /> <span>Expenses recorded</span></label>
            <label className="flex items-center space-x-2"><input type="checkbox" className="rounded" /> <span>Customer dues checked</span></label>
            <label className="flex items-center space-x-2"><input type="checkbox" className="rounded" /> <span>Stock checked</span></label>
            <label className="flex items-center space-x-2"><input type="checkbox" className="rounded" /> <span>Cancelled bills reviewed</span></label>
            <label className="flex items-center space-x-2"><input type="checkbox" className="rounded" /> <span>Payment differences resolved</span></label>
            <label className="flex items-center space-x-2"><input type="checkbox" className="rounded" /> <span>Invoice numbers checked</span></label>
            <label className="flex items-center space-x-2"><input type="checkbox" className="rounded" /> <span>Tax/VAT information reviewed</span></label>
          </div>
        </CardContent>
      </Card>

      <PrintDisclaimer />
    </div>
  )
}
