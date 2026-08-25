import { toMinorUnits, fromMinorUnits } from '@/lib/money'

export interface TaxCalculationResult {
  taxableAmount: number
  nonTaxableAmount: number
  taxRate: number
  vatAmount: number
  totalAmount: number
}

export interface TaxLineItem {
  productId?: string
  productName?: string
  quantity: number
  unitPrice: number
  discount?: number
  isTaxable?: boolean
  taxRate?: number
}

/**
 * Centralized Server-Side Tax Calculation Engine
 * Single Source of Truth for VAT (Value Added Tax) calculations in Nepal.
 * Uses integer minor units (paisa) to avoid floating point precision errors.
 */
export function calculateTaxForItems(
  items: TaxLineItem[],
  options?: {
    defaultTaxRate?: number
    vatEnabled?: boolean
    overallDiscount?: number
  }
): TaxCalculationResult {
  const vatEnabled = options?.vatEnabled ?? true
  const defaultRate = options?.defaultTaxRate ?? 13

  let grossTaxablePaisa = 0
  let grossNonTaxablePaisa = 0

  for (const item of items) {
    const qty = Math.max(0, item.quantity || 0)
    const pricePaisa = toMinorUnits(item.unitPrice || 0)
    const lineDiscountPaisa = toMinorUnits(item.discount || 0)
    const lineTotalPaisa = Math.max(0, qty * pricePaisa - lineDiscountPaisa)

    const itemIsTaxable = item.isTaxable !== false
    if (vatEnabled && itemIsTaxable) {
      grossTaxablePaisa += lineTotalPaisa
    } else {
      grossNonTaxablePaisa += lineTotalPaisa
    }
  }

  // Apply overall discount proportionally
  const overallDiscountPaisa = toMinorUnits(options?.overallDiscount || 0)
  const totalGrossPaisa = grossTaxablePaisa + grossNonTaxablePaisa

  let taxablePaisa = grossTaxablePaisa
  let nonTaxablePaisa = grossNonTaxablePaisa

  if (overallDiscountPaisa > 0 && totalGrossPaisa > 0) {
    const taxableRatio = grossTaxablePaisa / totalGrossPaisa
    const discountTaxablePaisa = Math.round(overallDiscountPaisa * taxableRatio)
    const discountNonTaxablePaisa = overallDiscountPaisa - discountTaxablePaisa

    taxablePaisa = Math.max(0, grossTaxablePaisa - discountTaxablePaisa)
    nonTaxablePaisa = Math.max(0, grossNonTaxablePaisa - discountNonTaxablePaisa)
  }

  const taxRate = vatEnabled ? defaultRate : 0
  const vatAmountPaisa = Math.round((taxablePaisa * taxRate) / 100)
  const totalAmountPaisa = taxablePaisa + nonTaxablePaisa + vatAmountPaisa

  return {
    taxableAmount: fromMinorUnits(taxablePaisa),
    nonTaxableAmount: fromMinorUnits(nonTaxablePaisa),
    taxRate,
    vatAmount: fromMinorUnits(vatAmountPaisa),
    totalAmount: fromMinorUnits(totalAmountPaisa),
  }
}

/**
 * Compute Net VAT Position (Output VAT - Input VAT)
 */
export function calculateNetVatPosition(outputVat: number, inputVat: number): {
  outputVat: number
  inputVat: number
  netVatPosition: number
  status: 'PAYABLE' | 'REFUNDABLE_CREDIT' | 'NEUTRAL'
} {
  const outputPaisa = toMinorUnits(outputVat)
  const inputPaisa = toMinorUnits(inputVat)
  const netPaisa = outputPaisa - inputPaisa

  const netVatPosition = fromMinorUnits(netPaisa)
  let status: 'PAYABLE' | 'REFUNDABLE_CREDIT' | 'NEUTRAL' = 'NEUTRAL'

  if (netPaisa > 0) {
    status = 'PAYABLE'
  } else if (netPaisa < 0) {
    status = 'REFUNDABLE_CREDIT'
  }

  return {
    outputVat: fromMinorUnits(outputPaisa),
    inputVat: fromMinorUnits(inputPaisa),
    netVatPosition,
    status,
  }
}
