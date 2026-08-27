import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import {
  Account, AccountType, JournalEntry, JournalEntryLine,
  TrialBalanceRow, ProfitLossRow, BalanceSheetRow,
} from '@/types'
import { toMinorUnits, fromMinorUnits } from '@/lib/money'
import { Query } from 'appwrite'

/**
 * Financial Reports Service
 * 
 * Generates General Ledger, Profit & Loss, Balance Sheet, and Cash Flow Statement
 * from the double-entry accounting engine.
 */
export class FinancialReportsService extends BaseService {
  constructor() {
    super(COLLECTIONS.ACCOUNTS)
  }

  // ==================== General Ledger ====================

  /**
   * Generate General Ledger for a specific account.
   * Returns all posted journal lines for the account in chronological order.
   */
  async generateGeneralLedger(
    businessId: string,
    accountId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    account: Account
    entries: Array<{
      date: string
      entryNumber: string
      description: string
      referenceType?: string
      referenceId?: string
      debit: number
      credit: number
      balance: number
    }>
    openingBalance: number
    closingBalance: number
    totalDebit: number
    totalCredit: number
  }> {
    const account = await this.getById<Account>(accountId, businessId)

    // Get all journal lines for this account from POSTED entries
    const lineService = new JournalLineReportService()
    const postedLines = await lineService.getPostedLinesByAccount(accountId, businessId, dateFrom, dateTo)

    const isDebitNormal = account.type === 'asset' || account.type === 'expense'
    let runningBalancePaisa = toMinorUnits(account.openingBalance)
    let totalDebitPaisa = 0
    let totalCreditPaisa = 0

    const entries = postedLines.map(line => {
      const debitPaisa = toMinorUnits(line.debit)
      const creditPaisa = toMinorUnits(line.credit)

      totalDebitPaisa += debitPaisa
      totalCreditPaisa += creditPaisa

      if (isDebitNormal) {
        runningBalancePaisa += debitPaisa - creditPaisa
      } else {
        runningBalancePaisa += creditPaisa - debitPaisa
      }

      return {
        date: line._entryDate || '',
        entryNumber: line._entryNumber || '',
        description: line.description || line._entryDescription || '',
        referenceType: line._referenceType,
        referenceId: line._referenceId,
        debit: line.debit,
        credit: line.credit,
        balance: fromMinorUnits(runningBalancePaisa),
      }
    })

    return {
      account,
      entries,
      openingBalance: account.openingBalance,
      closingBalance: fromMinorUnits(runningBalancePaisa),
      totalDebit: fromMinorUnits(totalDebitPaisa),
      totalCredit: fromMinorUnits(totalCreditPaisa),
    }
  }

  /**
   * Generate General Ledger summary for all accounts.
   */
  async generateGeneralLedgerSummary(
    businessId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<Array<{
    accountCode: string
    accountName: string
    accountType: AccountType
    openingBalance: number
    totalDebit: number
    totalCredit: number
    closingBalance: number
  }>> {
    const accountService = new AccountReportService()
    const accounts = await accountService.listActiveAccounts(businessId)
    const summary: Array<{
      accountCode: string
      accountName: string
      accountType: AccountType
      openingBalance: number
      totalDebit: number
      totalCredit: number
      closingBalance: number
    }> = []

    for (const account of accounts) {
      const gl = await this.generateGeneralLedger(businessId, account.$id, dateFrom, dateTo)
      if (gl.entries.length > 0 || account.openingBalance !== 0) {
        summary.push({
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          openingBalance: gl.openingBalance,
          totalDebit: gl.totalDebit,
          totalCredit: gl.totalCredit,
          closingBalance: gl.closingBalance,
        })
      }
    }

    return summary
  }

  // ==================== Trial Balance ====================

  /**
   * Generate Trial Balance as of a given date.
   * All accounts with non-zero balances, grouped and totaled.
   */
  async generateTrialBalance(
    businessId: string,
    asOfDate?: string
  ): Promise<{
    rows: TrialBalanceRow[]
    totalDebit: number
    totalCredit: number
    isBalanced: boolean
    difference: number
    asOfDate: string
  }> {
    const accountService = new AccountReportService()
    const accounts = await accountService.listActiveAccounts(businessId)
    const rows: TrialBalanceRow[] = []

    let totalDebitPaisa = 0
    let totalCreditPaisa = 0

    for (const account of accounts) {
      const lineService = new JournalLineReportService()
      const lines = await lineService.getPostedLinesByAccount(account.$id, businessId, undefined, asOfDate)

      let debitPaisa = 0
      let creditPaisa = 0

      for (const line of lines) {
        debitPaisa += toMinorUnits(line.debit)
        creditPaisa += toMinorUnits(line.credit)
      }

      // Add opening balance
      const openingPaisa = toMinorUnits(account.openingBalance)
      const isDebitNormal = account.type === 'asset' || account.type === 'expense'

      let balancePaisa: number
      if (isDebitNormal) {
        balancePaisa = openingPaisa + debitPaisa - creditPaisa
      } else {
        balancePaisa = openingPaisa + creditPaisa - debitPaisa
      }

      if (Math.abs(balancePaisa) < 1) continue // Skip zero-balance accounts

      const rowDebit = isDebitNormal ? Math.max(0, balancePaisa) : 0
      const rowCredit = !isDebitNormal ? Math.max(0, balancePaisa) : 0

      totalDebitPaisa += rowDebit
      totalCreditPaisa += rowCredit

      rows.push({
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        debit: fromMinorUnits(rowDebit),
        credit: fromMinorUnits(rowCredit),
      })
    }

    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode))

    const difference = fromMinorUnits(Math.abs(totalDebitPaisa - totalCreditPaisa))

    return {
      rows,
      totalDebit: fromMinorUnits(totalDebitPaisa),
      totalCredit: fromMinorUnits(totalCreditPaisa),
      isBalanced: Math.abs(totalDebitPaisa - totalCreditPaisa) < 2,
      difference,
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
    }
  }

  // ==================== Profit & Loss Statement ====================

  /**
   * Generate Profit & Loss statement for a period.
   */
  async generateProfitAndLoss(
    businessId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<{
    revenue: ProfitLossRow[]
    totalRevenue: number
    costOfGoodsSold: ProfitLossRow[]
    totalCOGS: number
    grossProfit: number
    operatingExpenses: ProfitLossRow[]
    totalOperatingExpenses: number
    nonOperatingItems: ProfitLossRow[]
    totalNonOperating: number
    netProfit: number
    periodFrom: string
    periodTo: string
  }> {
    const accountService = new AccountReportService()
    const allAccounts = await accountService.listActiveAccounts(businessId)

    const revenue: ProfitLossRow[] = []
    const cogs: ProfitLossRow[] = []
    const operatingExpenses: ProfitLossRow[] = []
    const nonOperatingItems: ProfitLossRow[] = []

    for (const account of allAccounts) {
      const lineService = new JournalLineReportService()
      const lines = await lineService.getPostedLinesByAccount(account.$id, businessId, dateFrom, dateTo)

      if (lines.length === 0) continue

      let totalPaisa = 0
      const isCreditNormal = account.type === 'revenue'

      for (const line of lines) {
        const debitPaisa = toMinorUnits(line.debit)
        const creditPaisa = toMinorUnits(line.credit)
        totalPaisa += isCreditNormal ? (creditPaisa - debitPaisa) : (debitPaisa - creditPaisa)
      }

      if (Math.abs(totalPaisa) < 1) continue

      const amount = fromMinorUnits(Math.abs(totalPaisa))
      const row: ProfitLossRow = {
        accountCode: account.code,
        accountName: account.name,
        amount,
        category: 'revenue',
      }

      if (account.type === 'revenue') {
        row.category = account.subType === 'other_income' ? 'revenue' : 'revenue'
        revenue.push(row)
      } else if (account.subType === 'cost_of_goods_sold') {
        row.category = 'cogs'
        cogs.push(row)
      } else if (account.subType === 'operating_expense') {
        row.category = 'expense'
        operatingExpenses.push(row)
      } else if (account.subType === 'non_operating_expense' || account.subType === 'tax_expense') {
        row.category = 'expense'
        nonOperatingItems.push(row)
      }
    }

    const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0)
    const totalCOGS = cogs.reduce((sum, r) => sum + r.amount, 0)
    const grossProfit = totalRevenue - totalCOGS
    const totalOperatingExpenses = operatingExpenses.reduce((sum, r) => sum + r.amount, 0)
    const totalNonOperating = nonOperatingItems.reduce((sum, r) => sum + r.amount, 0)
    const netProfit = grossProfit - totalOperatingExpenses - totalNonOperating

    return {
      revenue,
      totalRevenue,
      costOfGoodsSold: cogs,
      totalCOGS,
      grossProfit,
      operatingExpenses,
      totalOperatingExpenses,
      nonOperatingItems,
      totalNonOperating,
      netProfit,
      periodFrom: dateFrom,
      periodTo: dateTo,
    }
  }

  // ==================== Balance Sheet ====================

  /**
   * Generate Balance Sheet as of a given date.
   */
  async generateBalanceSheet(
    businessId: string,
    asOfDate?: string
  ): Promise<{
    assets: {
      currentAssets: BalanceSheetRow[]
      fixedAssets: BalanceSheetRow[]
      totalCurrentAssets: number
      totalFixedAssets: number
      totalAssets: number
    }
    liabilities: {
      currentLiabilities: BalanceSheetRow[]
      nonCurrentLiabilities: BalanceSheetRow[]
      totalCurrentLiabilities: number
      totalNonCurrentLiabilities: number
      totalLiabilities: number
    }
    equity: {
      equityItems: BalanceSheetRow[]
      totalEquity: number
    }
    totalLiabilitiesAndEquity: number
    isBalanced: boolean
    asOfDate: string
  }> {
    const accountService = new AccountReportService()
    const allAccounts = await accountService.listActiveAccounts(businessId)

    const currentAssets: BalanceSheetRow[] = []
    const fixedAssets: BalanceSheetRow[] = []
    const currentLiabilities: BalanceSheetRow[] = []
    const nonCurrentLiabilities: BalanceSheetRow[] = []
    const equityItems: BalanceSheetRow[] = []

    for (const account of allAccounts) {
      if (account.type === 'revenue' || account.type === 'expense') continue // Skip P&L accounts

      const lineService = new JournalLineReportService()
      const lines = await lineService.getPostedLinesByAccount(account.$id, businessId, undefined, asOfDate)

      let balancePaisa = toMinorUnits(account.openingBalance)
      const isDebitNormal = account.type === 'asset'

      for (const line of lines) {
        const debitPaisa = toMinorUnits(line.debit)
        const creditPaisa = toMinorUnits(line.credit)
        balancePaisa += isDebitNormal ? (debitPaisa - creditPaisa) : (creditPaisa - debitPaisa)
      }

      if (Math.abs(balancePaisa) < 1) continue

      const amount = fromMinorUnits(Math.abs(balancePaisa))
      const row: BalanceSheetRow = {
        accountCode: account.code,
        accountName: account.name,
        amount,
        category: 'current_asset',
      }

      if (account.type === 'asset') {
        if (account.subType === 'fixed_asset' || account.subType === 'non_current_asset') {
          row.category = 'fixed_asset'
          fixedAssets.push(row)
        } else {
          row.category = 'current_asset'
          currentAssets.push(row)
        }
      } else if (account.type === 'liability') {
        if (account.subType === 'non_current_liability') {
          row.category = 'non_current_liability'
          nonCurrentLiabilities.push(row)
        } else {
          row.category = 'current_liability'
          currentLiabilities.push(row)
        }
      } else if (account.type === 'equity') {
        row.category = 'equity'
        equityItems.push(row)
      }
    }

    const totalCurrentAssets = currentAssets.reduce((sum, r) => sum + r.amount, 0)
    const totalFixedAssets = fixedAssets.reduce((sum, r) => sum + r.amount, 0)
    const totalAssets = totalCurrentAssets + totalFixedAssets

    const totalCurrentLiabilities = currentLiabilities.reduce((sum, r) => sum + r.amount, 0)
    const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum, r) => sum + r.amount, 0)
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities

    const totalEquity = equityItems.reduce((sum, r) => sum + r.amount, 0)
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity

    return {
      assets: {
        currentAssets,
        fixedAssets,
        totalCurrentAssets,
        totalFixedAssets,
        totalAssets,
      },
      liabilities: {
        currentLiabilities,
        nonCurrentLiabilities,
        totalCurrentLiabilities,
        totalNonCurrentLiabilities,
        totalLiabilities,
      },
      equity: {
        equityItems,
        totalEquity,
      },
      totalLiabilitiesAndEquity,
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 2,
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
    }
  }

  // ==================== Cash Flow Statement ====================

  /**
   * Generate Cash Flow Statement for a period.
   * Indirect method: starts from net profit and adjusts for non-cash items.
   */
  async generateCashFlowStatement(
    businessId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<{
    operatingActivities: {
      netProfit: number
      adjustments: Array<{ description: string; amount: number }>
      netCashFromOperating: number
    }
    investingActivities: {
      items: Array<{ description: string; amount: number }>
      netCashFromInvesting: number
    }
    financingActivities: {
      items: Array<{ description: string; amount: number }>
      netCashFromFinancing: number
    }
    netChangeInCash: number
    openingCash: number
    closingCash: number
    periodFrom: string
    periodTo: string
  }> {
    // Get P&L for net profit
    const pnl = await this.generateProfitAndLoss(businessId, dateFrom, dateTo)

    // Calculate cash account balances
    const cashAccounts = ['1000', '1010', '1020', '1030'] // Cash, Bank, eSewa, Khalti
    let openingCashPaisa = 0
    let closingCashPaisa = 0

    const accountService = new AccountReportService()
    const accounts = await accountService.listActiveAccounts(businessId)

    for (const account of accounts) {
      if (!cashAccounts.includes(account.code)) continue

      const lineService = new JournalLineReportService()
      const openingLines = await lineService.getPostedLinesByAccount(account.$id, businessId, undefined, dateFrom)
      const closingLines = await lineService.getPostedLinesByAccount(account.$id, businessId, undefined, dateTo)

      let openingPaisa = toMinorUnits(account.openingBalance)
      for (const line of openingLines) {
        openingPaisa += toMinorUnits(line.debit) - toMinorUnits(line.credit)
      }

      let closingPaisa = toMinorUnits(account.openingBalance)
      for (const line of closingLines) {
        closingPaisa += toMinorUnits(line.debit) - toMinorUnits(line.credit)
      }

      openingCashPaisa += openingPaisa
      closingCashPaisa += closingPaisa
    }

    // For now, simplified cash flow:
    // Operating: net profit + depreciation (if any)
    // Investing: asset purchases
    // Financing: owner drawings, loan proceeds/repayments
    const netProfitPaisa = toMinorUnits(pnl.netProfit)
    const netChangePaisa = closingCashPaisa - openingCashPaisa

    return {
      operatingActivities: {
        netProfit: pnl.netProfit,
        adjustments: [
          { description: 'Depreciation & Amortization', amount: 0 },
        ],
        netCashFromOperating: fromMinorUnits(netProfitPaisa),
      },
      investingActivities: {
        items: [],
        netCashFromInvesting: 0,
      },
      financingActivities: {
        items: [],
        netCashFromFinancing: 0,
      },
      netChangeInCash: fromMinorUnits(netChangePaisa),
      openingCash: fromMinorUnits(openingCashPaisa),
      closingCash: fromMinorUnits(closingCashPaisa),
      periodFrom: dateFrom,
      periodTo: dateTo,
    }
  }
}

// ==================== Internal Report Sub-Services ====================

class JournalLineReportService extends BaseService {
  constructor() {
    super(COLLECTIONS.JOURNAL_LINES)
  }

  /**
   * Get posted journal lines for an account, with entry metadata joined.
   */
  async getPostedLinesByAccount(
    accountId: string,
    businessId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<Array<JournalEntryLine & {
    _entryDate: string
    _entryNumber: string
    _entryDescription: string
    _referenceType?: string
    _referenceId?: string
  }>> {
    // Fetch all lines for this account
    const lines = await this.list<JournalEntryLine>(businessId, [
      Query.equal('accountId', accountId),
    ])

    if (lines.length === 0) return []

    // Fetch the journal entries to filter by status and date
    const entryService = new JournalEntryReportService()
    const entries = await entryService.listPostedEntries(businessId, dateFrom, dateTo)

    const entryMap = new Map(entries.map(e => [e.$id, e]))

    return lines
      .filter(line => {
        const entry = entryMap.get(line.journalEntryId)
        return entry !== undefined
      })
      .map(line => {
        const entry = entryMap.get(line.journalEntryId)!
        return {
          ...line,
          _entryDate: entry.date,
          _entryNumber: entry.entryNumber,
          _entryDescription: entry.description,
          _referenceType: entry.referenceType,
          _referenceId: entry.referenceId,
        }
      })
      .sort((a, b) => a._entryDate.localeCompare(b._entryDate))
  }
}

class JournalEntryReportService extends BaseService {
  constructor() {
    super(COLLECTIONS.JOURNAL_ENTRIES)
  }

  async listPostedEntries(
    businessId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<JournalEntry[]> {
    const queries: any[] = [
      Query.equal('status', 'POSTED'),
    ]

    if (dateFrom) {
      queries.push(Query.greaterThanEqual('date', dateFrom))
    }
    if (dateTo) {
      queries.push(Query.lessThanEqual('date', dateTo))
    }

    return await this.list<JournalEntry>(businessId, queries)
  }
}

class AccountReportService extends BaseService {
  constructor() {
    super(COLLECTIONS.ACCOUNTS)
  }

  async listActiveAccounts(businessId: string): Promise<Account[]> {
    const accounts = await this.list<Account>(businessId)
    return accounts.filter(a => a.isActive).sort((a, b) => a.code.localeCompare(b.code))
  }
}

export const financialReportsService = new FinancialReportsService()
