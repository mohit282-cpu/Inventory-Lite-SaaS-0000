import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import {
  TaxRate, TaxCategory, TaxTransaction,
  TaxCategoryType, TaxRateStatus,
} from '@/types'
import { toMinorUnits, fromMinorUnits } from '@/lib/money'
import { Query } from 'appwrite'

export interface TaxCalculationInput {
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    discount?: number
    taxRateId?: string
  }>
  overallDiscount?: number
  defaultTaxRateId?: string
}

export interface TaxCalculationResult {
  taxableAmount: number
  nonTaxableAmount: number
  taxAmount: number
  totalAmount: number
  taxBreakdown: Array<{
    taxRateId: string
    taxRateName: string
    rate: number
    taxableAmount: number
    taxAmount: number
  }>
}

export interface TaxSummary {
  outputVat: number
  inputVat: number
  netVatPosition: number
  status: 'PAYABLE' | 'REFUNDABLE' | 'NEUTRAL'
}

/**
 * Tax Engine Service
 * 
 * Configurable tax rate management replacing hardcoded 13% VAT.
 * Supports Nepal's VAT system (13% standard rate), withholding tax,
 * and extensible for future tax types.
 */
export class TaxEngineService extends BaseService {
  constructor() {
    super(COLLECTIONS.TAX_RATES)
  }

  // ==================== Tax Categories ====================

  /**
   * Provision default tax categories for a business.
   */
  async provisionDefaultTaxCategories(businessId: string, userId: string): Promise<TaxCategory[]> {
    const categoryService = new TaxCategoryService()
    const existing = await categoryService.list<TaxCategory>(businessId)
    if (existing.length > 0) return existing

    const defaults: Array<{ name: string; type: TaxCategoryType; description: string }> = [
      { name: 'Output VAT', type: 'output_vat', description: 'VAT collected on sales (payable to IRD)' },
      { name: 'Input VAT', type: 'input_vat', description: 'VAT paid on purchases (recoverable from IRD)' },
      { name: 'Withholding Tax', type: 'withholding_tax', description: 'TDS deducted at source' },
    ]

    const created: TaxCategory[] = []
    for (const cat of defaults) {
      const doc = await categoryService.create<TaxCategory>(
        { ...cat },
        businessId,
        userId
      )
      created.push(doc)
    }
    return created
  }

  /**
   * Provision default tax rates for a business (13% VAT standard).
   */
  async provisionDefaultTaxRates(businessId: string, userId: string): Promise<TaxRate[]> {
    const existing = await this.list<TaxRate>(businessId)
    if (existing.length > 0) return existing

    const today = new Date().toISOString().split('T')[0]

    const defaults: Array<Omit<TaxRate, '$id' | '$createdAt' | '$updatedAt' | '$collectionId' | '$databaseId' | '$permissions' | 'createdAt' | 'updatedAt'>> = [
      {
        name: 'VAT 13%',
        rate: 13,
        type: 'output_vat',
        effectiveFrom: today,
        status: 'ACTIVE' as TaxRateStatus,
        isDefault: true,
        businessId,
      },
      {
        name: 'VAT 0% (Exempt)',
        rate: 0,
        type: 'output_vat',
        effectiveFrom: today,
        status: 'ACTIVE' as TaxRateStatus,
        isDefault: false,
        businessId,
      },
      {
        name: 'WHT 1.5%',
        rate: 1.5,
        type: 'withholding_tax',
        effectiveFrom: today,
        status: 'ACTIVE' as TaxRateStatus,
        isDefault: false,
        businessId,
      },
    ]

    const created: TaxRate[] = []
    for (const rate of defaults) {
      const doc = await this.create<TaxRate>(rate, businessId, userId)
      created.push(doc)
    }
    return created
  }

  // ==================== Tax Rate CRUD ====================

  /**
   * Create a new tax rate.
   */
  async createTaxRate(
    input: {
      name: string
      rate: number
      type: TaxCategoryType
      taxCategoryId?: string
      effectiveFrom: string
      effectiveTo?: string
      isDefault?: boolean
    },
    businessId: string,
    userId: string
  ): Promise<TaxRate> {
    if (input.rate < 0 || input.rate > 100) {
      throw new Error('Tax rate must be between 0% and 100%')
    }

    // If setting as default, unset other defaults of same type
    if (input.isDefault) {
      const existing = await this.list<TaxRate>(businessId, [
        Query.equal('type', input.type),
        Query.equal('isDefault', true),
      ])
      for (const rate of existing) {
        await this.update<TaxRate>(rate.$id, { isDefault: false }, businessId)
      }
    }

    return await this.create<TaxRate>(
      {
        name: input.name,
        rate: input.rate,
        type: input.type,
        taxCategoryId: input.taxCategoryId,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        status: 'ACTIVE' as TaxRateStatus,
        isDefault: input.isDefault ?? false,
      },
      businessId,
      userId
    )
  }

  /**
   * Update a tax rate.
   */
  async updateTaxRate(
    id: string,
    data: Partial<Pick<TaxRate, 'name' | 'rate' | 'status' | 'effectiveTo' | 'isDefault'>>,
    businessId: string
  ): Promise<TaxRate> {
    if (data.rate !== undefined && (data.rate < 0 || data.rate > 100)) {
      throw new Error('Tax rate must be between 0% and 100%')
    }
    return await this.update<TaxRate>(id, data, businessId)
  }

  /**
   * List all tax rates for a business.
   */
  async listTaxRates(businessId: string, type?: TaxCategoryType): Promise<TaxRate[]> {
    const queries: any[] = []
    if (type) {
      queries.push(Query.equal('type', type))
    }
    return await this.list<TaxRate>(businessId, queries)
  }

  /**
   * Get the default tax rate for a given type.
   */
  async getDefaultTaxRate(businessId: string, type: TaxCategoryType = 'output_vat'): Promise<TaxRate | null> {
    const rates = await this.list<TaxRate>(businessId, [
      Query.equal('type', type),
      Query.equal('isDefault', true),
      Query.equal('status', 'ACTIVE'),
    ])
    return rates.length > 0 ? rates[0] : null
  }

  /**
   * Get active tax rate effective for a given date.
   */
  async getEffectiveTaxRate(businessId: string, type: TaxCategoryType, date: string): Promise<TaxRate | null> {
    const rates = await this.list<TaxRate>(businessId, [
      Query.equal('type', type),
      Query.equal('status', 'ACTIVE'),
    ])

    // Find rate where date is within effectiveFrom and effectiveTo
    const effective = rates.find(r => {
      const from = r.effectiveFrom
      const to = r.effectiveTo || '9999-12-31'
      return date >= from && date <= to
    })

    return effective ?? null
  }

  // ==================== Tax Calculation ====================

  /**
   * Calculate tax for a set of items using configured tax rates.
   * Replaces the hardcoded 13% calculation in vat-engine.ts.
   */
  async calculateTax(
    businessId: string,
    input: TaxCalculationInput
  ): Promise<TaxCalculationResult> {
    const defaultRate = await this.getDefaultTaxRate(businessId, 'output_vat')
    const defaultRateValue = defaultRate?.rate ?? 13

    let totalTaxablePaisa = 0
    let totalNonTaxablePaisa = 0
    const taxByRate = new Map<string, { name: string; rate: number; taxablePaisa: number }>()

    for (const item of input.items) {
      const qty = Math.max(0, item.quantity || 0)
      const pricePaisa = toMinorUnits(item.unitPrice || 0)
      const discountPaisa = toMinorUnits(item.discount || 0)
      const lineTotalPaisa = Math.max(0, qty * pricePaisa - discountPaisa)

      // Determine tax rate for this item
      let rateValue = defaultRateValue
      let rateName = defaultRate?.name || 'VAT 13%'
      let rateId = defaultRate?.$id || ''

      if (item.taxRateId) {
        const specificRate = await this.getById<TaxRate>(item.taxRateId, businessId)
        rateValue = specificRate.rate
        rateName = specificRate.name
        rateId = specificRate.$id
      }

      if (rateValue > 0) {
        totalTaxablePaisa += lineTotalPaisa

        const existing = taxByRate.get(rateId) || { name: rateName, rate: rateValue, taxablePaisa: 0 }
        existing.taxablePaisa += lineTotalPaisa
        taxByRate.set(rateId, existing)
      } else {
        totalNonTaxablePaisa += lineTotalPaisa
      }
    }

    // Apply overall discount proportionally
    const overallDiscountPaisa = toMinorUnits(input.overallDiscount || 0)
    const totalGrossPaisa = totalTaxablePaisa + totalNonTaxablePaisa

    if (overallDiscountPaisa > 0 && totalGrossPaisa > 0) {
      const taxableRatio = totalTaxablePaisa / totalGrossPaisa
      const discountTaxablePaisa = Math.round(overallDiscountPaisa * taxableRatio)
      const discountNonTaxablePaisa = overallDiscountPaisa - discountTaxablePaisa

      totalTaxablePaisa = Math.max(0, totalTaxablePaisa - discountTaxablePaisa)
      totalNonTaxablePaisa = Math.max(0, totalNonTaxablePaisa - discountNonTaxablePaisa)

      // Adjust tax breakdown proportionally
      for (const [id, data] of taxByRate.entries()) {
        const rateDiscount = Math.round(overallDiscountPaisa * (data.taxablePaisa / totalGrossPaisa))
        data.taxablePaisa = Math.max(0, data.taxablePaisa - rateDiscount)
        taxByRate.set(id, data)
      }
    }

    // Calculate tax amounts
    let totalTaxPaisa = 0
    const breakdown: TaxCalculationResult['taxBreakdown'] = []

    for (const [id, data] of taxByRate.entries()) {
      const taxAmountPaisa = Math.round((data.taxablePaisa * data.rate) / 100)
      totalTaxPaisa += taxAmountPaisa
      breakdown.push({
        taxRateId: id,
        taxRateName: data.name,
        rate: data.rate,
        taxableAmount: fromMinorUnits(data.taxablePaisa),
        taxAmount: fromMinorUnits(taxAmountPaisa),
      })
    }

    return {
      taxableAmount: fromMinorUnits(totalTaxablePaisa),
      nonTaxableAmount: fromMinorUnits(totalNonTaxablePaisa),
      taxAmount: fromMinorUnits(totalTaxPaisa),
      totalAmount: fromMinorUnits(totalTaxablePaisa + totalNonTaxablePaisa + totalTaxPaisa),
      taxBreakdown: breakdown,
    }
  }

  // ==================== Tax Transaction Recording ====================

  /**
   * Record a tax transaction for a sale or purchase.
   */
  async recordTaxTransaction(
    input: {
      taxRateId: string
      taxRateName: string
      taxRateValue: number
      taxType: TaxCategoryType
      referenceType: string
      referenceId: string
      taxableAmount: number
      taxAmount: number
    },
    businessId: string
  ): Promise<TaxTransaction> {
    return await this.create<TaxTransaction>(
      {
        ...input,
      },
      businessId,
      'system'
    )
  }

  // ==================== Tax Reports ====================

  /**
   * Calculate net VAT position (Output VAT - Input VAT) for a period.
   */
  async calculateNetVatPosition(
    businessId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<TaxSummary> {
    const transactions = await this.list<TaxTransaction>(businessId, [
      Query.greaterThanEqual('createdAt', dateFrom),
      Query.lessThanEqual('createdAt', dateTo),
    ])

    let outputVatPaisa = 0
    let inputVatPaisa = 0

    for (const txn of transactions) {
      const taxAmountPaisa = toMinorUnits(txn.taxAmount)
      if (txn.taxType === 'output_vat') {
        outputVatPaisa += taxAmountPaisa
      } else if (txn.taxType === 'input_vat') {
        inputVatPaisa += taxAmountPaisa
      }
    }

    const netPaisa = outputVatPaisa - inputVatPaisa

    return {
      outputVat: fromMinorUnits(outputVatPaisa),
      inputVat: fromMinorUnits(inputVatPaisa),
      netVatPosition: fromMinorUnits(Math.abs(netPaisa)),
      status: netPaisa > 0 ? 'PAYABLE' : netPaisa < 0 ? 'REFUNDABLE' : 'NEUTRAL',
    }
  }

  /**
   * Get detailed tax summary by rate for a period.
   */
  async getTaxSummaryByRate(
    businessId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<Array<{
    taxRateName: string
    rate: number
    taxableAmount: number
    taxAmount: number
    transactionCount: number
  }>> {
    const transactions = await this.list<TaxTransaction>(businessId, [
      Query.greaterThanEqual('createdAt', dateFrom),
      Query.lessThanEqual('createdAt', dateTo),
    ])

    const byRate = new Map<string, {
      name: string
      rate: number
      taxablePaisa: number
      taxPaisa: number
      count: number
    }>()

    for (const txn of transactions) {
      const key = txn.taxRateName
      const existing = byRate.get(key) || {
        name: txn.taxRateName,
        rate: txn.taxRateValue,
        taxablePaisa: 0,
        taxPaisa: 0,
        count: 0,
      }
      existing.taxablePaisa += toMinorUnits(txn.taxableAmount)
      existing.taxPaisa += toMinorUnits(txn.taxAmount)
      existing.count += 1
      byRate.set(key, existing)
    }

    return Array.from(byRate.values()).map(v => ({
      taxRateName: v.name,
      rate: v.rate,
      taxableAmount: fromMinorUnits(v.taxablePaisa),
      taxAmount: fromMinorUnits(v.taxPaisa),
      transactionCount: v.count,
    }))
  }
}

// ==================== Tax Category Sub-Service ====================

class TaxCategoryService extends BaseService {
  constructor() {
    super(COLLECTIONS.TAX_CATEGORIES)
  }
}

export const taxEngineService = new TaxEngineService()
