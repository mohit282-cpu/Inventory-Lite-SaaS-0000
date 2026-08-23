import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { StockMovement, Product, Business } from '@/types'
import { getSellerTaxLabel } from '@/lib/localization'

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

import { formatBSDate, formatBSDateTime } from '@/lib/date/bs-date'

/**
 * Format date for PDF display in BS format (YYYY/MM/DD)
 */
function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  return formatBSDate(dateStr, { format: 'YYYY/MM/DD' })
}

/**
 * Format timestamp with time for PDF display in BS format (YYYY/MM/DD hh:mm AM/PM)
 */
function formatDateTimeDisplay(dateStr?: string): string {
  if (!dateStr) return 'N/A'
  return formatBSDateTime(dateStr)
}

/**
 * Sanitize string for illegal filename characters
 */
export function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
}

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

  // Create A4 Landscape PDF for rich ledger table column spacing
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  // Derive target product if filtered to single product
  const targetProduct =
    selectedProductId && selectedProductId !== 'ALL'
      ? products.find((p) => p.$id === selectedProductId)
      : null

  const isProductReport = Boolean(targetProduct)

  // Seller tax label
  const sellerTax = getSellerTaxLabel(business)

  // --- 1. HEADER SECTION ---
  doc.setFillColor(15, 23, 42) // Slate 900
  doc.rect(0, 0, pageWidth, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  const busName = (business.name || 'Inventory Lite Store').toUpperCase()
  doc.text(busName, margin, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const reportTitle = isProductReport
    ? `PRODUCT STOCK LEDGER: ${(targetProduct?.name || '').toUpperCase()}`
    : 'STOCK MOVEMENTS & INVENTORY LEDGER'
  doc.text(reportTitle, pageWidth - margin, 12, { align: 'right' })

  doc.setFontSize(8)
  doc.setTextColor(203, 213, 225) // Slate 300
  const headerContact = [
    business.address,
    business.phone ? `Phone: ${business.phone}` : null,
    sellerTax.formattedText !== 'PAN/VAT of the seller: N/A' ? sellerTax.formattedText : null,
    generatedBy ? `Audit User: ${generatedBy}` : null,
  ]
    .filter(Boolean)
    .join('  |  ')
  doc.text(headerContact || 'Multi-Tenant Inventory Ledger Audit Report', margin, 18)

  const genTimeString = formatDateTimeDisplay(new Date().toISOString())
  doc.text(`Generated: ${genTimeString}`, pageWidth - margin, 18, { align: 'right' })

  let currentY = 30

  // --- 2. FILTER & METRIC SUMMARY CARDS ---
  doc.setFillColor(248, 250, 252) // Slate 50
  doc.setDrawColor(226, 232, 240) // Slate 200
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 22, 2, 2, 'FD')

  doc.setTextColor(51, 65, 85) // Slate 700
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)

  // Column 1: Date Range
  const dateFromStr = dateFrom ? formatDateDisplay(dateFrom) : 'All History'
  const dateToStr = dateTo ? formatDateDisplay(dateTo) : 'Present'
  doc.text('REPORT PERIOD:', margin + 4, currentY + 7)
  doc.setFont('helvetica', 'normal')
  doc.text(`${dateFromStr} -> ${dateToStr}`, margin + 4, currentY + 14)

  // Column 2: Product Scope
  const col2X = margin + 70
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUCT SCOPE:', col2X, currentY + 7)
  doc.setFont('helvetica', 'normal')
  const prodScopeText = targetProduct
    ? `${targetProduct.name} (${targetProduct.sku})`
    : 'All Products'
  doc.text(prodScopeText.substring(0, 35), col2X, currentY + 14)

  // Column 3: Movement Type Filter
  const col3X = margin + 140
  doc.setFont('helvetica', 'bold')
  doc.text('MOVEMENT TYPE:', col3X, currentY + 7)
  doc.setFont('helvetica', 'normal')
  const typeText =
    selectedTypeFilter === 'stock_in'
      ? 'Stock In (Purchase)'
      : selectedTypeFilter === 'stock_out'
      ? 'Stock Out (Deduction)'
      : selectedTypeFilter === 'adjustment'
      ? 'Stock Adjustment'
      : 'All Movement Types'
  doc.text(typeText, col3X, currentY + 14)

  // Column 4: Search & Records
  const col4X = margin + 205
  doc.setFont('helvetica', 'bold')
  doc.text('AUDIT SUMMARY:', col4X, currentY + 7)
  doc.setFont('helvetica', 'normal')
  const searchTag = searchQuery.trim() ? `Search: "${searchQuery.substring(0, 15)}"` : 'Search: None'
  doc.text(`${searchTag}  |  Total Records: ${movements.length}`, col4X, currentY + 14)

  currentY += 27

  // --- 3. PRODUCT SPECIFIC BANNER (If filtered to single product) ---
  if (targetProduct) {
    doc.setFillColor(239, 246, 255) // Blue 50
    doc.setDrawColor(191, 219, 254) // Blue 200
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 16, 2, 2, 'FD')

    doc.setTextColor(30, 58, 138) // Blue 900
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(`PRODUCT METRICS: ${targetProduct.name}`, margin + 4, currentY + 6)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(
      `SKU: ${targetProduct.sku}  |  Unit: ${targetProduct.unit}  |  Current Stock: ${targetProduct.stockQuantity} ${targetProduct.unit}  |  Purchase: Rs. ${targetProduct.purchasePrice.toFixed(2)}  |  Selling: Rs. ${targetProduct.sellingPrice.toFixed(2)}`,
      margin + 4,
      currentY + 12
    )

    currentY += 20
  }

  // --- 4. SUMMARY STATISTICS COMPUTATION ---
  let totalStockIn = 0
  let totalStockOut = 0
  let totalAdjustments = 0

  movements.forEach((m) => {
    if (m.type === 'stock_in') {
      totalStockIn += m.quantity
    } else if (m.type === 'stock_out') {
      totalStockOut += m.quantity
    } else if (m.type === 'adjustment') {
      totalAdjustments += m.quantity
    }
  })

  const netMovement = totalStockIn - totalStockOut

  // If movements exist and product selected, compute opening & closing balances
  let openingBalance = 0
  let closingBalance = 0

  if (movements.length > 0) {
    // Sort movements chronologically (oldest to newest)
    const chronological = [...movements].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    const oldest = chronological[0]
    const newest = chronological[chronological.length - 1]

    openingBalance = oldest.previousQuantity
    closingBalance = newest.newQuantity
  }

  // KPI Summary Bar
  doc.setFillColor(241, 245, 249) // Slate 100
  doc.setDrawColor(203, 213, 225)
  doc.rect(margin, currentY, pageWidth - margin * 2, 10, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)

  if (isProductReport) {
    doc.text(
      `Opening Balance: ${openingBalance}   |   Total In (+): ${totalStockIn}   |   Total Out (-): ${totalStockOut}   |   Adjustments: ${totalAdjustments}   |   Closing Balance: ${closingBalance}`,
      margin + 4,
      currentY + 6.5
    )
  } else {
    doc.text(
      `Total Stock In (+): ${totalStockIn} units   |   Total Stock Out (-): ${totalStockOut} units   |   Net Inventory Movement: ${netMovement >= 0 ? '+' : ''}${netMovement} units   |   Total Audit Events: ${movements.length}`,
      margin + 4,
      currentY + 6.5
    )
  }

  currentY += 14

  // --- 5. LEDGER TABLE SETUP ---
  const productMap = new Map<string, Product>()
  products.forEach((p) => productMap.set(p.$id, p))

  const tableBody = movements.map((m) => {
    const prod = productMap.get(m.productId)
    const prodName = prod ? prod.name : m.productId
    const prodSku = prod ? prod.sku : ''

    const dateStr = formatDateTimeDisplay(m.createdAt)
    const refStr = m.referenceId || `SM-${m.$id.slice(-6)}`
    const typeLabel =
      m.type === 'stock_in'
        ? 'Stock In'
        : m.type === 'stock_out'
        ? 'Stock Out'
        : 'Adjustment'

    const stockInVal = m.type === 'stock_in' ? `+${m.quantity}` : '-'
    const stockOutVal = m.type === 'stock_out' ? `-${m.quantity}` : '-'
    const transitionVal = `${m.previousQuantity} -> ${m.newQuantity}`

    return [
      dateStr,
      refStr,
      `${prodName}\n(SKU: ${prodSku})`,
      typeLabel,
      stockInVal,
      stockOutVal,
      transitionVal,
      m.reason || 'Routine update',
      m.createdBy ? `User: ${m.createdBy.slice(-6)}` : 'System',
    ]
  })

  // Handle empty state gracefully
  if (tableBody.length === 0) {
    tableBody.push([
      '-',
      '-',
      'No stock movements found for the selected filters.',
      '-',
      '-',
      '-',
      '-',
      '-',
      '-',
    ])
  }

  // Render Table using jspdf-autotable
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 15 },
    head: [
      [
        'Date & Time',
        'Reference',
        'Product & SKU',
        'Movement Type',
        'Qty In (+)',
        'Qty Out (-)',
        'Balance Transition',
        'Reason / Notes',
        'Recorded By',
      ],
    ],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 28 }, // Date & Time
      1: { cellWidth: 26, fontStyle: 'bold' }, // Reference
      2: { cellWidth: 50 }, // Product
      3: { cellWidth: 24 }, // Type
      4: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] }, // Stock In (Emerald)
      5: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] }, // Stock Out (Red)
      6: { cellWidth: 32, halign: 'center', fontStyle: 'bold' }, // Transition
      7: { cellWidth: 42 }, // Reason
      8: { cellWidth: 26 }, // User
    },
    didDrawPage: (data) => {
      // Footer page numbering hook
      const currentPage = data.pageNumber

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139) // Slate 500

      // Left footer
      doc.text(
        `Inventory Lite SaaS  |  ${business.name || 'Shop'}  |  Stock Movement Audit Trail`,
        margin,
        pageHeight - 6
      )

      // Right footer with total pages macro
      doc.text(
        `Page ${currentPage} of {totalPages}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: 'right' }
      )
    },
  })

  // Replace page count placeholder macro across all pages
  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages('{totalPages}')
  }

  return doc
}
