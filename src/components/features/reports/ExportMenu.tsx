"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, Printer, FileText, Table, FileSpreadsheet, PackageOpen, Loader2 } from 'lucide-react'
import type { ExportDataPayload } from '@/lib/export/excel-export'
import { useToast } from '@/components/ui/use-toast'

export interface ExportMenuProps {
  data: ExportDataPayload
}

export function ExportMenu({ data }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const { toast } = useToast()

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    setExportStatus('Generating PDF...')
    try {
      await new Promise(r => setTimeout(r, 100))
      const { exportToPDF } = await import('@/lib/export/pdf-export')
      exportToPDF(data)
      toast({ title: 'Export Complete', description: 'PDF has been generated successfully.' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Export Failed', description: 'Unable to generate the report. Please try again.', variant: 'destructive' })
    } finally {
      setIsExporting(false)
      setExportStatus('')
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    setExportStatus('Generating Excel...')
    try {
      await new Promise(r => setTimeout(r, 100))
      const { exportToExcel } = await import('@/lib/export/excel-export')
      exportToExcel(data)
      toast({ title: 'Export Complete', description: 'Excel has been generated successfully.' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Export Failed', description: 'Unable to generate the report. Please try again.', variant: 'destructive' })
    } finally {
      setIsExporting(false)
      setExportStatus('')
    }
  }

  const handleExportCSV = async () => {
    setIsExporting(true)
    setExportStatus('Generating CSV...')
    try {
      await new Promise(r => setTimeout(r, 100))
      const { exportToCSV } = await import('@/lib/export/csv-export')
      exportToCSV(data, 'sales')
      toast({ title: 'Export Complete', description: 'Sales CSV has been generated successfully.' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Export Failed', description: 'Unable to generate the report. Please try again.', variant: 'destructive' })
    } finally {
      setIsExporting(false)
      setExportStatus('')
    }
  }

  const handleExportAuditPack = async () => {
    setIsExporting(true)
    setExportStatus('Generating Audit Pack...')
    try {
      await new Promise(r => setTimeout(r, 100))
      const [JSZipModule, ExcelJSModule, jsPDFModule] = await Promise.all([
        import('jszip'),
        import('exceljs'),
        import('jspdf'),
      ])
      const JSZip = JSZipModule.default || JSZipModule
      const ExcelJS = ExcelJSModule.default || ExcelJSModule
      const jsPDF = jsPDFModule.default || jsPDFModule

      const zip = new JSZip()
      const fileNameBase = `${data.businessName}_AuditPack_${data.yearLabel.replace('/', '_')}`

      // Generate the Excel workbook in memory using ExcelJS and add to zip
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

      // We will generate the PDF in memory
      const doc = new jsPDF()
      doc.text('Audit Pack Summary', 14, 15)
      doc.text(`Business: ${data.businessName}`, 14, 25)
      doc.text(`Financial Year: ${data.yearLabel}`, 14, 35)
      
      const pdfBlob = doc.output('blob')
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

      toast({ title: 'Export Complete', description: 'Audit Pack has been generated successfully.' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Export Failed', description: 'Unable to generate the report. Please try again.', variant: 'destructive' })
    } finally {
      setIsExporting(false)
      setExportStatus('')
    }
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      {isExporting && (
        <span className="text-sm text-slate-500 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {exportStatus}
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            Export / Print ▾
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            <span>Print Report</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportPDF}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Export PDF</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportExcel}>
            <Table className="mr-2 h-4 w-4" />
            <span>Export Excel</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            <span>Export CSV</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportAuditPack}>
            <PackageOpen className="mr-2 h-4 w-4" />
            <span>Export Audit Pack</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
