/**
 * Inventory Lite PDF design system.
 *
 * Public entry point for the reusable PDF module shared by every export:
 *  - theme/design tokens
 *  - fonts & safe-text helpers
 *  - value formatters (NPR, BS dates, filenames)
 *  - reusable components (header, footer/paging, table, summary, totals, metadata)
 *  - high-level report generators (sales/purchase registers, VAT, ledgers,
 *    stock movement, expenses, profit/COGS, invoice)
 */

export * from './theme'
export * from './fonts'
export * from './formatters'

export { createPdf, buildPageFooterHook, finalizePdf } from './components/page'
export type { PdfPageOptions, AutoTablePageHook, PageFooterOptions } from './components/page'

export { drawReportHeader } from './components/header'
export type { PdfReportHeaderOptions } from './components/header'

export { drawSummaryCard, drawTotalsBar } from './components/summary'
export type { SummaryColumn, PdfSummaryCardOptions, PdfTotalsBarOptions } from './components/summary'

export { drawMetadata } from './components/metadata'
export type { InfoLine, PdfMetadataOptions } from './components/metadata'

export { drawTable } from './components/table'
export type { PdfTableOptions, PdfTableColumn, PdfTableCellStyle } from './components/table'

export * from './reports'

// Stock ledger is the canonical implementation of the product/inventory ledger.
export {
  generateStockLedgerPdf,
  sanitizeFilename,
} from './stock-ledger-pdf'
export type { StockLedgerPdfOptions } from './stock-ledger-pdf'

export { generateMegaReportPdf } from './mega-report-pdf'
export type { MegaReportPdfOptions } from './mega-report-pdf'
