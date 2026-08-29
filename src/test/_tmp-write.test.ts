import { it } from 'vitest'
import fs from 'fs'
import { generateMegaExcelBuffer } from '@/lib/export/mega-report-excel'

// Temporary helper to dump a real workbook for external validation.
// Reuses the acceptance fixture by duplicating the minimal build path.
import { generateMegaReportPdf } from '@/lib/pdf/mega-report-pdf'

it('writes a workbook to disk for validation', async () => {
  // Use the same fixture approach as mega-report.test by importing a tiny generator
  // is impractical here; instead reuse the test fixture via a dynamic build.
  const { buildFinancialData } = await import('@/test/mega-report.test')
  const data = buildFinancialData()
  const buf = await generateMegaExcelBuffer({ data })
  fs.writeFileSync('C:/Users/mohit/AppData/Local/Temp/opencode/validate.xlsx', Buffer.from(buf))
  // also produce PDF to make sure fixture path is valid
  generateMegaReportPdf({ data })
})
