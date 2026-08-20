/**
 * Financial Precision & Money Calculation Utilities
 * 
 * Uses integer minor units (paisa) internally to eliminate JavaScript floating point inaccuracies.
 * Enforces strict validation: throws errors on NaN, Infinity, negative amounts, negative quantities, negative discounts.
 */

/**
 * Convert Nepalese Rupees (NPR) decimal to integer minor units (paisa)
 */
export function toMinorUnits(rupees: number): number {
  if (typeof rupees !== 'number' || isNaN(rupees) || !isFinite(rupees)) {
    throw new Error('Invalid financial value: Must be a finite number')
  }
  return Math.round(rupees * 100)
}

/**
 * Convert integer minor units (paisa) to Nepalese Rupees (NPR) decimal
 */
export function fromMinorUnits(paisa: number): number {
  if (typeof paisa !== 'number' || isNaN(paisa) || !isFinite(paisa)) {
    throw new Error('Invalid financial value: Must be a finite number')
  }
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
 * Recalculates all totals from items, strictly validating every monetary parameter.
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

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Sale transaction must contain at least one item')
  }

  if (typeof discount !== 'number' || isNaN(discount) || !isFinite(discount) || discount < 0) {
    throw new Error('Invalid overall discount: Must be a non-negative number')
  }

  if (typeof taxRate !== 'number' || isNaN(taxRate) || !isFinite(taxRate) || taxRate < 0) {
    throw new Error('Invalid tax rate: Must be a non-negative number')
  }

  if (typeof paidAmount !== 'number' || isNaN(paidAmount) || !isFinite(paidAmount) || paidAmount < 0) {
    throw new Error('Invalid paid amount: Must be a non-negative number')
  }

  let subtotalPaisa = 0
  const processedItems = items.map((item) => {
    if (typeof item.quantity !== 'number' || isNaN(item.quantity) || !isFinite(item.quantity) || item.quantity <= 0) {
      throw new Error('Item quantity must be a positive number greater than zero')
    }
    if (typeof item.unitPrice !== 'number' || isNaN(item.unitPrice) || !isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error('Unit price must be a non-negative number')
    }
    const itemDiscount = item.discount ?? 0
    if (typeof itemDiscount !== 'number' || isNaN(itemDiscount) || !isFinite(itemDiscount) || itemDiscount < 0) {
      throw new Error('Item discount must be a non-negative number')
    }

    const qtyPaisa = toMinorUnits(item.quantity * item.unitPrice)
    const discountPaisa = toMinorUnits(itemDiscount)
    if (discountPaisa > qtyPaisa) {
      throw new Error('Item discount cannot exceed item total line price')
    }
    const itemTotalPaisa = qtyPaisa - discountPaisa

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
  if (overallDiscountPaisa > subtotalPaisa) {
    throw new Error('Overall discount cannot exceed sale subtotal')
  }

  const taxableAmountPaisa = subtotalPaisa - overallDiscountPaisa
  const taxRatePercent = taxRate
  const taxAmountPaisa = Math.round((taxableAmountPaisa * taxRatePercent) / 100)

  const totalPaisa = taxableAmountPaisa + taxAmountPaisa
  const requestedPaidPaisa = toMinorUnits(paidAmount)

  if (requestedPaidPaisa > totalPaisa) {
    throw new Error(`Paid amount (Rs. ${paidAmount.toFixed(2)}) cannot exceed total sale amount (Rs. ${(totalPaisa / 100).toFixed(2)})`)
  }

  const paidPaisa = requestedPaidPaisa
  const duePaisa = totalPaisa - paidPaisa

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
  if (paidP > totalP) throw new Error('Financial Invariant Error: Paid amount exceeds total')
  if (Math.abs(dueP - (totalP - paidP)) > 1) {
    throw new Error('Financial Invariant Error: dueAmount must equal total - paidAmount')
  }
}
