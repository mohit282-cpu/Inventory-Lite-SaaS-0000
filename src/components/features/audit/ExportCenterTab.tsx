"use client"


import { exportToCSV } from '@/lib/export/csv-export'
import { exportToPDF } from '@/lib/export/pdf-export'
import { exportToExcel } from '@/lib/export/excel-export'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface ExportCenterTabProps {
  businessName: string
  panNumber: string
  fiscalYear: string
  salesData: any
  purchaseData: any
  vatData?: any
  customerData: any
  supplierData: any
}

export function ExportCenterTab({
  businessName,
  panNumber,
  fiscalYear,
  salesData,
  purchaseData,
  vatData,
  customerData,
  supplierData,
}: ExportCenterTabProps) {
  const { toast } = useToast()

  const handleExport = async (format: 'pdf' | 'csv' | 'xlsx', reportName: string, data: any[]) => {
    try {
      const payload = {
        title: reportName,
        businessName: businessName || 'My Business',
        panNumber: panNumber || 'N/A',
        fiscalYear: fiscalYear || '2081/82',
        generatedAt: new Date().toISOString(),
        items: data || [],
      }

      if (format === 'csv') {
        exportToCSV(payload as any, 'sales')
      } else if (format === 'pdf') {
        exportToPDF(payload as any)
      } else if (format === 'xlsx') {
        await exportToExcel(payload as any)
      }

      toast({
        title: 'Export Generated Successfully',
        description: `${reportName} (${format.toUpperCase()}) exported with full business metadata.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: err.message || 'Failed to export report.',
      })
    }
  }

  const reportsList = [
    { name: 'Sales Register Report', data: salesData?.rows || [] },
    { name: 'Purchase Register Report', data: purchaseData?.rows || [] },
    { name: 'VAT Summary Report', data: vatData ? [vatData] : [] },
    { name: 'Customer Receivables Ledger', data: customerData || [] },
    { name: 'Supplier Payables Ledger', data: supplierData || [] },
  ]

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-indigo-950 text-white flex items-center justify-between shadow-md">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <Download className="h-5 w-5 text-indigo-400" />
            Audit & Compliance Export Center
          </h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            Export official audit evidence, registers, and ledgers in PDF, CSV, and Excel formats.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportsList.map((r, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">{r.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{r.data.length} records ready for audit download</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf', r.name, r.data)}
                className="h-8 text-xs font-bold gap-1.5 border-slate-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
              >
                <FileText className="h-3.5 w-3.5 text-red-600" /> PDF Document
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv', r.name, r.data)}
                className="h-8 text-xs font-bold gap-1.5 border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" /> CSV Table
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('xlsx', r.name, r.data)}
                className="h-8 text-xs font-bold gap-1.5 border-slate-300 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" /> Excel Spreadsheet
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
