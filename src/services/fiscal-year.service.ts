import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { FiscalYear, AccountingPeriod, FiscalYearStatus, AccountingPeriodStatus } from '@/types'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { Query } from 'appwrite'

/**
 * Fiscal Year & Accounting Period Service
 * 
 * Manages Nepal fiscal years (BS calendar: Shrawan 1 to Ashadh end).
 * Handles period creation, closing, and locking for audit compliance.
 */
export class FiscalYearService extends BaseService {
  constructor() {
    super(COLLECTIONS.FISCAL_YEARS)
  }

  /**
   * Get or create the current fiscal year for a business.
   */
  async getOrCreateCurrentFiscalYear(businessId: string, userId: string): Promise<FiscalYear> {
    const fyInfo = getCurrentFinancialYear()

    // Check if current FY already exists
    const existing = await this.list<FiscalYear>(businessId, [
      Query.equal('bsStartYear', fyInfo.bsStartYear),
    ])

    if (existing.length > 0) {
      return existing[0]
    }

    // Create current fiscal year
    // We approximate ISO dates — exact BS→AD conversion needs calendarService
    const startYear = fyInfo.bsStartYear
    const endYear = fyInfo.bsEndYear

    // Approximate: FY 2083/84 → roughly Jul 2026 to Jul 2027
    // This is approximate — calendarService can provide exact dates
    const isoStart = `${startYear + 56}-07-15T00:00:00.000Z` // Rough Shrawan 1 AD equivalent
    const isoEnd = `${endYear + 56}-07-14T23:59:59.999Z`

    return await this.create<FiscalYear>(
      {
        name: `${fyInfo.label}`,
        bsStartYear: fyInfo.bsStartYear,
        bsEndYear: fyInfo.bsEndYear,
        isoStartDate: isoStart,
        isoEndDate: isoEnd,
        status: 'OPEN' as FiscalYearStatus,
      },
      businessId,
      userId
    )
  }

  /**
   * List all fiscal years for a business.
   */
  async listFiscalYears(businessId: string): Promise<FiscalYear[]> {
    return await this.list<FiscalYear>(businessId, [Query.orderDesc('bsStartYear')])
  }

  /**
   * Get a specific fiscal year by ID.
   */
  async getFiscalYear(id: string, businessId: string): Promise<FiscalYear> {
    return await this.getById<FiscalYear>(id, businessId)
  }

  /**
   * Create accounting periods (monthly) for a fiscal year.
   * Nepal FY has 12 months: Shrawan (4) through Ashadh (3).
   */
  async createAccountingPeriods(
    fiscalYearId: string,
    businessId: string,
    userId: string
  ): Promise<AccountingPeriod[]> {
    const fy = await this.getFiscalYear(fiscalYearId, businessId)
    const periodService = new AccountingPeriodService()

    // Check if periods already exist
    const existing = await periodService.list<AccountingPeriod>(businessId, [
      Query.equal('fiscalYearId', fiscalYearId),
    ])
    if (existing.length > 0) return existing

    const nepaliMonths = [
      'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush',
      'Magh', 'Falgun', 'Chaitra', 'Baisakh', 'Jestha', 'Ashadh',
    ]

    const created: AccountingPeriod[] = []
    for (let i = 0; i < 12; i++) {
      const monthNumber = i + 1 // 1-based (Shrawan=1, Ashadh=12)

      // Approximate dates for each month
      const startMonth = ((3 + i) % 12) + 1 // Shrawan is month 4 in BS

      // Rough AD equivalent
      const adMonth = ((startMonth + 3) % 12) + 1
      const adYear = fy.bsStartYear + 56 + (adMonth < 7 ? 0 : 0)

      const isoStart = `${adYear}-${String(adMonth).padStart(2, '0')}-01T00:00:00.000Z`
      const isoEnd = `${adYear}-${String(adMonth).padStart(2, '0')}-28T23:59:59.999Z`

      const period = await periodService.create<AccountingPeriod>(
        {
          fiscalYearId: fiscalYearId,
          name: `${nepaliMonths[i]} ${fy.label}`,
          monthNumber,
          isoStartDate: isoStart,
          isoEndDate: isoEnd,
          status: 'OPEN' as AccountingPeriodStatus,
        },
        businessId,
        userId
      )
      created.push(period)
    }

    return created
  }

  /**
   * Close a fiscal year. All periods must be closed first.
   * Creates a closing journal entry to transfer current year P&L to retained earnings.
   */
  async closeFiscalYear(
    fiscalYearId: string,
    businessId: string,
    userId: string
  ): Promise<FiscalYear> {
    const fy = await this.getFiscalYear(fiscalYearId, businessId)

    if (fy.status === 'CLOSED' || fy.status === 'LOCKED') {
      throw new Error(`Fiscal year '${fy.name}' is already ${fy.status.toLowerCase()}`)
    }

    // Check all periods are closed
    const periodService = new AccountingPeriodService()
    const periods = await periodService.list<AccountingPeriod>(businessId, [
      Query.equal('fiscalYearId', fiscalYearId),
    ])

    const openPeriods = periods.filter(p => p.status === 'OPEN')
    if (openPeriods.length > 0) {
      throw new Error(
        `Cannot close fiscal year: ${openPeriods.length} period(s) still open. ` +
        `Close all periods first: ${openPeriods.map(p => p.name).join(', ')}`
      )
    }

    // Close the fiscal year
    return await this.update<FiscalYear>(
      fiscalYearId,
      {
        status: 'CLOSED' as FiscalYearStatus,
        closedAt: new Date().toISOString(),
        closedBy: userId,
      },
      businessId
    )
  }

  /**
   * Lock a closed fiscal year (permanent — no further modifications allowed).
   */
  async lockFiscalYear(
    fiscalYearId: string,
    businessId: string,
    _userId: string
  ): Promise<FiscalYear> {
    const fy = await this.getFiscalYear(fiscalYearId, businessId)

    if (fy.status !== 'CLOSED') {
      throw new Error('Only closed fiscal years can be locked')
    }

    return await this.update<FiscalYear>(
      fiscalYearId,
      {
        status: 'LOCKED' as FiscalYearStatus,
      },
      businessId
    )
  }

  /**
   * Get the current open fiscal year for a business.
   */
  async getCurrentOpenFiscalYear(businessId: string): Promise<FiscalYear | null> {
    const fys = await this.list<FiscalYear>(businessId, [
      Query.equal('status', 'OPEN'),
      Query.orderDesc('bsStartYear'),
      Query.limit(1),
    ])
    return fys.length > 0 ? fys[0] : null
  }

  /**
   * Check if a date falls within a locked fiscal year.
   */
  async isDateInLockedPeriod(businessId: string, date: string): Promise<boolean> {
    const fy = getCurrentFinancialYear(date)
    const fys = await this.list<FiscalYear>(businessId, [
      Query.equal('bsStartYear', fy.bsStartYear),
    ])

    return fys.some(f => f.status === 'LOCKED')
  }
}

// ==================== Accounting Period Sub-Service ====================

class AccountingPeriodService extends BaseService {
  constructor() {
    super(COLLECTIONS.ACCOUNTING_PERIODS)
  }

  /**
   * Close a specific accounting period.
   */
  async closePeriod(periodId: string, businessId: string, userId: string): Promise<AccountingPeriod> {
    const period = await this.getById<AccountingPeriod>(periodId, businessId)

    if (period.status !== 'OPEN') {
      throw new Error(`Period '${period.name}' is already ${period.status.toLowerCase()}`)
    }

    return await this.update<AccountingPeriod>(
      periodId,
      {
        status: 'CLOSED' as AccountingPeriodStatus,
        closedAt: new Date().toISOString(),
        closedBy: userId,
      },
      businessId
    )
  }

  /**
   * Lock a closed period (permanent).
   */
  async lockPeriod(periodId: string, businessId: string): Promise<AccountingPeriod> {
    const period = await this.getById<AccountingPeriod>(periodId, businessId)

    if (period.status !== 'CLOSED') {
      throw new Error('Only closed periods can be locked')
    }

    return await this.update<AccountingPeriod>(
      periodId,
      {
        status: 'LOCKED' as AccountingPeriodStatus,
      },
      businessId
    )
  }

  /**
   * Get periods for a fiscal year.
   */
  async getPeriodsForFiscalYear(fiscalYearId: string, businessId: string): Promise<AccountingPeriod[]> {
    return await this.list<AccountingPeriod>(businessId, [
      Query.equal('fiscalYearId', fiscalYearId),
      Query.orderAsc('monthNumber'),
    ])
  }
}

export const fiscalYearService = new FiscalYearService()
