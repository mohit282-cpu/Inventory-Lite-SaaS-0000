import { it } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { generateMegaExcelBuffer } from '@/lib/export/mega-report-excel'
import { generateMegaReportPdf } from '@/lib/pdf/mega-report-pdf'
import { buildFinancialData } from '@/test/fixtures/mega-report.fixture'

it('writes a workbook to disk for validation', async () => {
  const data = buildFinancialData()
  const buf = await generateMegaExcelBuffer({ data })
  const tmpDir = path.join(os.tmpdir(), 'inventory-lite-tests')
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true })
  }
  fs.writeFileSync(path.join(tmpDir, 'validate.xlsx'), Buffer.from(buf))
  generateMegaReportPdf({ data })
})
