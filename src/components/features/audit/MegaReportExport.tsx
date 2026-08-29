"use client"

import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/context/auth-context'
import { getCurrentFiscalYear } from '@/lib/date/bs-date'
import { sanitizeFilename } from '@/lib/pdf/formatters'
import { MEGA_SECTIONS, MEGA_SECTION_KEYS, ALL_MEGA_SECTIONS, type MegaSectionKey } from '@/lib/export/mega-report-sections'

const FISCAL_YEARS = [
  { value: '2081/82', label: 'FY 2081/82 (2024-25)' },
  { value: '2080/81', label: 'FY 2080/81 (2023-24)' },
  { value: '2079/80', label: 'FY 2079/80 (2022-23)' },
  { value: '2078/79', label: 'FY 2078/79 (2021-22)' },
  { value: '2077/78', label: 'FY 2077/78 (2020-21)' },
]

type DatePreset = 'today' | 'week' | 'month' | 'fiscal' | 'custom' | 'all'

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'fiscal', label: 'This Fiscal Year' },
  { value: 'custom', label: 'Custom Range' },
  { value: 'all', label: 'All Time' },
]

interface MegaReportExportProps {
  onProgress?: (message: string | null) => void
  defaultFiscalYear?: string
}

export function MegaReportExport({ onProgress, defaultFiscalYear }: MegaReportExportProps) {
  const { toast } = useToast()
  const { user, activeBusiness } = useAuth()

  const [preset, setPreset] = useState<DatePreset>('fiscal')
  const [fiscalYear, setFiscalYear] = useState<string>(defaultFiscalYear || getCurrentFiscalYear())
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [selectedSections, setSelectedSections] = useState<Set<MegaSectionKey>>(() => new Set(ALL_MEGA_SECTIONS))
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)

  const sectionEntries = useMemo(() => MEGA_SECTION_KEYS.map((k) => ({ key: k, label: MEGA_SECTIONS[k] })), [])

  const allSelected = selectedSections.size === MEGA_SECTION_KEYS.length

  const toggleSection = (key: MegaSectionKey) => {
    setSelectedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedSections(new Set(allSelected ? [] : ALL_MEGA_SECTIONS))
  }

  const buildDateRange = (): { dateFrom?: string; dateTo?: string } => {
    const end = new Date()
    const start = new Date()
    const iso = (d: Date) => d.toISOString().slice(0, 10)

    switch (preset) {
      case 'today':
        return { dateFrom: iso(end), dateTo: iso(end) }
      case 'week': {
        const day = end.getDay() === 0 ? 7 : end.getDay()
        start.setDate(end.getDate() - (day - 1))
        return { dateFrom: iso(start), dateTo: iso(end) }
      }
      case 'month':
        start.setDate(1)
        return { dateFrom: iso(start), dateTo: iso(end) }
      case 'custom':
        return { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
      case 'all':
      case 'fiscal':
      default:
        return {}
    }
  }

  const setProgressMsg = (msg: string | null) => {
    setProgress(msg)
    onProgress?.(msg)
  }

  const handleExport = async () => {
    if (!activeBusiness || !user) {
      toast({ variant: 'destructive', title: 'Cannot Export', description: 'You must be signed into an active business to export the Mega Report.' })
      return
    }
    if (preset === 'custom' && (!dateFrom || !dateTo)) {
      toast({ variant: 'destructive', title: 'Custom Range Missing', description: 'Please select both start and end dates for a custom range.' })
      return
    }

    setIsExporting(true)
    try {
      setProgressMsg('Preparing data...')

      const { getMegaReportData } = await import('@/services/mega-report.service')
      const data = await getMegaReportData({
        businessId: activeBusiness.$id,
        userId: user.$id,
        filters: {
          fiscalYear,
          ...buildDateRange(),
        },
      })

      if (!data || data.meta.business.name !== activeBusiness.name) {
        setProgressMsg(null)
        toast({ variant: 'destructive', title: 'Data Mismatch', description: 'Exported report did not match the selected business.' })
        return
      }

      setProgressMsg('Generating PDF...')
      const { generateMegaReportPdf } = await import('@/lib/pdf/mega-report-pdf')
      const pdf = generateMegaReportPdf({ data, include: selectedSections })
      const pdfName = filename('Mega_Report', fiscalYear)
      pdf.save(pdfName)

      setProgressMsg('Generating Excel workbook...')
      const { generateMegaExcelBuffer } = await import('@/lib/export/mega-report-excel')
      const buffer = await generateMegaExcelBuffer({ data, include: selectedSections })
      downloadBlob(
        new Blob([new Uint8Array(buffer)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        filename('Mega_Report', fiscalYear, 'xlsx'),
      )

      setProgressMsg(null)
      toast({ title: 'Mega Business Report Exported', description: 'One PDF + one Excel workbook generated for the selected business, range, and financial year.' })
    } catch (err: any) {
      setProgressMsg(null)
      toast({
        variant: 'destructive',
        title: 'Mega Report Export Failed',
        description: err?.message || 'An unexpected error occurred while generating the Mega Report.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-indigo-950 text-white shadow-md">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <Download className="h-5 w-5 text-indigo-400" />
            Mega Business Report
          </h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            One-click export of the complete business report — a single PDF and a single Excel workbook
            with 28+ sections for the selected period and financial year.
          </p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Period</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPreset(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    preset === p.value
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset === 'custom' && (
              <div className="flex gap-2 mt-3">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 px-2 text-xs"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 px-2 text-xs"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Financial Year</label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="mt-2 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold"
            >
              {FISCAL_YEARS.map((fy) => (
                <option key={fy.value} value={fy.value}>
                  {fy.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1.5">
              FY bounds are merged with the selected period; opening/closing balances are respected.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Sections to Include</label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> {allSelected ? 'Clear All' : 'Select All'}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-3 max-h-64 overflow-y-auto pr-1">
            {sectionEntries.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedSections.has(key)}
                  onChange={() => toggleSection(key)}
                  className="h-3.5 w-3.5 rounded accent-indigo-600"
                />
                <span className="text-xs font-medium text-slate-700 leading-tight">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {progress && (
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {progress}
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={handleExport}
            disabled={isExporting || !activeBusiness || !user}
            className="h-10 px-5 text-sm font-bold gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            EXPORT MEGA REPORT
          </Button>
          <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
            <FileText className="h-3 w-3 text-red-500" /> PDF
            <span className="mx-1">+</span>
            <FileSpreadsheet className="h-3 w-3 text-emerald-600" /> Excel
            <span className="ml-2">— generated in one click</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function filename(root: string, fy: string, ext = 'pdf'): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${sanitizeFilename(root)}_${sanitizeFilename(fy)}_${date}.${ext}`
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
