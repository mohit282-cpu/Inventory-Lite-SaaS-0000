/**
 * Stock Movement report.
 *
 * The stock movement / inventory ledger shares one generator with the product
 * ledger. This module exposes a clearly-named alias for the report so callers
 * and the docs can reference "Stock Movement" explicitly.
 */

import { generateStockLedgerPdf, StockLedgerPdfOptions } from '@/lib/pdf/stock-ledger-pdf'

export { generateStockLedgerPdf as generateStockMovementPdf }
export type { StockLedgerPdfOptions as StockMovementPdfOptions }
export { sanitizeFilename } from '@/lib/pdf/formatters'
