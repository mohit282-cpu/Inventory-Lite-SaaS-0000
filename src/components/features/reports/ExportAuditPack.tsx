"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Printer, FileText, Table, FileSpreadsheet, PackageOpen, Loader2 } from 'lucide-react'
import { ExportDataPayload, exportToExcel } from '@/lib/export/excel-export'
import { exportToPDF } from '@/lib/export/pdf-export'
import { exportToCSV } from '@/lib/export/csv-export'
import { buildAuditPackPdf } from '@/lib/export/audit-pack-pdf'
import { useToast } from '@/components/ui/use-toast'
import JSZip from 'jszip'
import ExcelJS from 'exceljs'


export interface ExportAuditPackProps {
  data: ExportDataPayload
}

export function ExportAuditPack({ data }: ExportAuditPackProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<string | null>(null)
  const { toast } = useToast()

  const handlePrint = () => {
    window.print()
  }

  const handleExport = async (type: 'pdf' | 'excel' | 'csv' | 'pack') => {
    setIsExporting(true)
    setExportType(type)
    try {
      await new Promise((r) => setTimeout(r, 100))

      if (type === 'pdf') {
        exportToPDF(data)
      } else if (type === 'excel') {
        await exportToExcel(data)
      } else if (type === 'csv') {
        exportToCSV(data, 'sales')
      } else if (type === 'pack') {
        const zip = new JSZip()
        const fileNameBase = `${data.businessName}_AuditPack_${data.yearLabel.replace('/', '_')}`

        const wb = new ExcelJS.Workbook()
        const sheet = wb.addWorksheet('01 Sales')
        sheet.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Sale Number', key: 'saleNumber', width: 20 },
          { header: 'Total', key: 'total', width: 15 },
        ]

        data.sales.forEach((s) => {
          sheet.addRow({
            date: new Date(s.createdAt).toLocaleDateString(),
            saleNumber: s.saleNumber || s.$id,
            total: s.total,
          })
        })

        const excelBuffer = await wb.xlsx.writeBuffer()
        zip.file(`${fileNameBase}.xlsx`, excelBuffer)

        const pdfBlob = buildAuditPackPdf(data)
        zip.file(`${fileNameBase}.pdf`, pdfBlob)
  
        const zipContent = await zip.generateAsync({ type: 'blob' })
        const url = URL.createObjectURL(zipContent)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileNameBase}.zip`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
      
      toast({ title: 'Export Complete', description: `Successfully exported ${type.toUpperCase()}.` })
    } catch (e) {
      console.error(e)
      toast({ title: 'Export Failed', description: 'Unable to generate the export. Please try again.', variant: 'destructive' })
    } finally {
      setIsExporting(false)
      setExportType(null)
    }
  }

  return (
    <Card className="w-full bg-slate-50 dark:bg-slate-900 border-2">
      <CardHeader>
        <CardTitle className="text-xl">Year-End Audit Package</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-6">
          <p className="text-sm text-muted-foreground w-full max-w-4xl">
            Export all financial, transaction, inventory and audit records for Financial Year {data.yearLabel}.
            This offline-ready package contains everything you need to share with your accountant or auditor.
          </p>
          
          <div className="flex flex-wrap items-center gap-3 w-full">
            <Button variant="outline" onClick={handlePrint} disabled={isExporting} className="flex-1 sm:flex-none">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')} disabled={isExporting} className="flex-1 sm:flex-none">
              {isExporting && exportType === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2 text-red-500" />}
              PDF
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')} disabled={isExporting} className="flex-1 sm:flex-none">
              {isExporting && exportType === 'excel' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Table className="w-4 h-4 mr-2 text-green-600" />}
              Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('csv')} disabled={isExporting} className="flex-1 sm:flex-none">
              {isExporting && exportType === 'csv' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-500" />}
              CSV
            </Button>
            <Button onClick={() => handleExport('pack')} disabled={isExporting} className="flex-1 sm:flex-none w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
              {isExporting && exportType === 'pack' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackageOpen className="w-4 h-4 mr-2" />}
              Export Audit Pack
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
