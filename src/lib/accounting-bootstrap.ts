import { accountingService } from '@/services/accounting.service'
import { taxEngineService } from '@/services/tax-engine.service'
import { fiscalYearService } from '@/services/fiscal-year.service'
import { auditLogService } from '@/services/audit-log.service'

/**
 * Accounting Bootstrap
 * 
 * Initializes the complete accounting system for a newly created business.
 * Called once during business onboarding — provisions:
 * 1. Chart of Accounts (Nepal SME defaults)
 * 2. Tax Categories (Output VAT, Input VAT, WHT)
 * 3. Tax Rates (13% VAT standard, 0% exempt, 1.5% WHT)
 * 4. Current Fiscal Year
 * 5. Accounting Periods (12 monthly)
 */
export async function initializeAccountingForBusiness(
  businessId: string,
  userId: string
): Promise<{
  accountsCreated: number
  taxCategoriesCreated: number
  taxRatesCreated: number
  fiscalYearCreated: boolean
  periodsCreated: number
}> {
  const result = {
    accountsCreated: 0,
    taxCategoriesCreated: 0,
    taxRatesCreated: 0,
    fiscalYearCreated: false,
    periodsCreated: 0,
  }

  try {
    // 1. Provision Chart of Accounts
    const accounts = await accountingService.provisionDefaultChartOfAccounts(businessId, userId)
    result.accountsCreated = accounts.length

    // 2. Provision Tax Categories
    const taxCategories = await taxEngineService.provisionDefaultTaxCategories(businessId, userId)
    result.taxCategoriesCreated = taxCategories.length

    // 3. Provision Tax Rates
    const taxRates = await taxEngineService.provisionDefaultTaxRates(businessId, userId)
    result.taxRatesCreated = taxRates.length

    // 4. Create current Fiscal Year
    const fy = await fiscalYearService.getOrCreateCurrentFiscalYear(businessId, userId)
    result.fiscalYearCreated = true

    // 5. Create Accounting Periods
    const periods = await fiscalYearService.createAccountingPeriods(fy.$id, businessId, userId)
    result.periodsCreated = periods.length

    // 6. Log the initialization
    await auditLogService.logEvent(businessId, userId, 'accounting_initialized', businessId, {
      accountsCreated: result.accountsCreated,
      taxCategoriesCreated: result.taxCategoriesCreated,
      taxRatesCreated: result.taxRatesCreated,
      fiscalYear: fy.name,
      periodsCreated: result.periodsCreated,
    })
  } catch (err: any) {
    console.error('[AccountingBootstrap] Failed to initialize accounting:', err?.message)
    // Don't throw — accounting init failure should not block business creation
  }

  return result
}

/**
 * Check if accounting has been initialized for a business.
 */
export async function isAccountingInitialized(businessId: string): Promise<boolean> {
  try {
    const accounts = await accountingService.listAccounts(businessId)
    return accounts.length > 0
  } catch {
    return false
  }
}
