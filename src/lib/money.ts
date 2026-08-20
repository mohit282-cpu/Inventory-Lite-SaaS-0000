/**
 * Financial Precision & Money Calculation Utilities
 * 
 * Uses integer minor units (paisa) internally to eliminate JavaScript floating point inaccuracies.
 * Enforces financial calculation invariants across sales, payments, and credit ledgers.
 */

/**
 * Convert Nepalese Rupees (NPR) decimal to integer minor units (paisa)
 */
export function toMinorUnits(rupees: number): number {
  if (isNaN(rupees) || !isFinite(rupees)) return 0
  return Math.round(rupees * 100)
}

/**
 * Convert integer minor units (paisa) to Nepalese Rupees (NPR) decimal
 */
export function fromMinorUnits(paisa: number): number {
  if (isNaN(paisa) || !isFinite(paisa)) return 0
  return paisa / 100
}

/**
 * Safely format monetary amount with 2 decimal places
 */
export function formatMoney(amount: number): string {
  const paisa = toMinorUnits(amount)
  return (paisa / 100).toFixed(2)
}

export interface CalculatedSaleTotals {
  subtotal: number
  overallDiscount: number
  taxableAmount: number
  taxAmount: number
  total: number
  paidAmount: number
  dueAmount: number
  processedItems: Array<{
    productId: string
    quantity: number
    unitPrice: number
    discount: number
    total: number
  }>
}

/**
 * Centralized Server-Side Sale Totals Calculation
 * Recalculates all totals from items, preventing client-side total manipulation.
 */
export function calculateSaleTotals(params: {
  items: Array<{
    productId: string
    quantity: number
    unitPrice: number
    discount?: number
  }>
  discount?: number
  taxRate?: number
  paidAmount?: number
}): CalculatedSaleTotals {
  const { items, discount = 0, taxRate = 13, paidAmount = 0 } = params

  if (!items || items.length === 0) {
    throw new Error('Sale transaction must contain at least one item')
  }

  let subtotalPaisa = 0
  const processedItems = items.map((item) => {
    if (item.quantity <= 0) {
      throw new Error('Quantity must be greater than zero')
    }
    if (item.unitPrice < 0) {
      throw new Error('Unit price cannot be negative')
    }
    const itemDiscount = item.discount || 0
    if (itemDiscount < 0) {
      throw new Error('Item discount cannot be negative')
    }

    const qtyPaisa = toMinorUnits(item.quantity * item.unitPrice)
    const discountPaisa = toMinorUnits(itemDiscount)
    const itemTotalPaisa = Math.max(0, qtyPaisa - discountPaisa)

    subtotalPaisa += itemTotalPaisa

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: itemDiscount,
      total: fromMinorUnits(itemTotalPaisa),
    }
  })

  const overallDiscountPaisa = toMinorUnits(discount)
  if (overallDiscountPaisa < 0) {
    throw new Error('Overall discount cannot be negative')
  }

  const taxableAmountPaisa = Math.max(0, subtotalPaisa - overallDiscountPaisa)
  const taxRatePercent = Math.max(0, taxRate)
  const taxAmountPaisa = Math.round((taxableAmountPaisa * taxRatePercent) / 100)

  const totalPaisa = taxableAmountPaisa + taxAmountPaisa

  const requestedPaidPaisa = toMinorUnits(paidAmount)
  if (requestedPaidPaisa < 0) {
    throw new Error('Paid amount cannot be negative')
  }

  const paidPaisa = Math.min(totalPaisa, requestedPaidPaisa)
  const duePaisa = Math.max(0, totalPaisa - paidPaisa)

  return {
    subtotal: fromMinorUnits(subtotalPaisa),
    overallDiscount: fromMinorUnits(overallDiscountPaisa),
    taxableAmount: fromMinorUnits(taxableAmountPaisa),
    taxAmount: fromMinorUnits(taxAmountPaisa),
    total: fromMinorUnits(totalPaisa),
    paidAmount: fromMinorUnits(paidPaisa),
    dueAmount: fromMinorUnits(duePaisa),
    processedItems,
  }
}

/**
 * Validate financial invariants on a sale / payment record
 */
export function validateFinancialInvariants(record: {
  total: number
  paidAmount: number
  dueAmount: number
}): void {
  const totalP = toMinorUnits(record.total)
  const paidP = toMinorUnits(record.paidAmount)
  const dueP = toMinorUnits(record.dueAmount)

  if (totalP < 0) throw new Error('Financial Invariant Error: Total cannot be negative')
  if (paidP < 0) throw new Error('Financial Invariant Error: Paid amount cannot be negative')
  if (dueP < 0) throw new Error('Financial Invariant Error: Due amount cannot be negative')
  if (paidP > totalP + 1) throw new Error('Financial Invariant Error: Paid amount exceeds total')
  if (Math.abs(dueP - (totalP - paidP)) > 1) {
    throw new Error('Financial Invariant Error: dueAmount must equal total - paidAmount')
  }
}
