/**
 * Stock Movements / Inventory Ledger PDF report, rebuilt on the shared
 * design system (src/lib/pdf). Public API is preserved for backward
 * compatibility:
 *   - generateStockLedgerPdf(options) => jsPDF
 *   - sanitizeFilename(str)            => string
 */

import jsPDF from 'jspdf'
import { StockMovement, Product, Business } from '@/types'
import { getSellerTaxLabel } from '@/lib/localization'
import { safeText } from '@/lib/pdf/fonts'
import {
  formatBsDate,
  formatBsDateTime,
  formatNumber,
  sanitizeFilename,
} from '@/lib/pdf/formatters'
import { createPdf, buildPageFooterHook, finalizePdf } from '@/lib/pdf/components/page'
import { drawReportHeader } from '@/lib/pdf/components/header'
import { drawSummaryCard, drawTotalsBar } from '@/lib/pdf/components/summary'
import { drawTable } from '@/lib/pdf/components/table'

export interface StockLedgerPdfOptions {
  business: Business
  movements: StockMovement[]
  products: Product[]
  dateFrom?: string
  dateTo?: string
  selectedProductId?: string
  selectedTypeFilter?: string
  searchQuery?: string
  generatedBy?: string
}

export { sanitizeFilename }

/**
 * Generates a professional, read-only PDF report for Stock Movements / Inventory Ledger.
 */
export function generateStockLedgerPdf(options: StockLedgerPdfOptions): jsPDF {
  const {
    business,
    movements,
    products,
    dateFrom,
    dateTo,
    selectedProductId,
    selectedTypeFilter = 'ALL',
    searchQuery = '',
    generatedBy = 'System User',
  } = options

  // A4 Landscape for rich ledger table column spacing.
  const doc = createPdf({ orientation: 'landscape' }) as jsPDF

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  const targetProduct =
    selectedProductId && selectedProductId !== 'ALL'
      ? products.find((p) => p.$id === selectedProductId)
      : null
  const isProductReport = Boolean(targetProduct)

  const sellerTax = getSellerTaxLabel(business)
  const contactLine = [
    business.address,
    business.phone ? `Phone: ${business.phone}` : null,
    sellerTax.formattedText !== 'PAN/VAT of the seller: N/A' ? sellerTax.formattedText : null,
    generatedBy ? `Audit User: ${generatedBy}` : null,
  ]
    .filter(Boolean)
    .join('  |  ')

  const reportTitle = isProductReport
    ? `Product Stock Ledger: ${(targetProduct?.name || '').toUpperCase()}`
    : 'Stock Movements & Inventory Ledger'

  let y = drawReportHeader(doc, {
    businessName: business.name || 'Inventory Lite Store',
    reportTitle,
    contactLine,
    generatedAt: new Date().toISOString(),
    showGenerated: true,
  })

  // Filter & scope summary card
  const typeText =
    selectedTypeFilter === 'stock_in'
      ? 'Stock In (Purchase)'
      : selectedTypeFilter === 'stock_out'
      ? 'Stock Out (Deduction)'
      : selectedTypeFilter === 'adjustment'
      ? 'Stock Adjustment'
      : 'All Movement Types'

  y = drawSummaryCard(doc, {
    startY: y,
    columns: [
      { label: 'Report Period', value: `${dateFrom ? formatBsDate(dateFrom) : 'All History'} → ${dateTo ? formatBsDate(dateTo) : 'Present'}` },
      { label: 'Product Scope', value: targetProduct ? `${targetProduct.name} (${targetProduct.sku})` : 'All Products' },
      { label: 'Movement Type', value: typeText },
      { label: 'Audit Summary', value: `${searchQuery.trim() ? `Search: "${searchQuery.trim().substring(0, 15)}"` : 'Search: None'}  |  Records: ${movements.length}` },
    ],
  })

  // Product-specific metrics banner
  if (targetProduct) {
    doc.setFillColor(240, 249, 255)
    doc.setDrawColor(186, 230, 253)
    doc.roundedRect(margin, y, pageWidth - margin * 2, 14, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(12, 74, 110)
    doc.text(
      `SKU: ${safeText(targetProduct.sku)}  |  Unit: ${safeText(targetProduct.unit)}  |  Current Stock: ${formatNumber(targetProduct.stockQuantity)} ${safeText(targetProduct.unit)}  |  Purchase: Rs. ${formatNumber(targetProduct.purchasePrice, 2)}  |  Selling: Rs. ${formatNumber(targetProduct.sellingPrice, 2)}`,
      margin + 4,
      y + 8,
    )
    y += 18
  }

  // Summary statistics
  let totalStockIn = 0
  let totalStockOut = 0
  let totalAdjustments = 0
  movements.forEach((m) => {
    if (m.type === 'stock_in') totalStockIn += m.quantity
    else if (m.type === 'stock_out') totalStockOut += m.quantity
    else if (m.type === 'adjustment') totalAdjustments += m.quantity
  })
  const netMovement = totalStockIn - totalStockOut

  let openingBalance = 0
  let closingBalance = 0
  if (movements.length > 0) {
    const chronological = [...movements].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    openingBalance = chronological[0].previousQuantity
    closingBalance = chronological[chronological.length - 1].newQuantity
  }

  y = drawTotalsBar(doc, {
    startY: y,
    text: isProductReport
      ? `Opening Balance: ${formatNumber(openingBalance)}   |   Total In (+): ${formatNumber(totalStockIn)}   |   Total Out (-): ${formatNumber(totalStockOut)}   |   Adjustments: ${formatNumber(totalAdjustments)}   |   Closing Balance: ${formatNumber(closingBalance)}`
      : `Total Stock In (+): ${formatNumber(totalStockIn)} units   |   Total Stock Out (-): ${formatNumber(totalStockOut)} units   |   Net Inventory Movement: ${netMovement >= 0 ? '+' : ''}${formatNumber(netMovement)} units   |   Total Audit Events: ${movements.length}`,
  })

  // Build table body
  const productMap = new Map<string, Product>()
  products.forEach((p) => productMap.set(p.$id, p))

  const body = movements.map((m) => {
    const prod = productMap.get(m.productId)
    const prodName = prod ? prod.name : m.productId
    const prodSku = prod ? prod.sku : ''
    const typeLabel =
      m.type === 'stock_in' ? 'Stock In' : m.type === 'stock_out' ? 'Stock Out' : 'Adjustment'
    return [
      formatBsDateTime(m.createdAt),
      safeText(m.referenceId || `SM-${m.$id.slice(-6)}`),
      prodSku ? `${prodName} (${prodSku})` : prodName,
      typeLabel,
      m.type === 'stock_in' ? `+${formatNumber(m.quantity)}` : '-',
      m.type === 'stock_out' ? `-${formatNumber(m.quantity)}` : '-',
      `${formatNumber(m.previousQuantity)} → ${formatNumber(m.newQuantity)}`,
      m.reason || 'Routine update',
      m.createdBy ? `User: ${m.createdBy.slice(-6)}` : 'System',
    ]
  })

  const pageHook = buildPageFooterHook(doc, {
    footerText: `Inventory Lite SaaS  |  ${business.name || 'Shop'}  |  Stock Movement Audit Trail`,
  })

  // Register footer hook to also run for any non-table trailing pages is not
  // needed here; tables span all content pages.
  drawTable(doc, {
    startY: y,
    columns: [
      { head: 'Date & Time', width: 26 },
      { head: 'Reference', width: 24, numeric: false },
      { head: 'Product & SKU' },
      { head: 'Movement Type', width: 24 },
      { head: 'Qty In (+)', width: 21, align: 'right' },
      { head: 'Qty Out (-)', width: 21, align: 'right' },
      { head: 'Balance Transition', width: 30, align: 'center' },
      { head: 'Reason / Notes' },
      { head: 'Recorded By', width: 24 },
    ],
    body,
    pageHook,
    striped: true,
    fontScale: 'dense',
  })

  return finalizePdf(doc)
}
