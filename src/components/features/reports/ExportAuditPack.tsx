"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileText } from 'lucide-react'
import { Invoice, Sale, Expense, Product, Customer } from '@/types'

export interface ExportAuditPackProps {
  businessId: string
  yearLabel: string
  sales: Sale[]
  invoices: Invoice[]
  expenses: Expense[]
  products: Product[]
  customers: Customer[]
}

export function ExportAuditPack({
  businessId,
  yearLabel,
  sales,
  invoices,
  expenses,
  products,
  customers,
}: ExportAuditPackProps) {

  const handleExportJSON = () => {
    const payload = {
      metadata: {
        businessId,
        financialYear: yearLabel,
        exportDate: new Date().toISOString(),
      },
      data: {
        sales,
        invoices,
        expenses,
        products,
        customers,
      }
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2))
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `Audit_Pack_${yearLabel.replace('/', '_')}.json`)
    document.body.appendChild(downloadAnchorNode)
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  const handleExportCSV = () => {
    alert('CSV Export is coming soon. Please use JSON export for now.')
  }

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-muted/30">
      <CardHeader>
        <CardTitle>Year-End Audit Package</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground flex-1">
            Download a complete, offline-ready package containing all financial transactions, invoices, inventory valuation, and customer balances for the selected financial year. Share this directly with your accountant or auditor.
          </p>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none" onClick={handleExportCSV}>
              <FileText className="w-4 h-4 mr-2" />
              Export CSVs
            </Button>
            <Button className="flex-1 md:flex-none" onClick={handleExportJSON}>
              <Download className="w-4 h-4 mr-2" />
              Export Full JSON
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
