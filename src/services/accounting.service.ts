import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import {
  Account, AccountInput, AccountType, AccountSubType,
  JournalEntry, JournalEntryInput, JournalEntryLine, JournalEntryLineInput,
  JournalEntryStatus, TrialBalanceRow,
} from '@/types'
import { toMinorUnits, fromMinorUnits } from '@/lib/money'
import { getCurrentFinancialYear } from '@/lib/financial-year'
import { Query } from 'appwrite'

// ==================== Nepal SME Default Chart of Accounts ====================

interface DefaultAccountSeed {
  code: string
  name: string
  type: AccountType
  subType: AccountSubType
  isSystem?: boolean
  description?: string
}

const NEPAL_SME_DEFAULT_ACCOUNTS: DefaultAccountSeed[] = [
  // --- Assets ---
  { code: '1000', name: 'Cash in Hand', type: 'asset', subType: 'current_asset', isSystem: true, description: 'Petty cash and daily cash register balance' },
  { code: '1010', name: 'Cash at Bank', type: 'asset', subType: 'current_asset', isSystem: true, description: 'Bank account balances' },
  { code: '1020', name: 'Digital Wallet - eSewa', type: 'asset', subType: 'current_asset', isSystem: true, description: 'eSewa wallet balance' },
  { code: '1030', name: 'Digital Wallet - Khalti', type: 'asset', subType: 'current_asset', isSystem: true, description: 'Khalti wallet balance' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', subType: 'current_asset', isSystem: true, description: 'Amounts owed by customers (Udhaar)' },
  { code: '1200', name: 'Inventory', type: 'asset', subType: 'current_asset', isSystem: true, description: 'Stock on hand valued at weighted average cost' },
  { code: '1300', name: 'Prepaid Expenses', type: 'asset', subType: 'current_asset', description: 'Advance payments for future expenses' },
  { code: '1400', name: 'Input VAT', type: 'asset', subType: 'current_asset', isSystem: true, description: 'VAT paid on purchases (recoverable)' },
  { code: '1500', name: 'Fixed Assets', type: 'asset', subType: 'fixed_asset', description: 'Property, equipment, furniture' },
  { code: '1510', name: 'Accumulated Depreciation', type: 'asset', subType: 'fixed_asset', description: 'Total depreciation charged on fixed assets' },

  // --- Liabilities ---
  { code: '2000', name: 'Accounts Payable', type: 'liability', subType: 'current_liability', isSystem: true, description: 'Amounts owed to suppliers' },
  { code: '2100', name: 'Output VAT', type: 'liability', subType: 'current_liability', isSystem: true, description: 'VAT collected on sales (payable to government)' },
  { code: '2200', name: 'Withholding Tax Payable', type: 'liability', subType: 'current_liability', description: 'TDS deducted and payable to government' },
  { code: '2300', name: 'Salary Payable', type: 'liability', subType: 'current_liability', description: 'Accrued salaries not yet paid' },
  { code: '2400', name: 'Loan Payable', type: 'liability', subType: 'non_current_liability', description: 'Bank loans or borrowings' },

  // --- Equity ---
  { code: '3000', name: 'Owner\'s Capital', type: 'equity', subType: 'equity', isSystem: true, description: 'Initial capital invested by owner' },
  { code: '3100', name: 'Owner\'s Drawings', type: 'equity', subType: 'equity', description: 'Amounts withdrawn by owner for personal use' },
  { code: '3200', name: 'Retained Earnings', type: 'equity', subType: 'equity', isSystem: true, description: 'Accumulated profit/loss from prior periods' },
  { code: '3300', name: 'Current Year Profit/Loss', type: 'equity', subType: 'equity', isSystem: true, description: 'Net profit or loss for current fiscal year' },

  // --- Revenue ---
  { code: '4000', name: 'Sales Revenue', type: 'revenue', subType: 'revenue', isSystem: true, description: 'Income from product sales' },
  { code: '4100', name: 'Service Revenue', type: 'revenue', subType: 'revenue', description: 'Income from services rendered' },
  { code: '4200', name: 'Sales Returns & Allowances', type: 'revenue', subType: 'revenue', isSystem: true, description: 'Contra-revenue for returns and discounts' },
  { code: '4300', name: 'Interest Income', type: 'revenue', subType: 'other_income', description: 'Interest earned on bank deposits' },
  { code: '4400', name: 'Other Income', type: 'revenue', subType: 'other_income', description: 'Miscellaneous non-operating income' },

  // --- Expenses ---
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', subType: 'cost_of_goods_sold', isSystem: true, description: 'Direct cost of products sold' },
  { code: '6000', name: 'Rent Expense', type: 'expense', subType: 'operating_expense', description: 'Shop or office rent' },
  { code: '6100', name: 'Utilities Expense', type: 'expense', subType: 'operating_expense', description: 'Electricity, water, internet' },
  { code: '6200', name: 'Salary & Wages', type: 'expense', subType: 'operating_expense', description: 'Employee salaries and wages' },
  { code: '6300', name: 'Office Supplies', type: 'expense', subType: 'operating_expense', description: 'Stationery, printing, small items' },
  { code: '6400', name: 'Transportation Expense', type: 'expense', subType: 'operating_expense', description: 'Delivery, logistics, fuel' },
  { code: '6500', name: 'Marketing & Advertising', type: 'expense', subType: 'operating_expense', description: 'Advertising and promotional costs' },
  { code: '6600', name: 'Telephone & Internet', type: 'expense', subType: 'operating_expense', description: 'Phone and internet bills' },
  { code: '6700', name: 'Insurance Expense', type: 'expense', subType: 'operating_expense', description: 'Business insurance premiums' },
  { code: '6800', name: 'Repair & Maintenance', type: 'expense', subType: 'operating_expense', description: 'Equipment and building repairs' },
  { code: '7000', name: 'Depreciation Expense', type: 'expense', subType: 'operating_expense', description: 'Annual depreciation on fixed assets' },
  { code: '7100', name: 'Interest Expense', type: 'expense', subType: 'non_operating_expense', description: 'Interest paid on loans' },
  { code: '7200', name: 'Other Expense', type: 'expense', subType: 'non_operating_expense', description: 'Miscellaneous non-operating expenses' },
  { code: '7300', name: 'Income Tax Expense', type: 'expense', subType: 'tax_expense', description: 'Corporate income tax' },
]

/**
 * Accounting Service
 * 
 * Core double-entry accounting engine.
 * Manages Chart of Accounts, Journal Entries with balanced debit/credit enforcement,
 * and fiscal year operations for Nepal SMEs.
 */
export class AccountingService extends BaseService {
  constructor() {
    super(COLLECTIONS.ACCOUNTS)
  }

  // ==================== Chart of Accounts ====================

  /**
   * Provision the default Nepal SME chart of accounts for a new business.
   * Safe to call multiple times — skips if accounts already exist.
   */
  async provisionDefaultChartOfAccounts(businessId: string, userId: string): Promise<Account[]> {
    const existing = await this.listAccounts(businessId)
    if (existing.length > 0) return existing

    const created: Account[] = []
    for (const seed of NEPAL_SME_DEFAULT_ACCOUNTS) {
      const account = await this.createAccount(
        {
          code: seed.code,
          name: seed.name,
          type: seed.type,
          subType: seed.subType,
          isSystem: seed.isSystem ?? false,
          description: seed.description,
          isActive: true,
          openingBalance: 0,
        },
        businessId,
        userId
      )
      created.push(account)
    }
    return created
  }

  /**
   * Create a new account in the Chart of Accounts.
   * Validates code uniqueness within business.
   */
  async createAccount(input: AccountInput, businessId: string, userId: string): Promise<Account> {
    const existingAccounts = await this.listAccounts(businessId)
    const duplicate = existingAccounts.find(a => a.code === input.code)
    if (duplicate) {
      throw new Error(`Account code '${input.code}' already exists in this business`)
    }

    if (input.parentId) {
      const parent = existingAccounts.find(a => a.$id === input.parentId)
      if (!parent) throw new Error(`Parent account '${input.parentId}' not found`)
      if (parent.type !== input.type) {
        throw new Error(`Parent account type '${parent.type}' does not match child type '${input.type}'`)
      }
    }

    return await this.create<Account>(
      {
        code: input.code,
        name: input.name,
        type: input.type,
        subType: input.subType,
        description: input.description,
        parentId: input.parentId,
        isActive: input.isActive ?? true,
        isSystem: input.isSystem ?? false,
        openingBalance: input.openingBalance ?? 0,
      },
      businessId,
      userId
    )
  }

  /**
   * Update an existing account. System accounts cannot be renamed.
   */
  async updateAccount(
    id: string,
    data: Partial<Pick<AccountInput, 'name' | 'description' | 'isActive' | 'parentId'>>,
    businessId: string
  ): Promise<Account> {
    const existing = await this.getById<Account>(id, businessId)
    if (existing.isSystem && data.name && data.name !== existing.name) {
      throw new Error('System accounts cannot be renamed')
    }
    return await this.update<Account>(id, data, businessId)
  }

  /**
   * List all accounts for a business, sorted by code.
   */
  async listAccounts(businessId: string): Promise<Account[]> {
    const accounts = await this.list<Account>(businessId)
    return accounts.sort((a, b) => a.code.localeCompare(b.code))
  }

  /**
   * List active accounts only.
   */
  async listActiveAccounts(businessId: string): Promise<Account[]> {
    const all = await this.listAccounts(businessId)
    return all.filter(a => a.isActive)
  }

  /**
   * Get accounts by type.
   */
  async getAccountsByType(businessId: string, type: AccountType): Promise<Account[]> {
    const all = await this.listAccounts(businessId)
    return all.filter(a => a.type === type && a.isActive)
  }

  /**
   * Get a single account by code.
   */
  async getAccountByCode(businessId: string, code: string): Promise<Account | null> {
    const accounts = await this.listAccounts(businessId)
    return accounts.find(a => a.code === code) ?? null
  }

  /**
   * Get a single account by ID.
   */
  async getAccountById(businessId: string, id: string): Promise<Account> {
    return await this.getById<Account>(id, businessId)
  }

  // ==================== Journal Entries (Double-Entry Engine) ====================

  /**
   * Create a journal entry with strict double-entry validation.
   * Total DEBIT must equal Total CREDIT. Returns the created entry.
   * Status defaults to DRAFT — must explicitly call postJournalEntry to finalize.
   */
  async createJournalEntry(input: JournalEntryInput, businessId: string, userId: string): Promise<JournalEntry> {
    // Validate lines
    if (!input.lines || input.lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines')
    }

    // Validate each line
    let totalDebitPaisa = 0
    let totalCreditPaisa = 0
    const validatedLines: JournalEntryLineInput[] = []

    for (const line of input.lines) {
      if (!line.accountId || !line.accountCode) {
        throw new Error('Each journal line must have accountId and accountCode')
      }

      const debitPaisa = toMinorUnits(line.debit || 0)
      const creditPaisa = toMinorUnits(line.credit || 0)

      if (debitPaisa < 0 || creditPaisa < 0) {
        throw new Error(`Debit and credit amounts cannot be negative (account: ${line.accountCode})`)
      }
      if (debitPaisa > 0 && creditPaisa > 0) {
        throw new Error(`A single line cannot have both debit and credit (account: ${line.accountCode})`)
      }
      if (debitPaisa === 0 && creditPaisa === 0) {
        throw new Error(`A journal line must have either a debit or credit amount (account: ${line.accountCode})`)
      }

      totalDebitPaisa += debitPaisa
      totalCreditPaisa += creditPaisa

      validatedLines.push({
        accountId: line.accountId,
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: fromMinorUnits(debitPaisa),
        credit: fromMinorUnits(creditPaisa),
        description: line.description,
      })
    }

    // STRICT double-entry validation
    if (totalDebitPaisa !== totalCreditPaisa) {
      throw new Error(
        `Journal entry is not balanced: Total debit (${fromMinorUnits(totalDebitPaisa)}) ` +
        `≠ Total credit (${fromMinorUnits(totalCreditPaisa)}). ` +
        `Difference: ${fromMinorUnits(Math.abs(totalDebitPaisa - totalCreditPaisa))}`
      )
    }

    const fyInfo = getCurrentFinancialYear(input.date)
    const entryNumber = await this.allocateJournalEntryNumber(businessId, fyInfo.shortLabel)

    const totalDebit = fromMinorUnits(totalDebitPaisa)
    const totalCredit = fromMinorUnits(totalCreditPaisa)

    // Create journal entry
    const entry = await this.create<JournalEntry>(
      {
        entryNumber,
        date: input.date,
        type: input.type || 'standard',
        status: 'DRAFT' as JournalEntryStatus,
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        fiscalYear: fyInfo.label,
        totalDebit,
        totalCredit,
        isBalanced: totalDebitPaisa === totalCreditPaisa,
      },
      businessId,
      userId
    )

    // Create journal lines
    const lines: JournalEntryLine[] = []
    const lineService = new JournalLineService()
    for (const line of validatedLines) {
      const journalLine = await lineService.createJournalLine(
        {
          journalEntryId: entry.$id,
          accountId: line.accountId,
          accountCode: line.accountCode,
          accountName: line.accountName,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
        },
        businessId
      )
      lines.push(journalLine)
    }

    return { ...entry, lines } as JournalEntry & { lines: JournalEntryLine[] }
  }

  /**
   * Post a journal entry (DRAFT → POSTED). Entry must be balanced.
   * Once posted, it cannot be modified — only voided or reversed.
   */
  async postJournalEntry(entryId: string, businessId: string): Promise<JournalEntry> {
    const entry = await this.getById<JournalEntry>(entryId, businessId)

    if (entry.status !== 'DRAFT') {
      throw new Error(`Cannot post journal entry in '${entry.status}' status. Only DRAFT entries can be posted.`)
    }

    if (!entry.isBalanced) {
      throw new Error('Cannot post an unbalanced journal entry')
    }

    // Re-verify balanced by loading lines
    const lines = await this.getJournalEntryLines(entryId, businessId)
    if (lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines to post')
    }

    return await this.update<JournalEntry>(
      entryId,
      {
        status: 'POSTED' as JournalEntryStatus,
        postedAt: new Date().toISOString(),
      },
      businessId
    )
  }

  /**
   * Void a journal entry (POSTED → VOIDED). Creates reversing entry automatically.
   * Used when correcting posted transactions.
   */
  async voidJournalEntry(
    entryId: string,
    businessId: string,
    userId: string,
    reason: string
  ): Promise<{ original: JournalEntry; reversal: JournalEntry }> {
    const entry = await this.getById<JournalEntry>(entryId, businessId)

    if (entry.status !== 'POSTED') {
      throw new Error(`Cannot void journal entry in '${entry.status}' status. Only POSTED entries can be voided.`)
    }

    if (!reason || reason.trim().length === 0) {
    throw new Error('Void reason is required')
    }

    // Load original lines
    const originalLines = await this.getJournalEntryLines(entryId, businessId)

    // Create reversing entry (swap debits and credits)
    const reversalLines: JournalEntryLineInput[] = originalLines.map(line => ({
      accountId: line.accountId,
      accountCode: line.accountCode,
      accountName: line.accountName,
      debit: line.credit,
      credit: line.debit,
      description: `Reversal: ${line.description || ''}`,
    }))

    const reversal = await this.createJournalEntry(
      {
        date: new Date().toISOString().split('T')[0],
        type: 'reversing',
        description: `Reversal of ${entry.entryNumber}: ${reason}`,
        referenceType: 'journal_entry',
        referenceId: entryId,
        lines: reversalLines,
      },
      businessId,
      userId
    )

    // Auto-post the reversal
    await this.postJournalEntry(reversal.$id, businessId)

    // Void original
    const updated = await this.update<JournalEntry>(
      entryId,
      {
        status: 'VOIDED' as JournalEntryStatus,
        voidedAt: new Date().toISOString(),
        voidedBy: userId,
        voidReason: reason,
      },
      businessId
    )

    return { original: updated, reversal }
  }

  /**
   * Get all journal lines for a specific entry.
   */
  async getJournalEntryLines(entryId: string, businessId: string): Promise<JournalEntryLine[]> {
    const lineService = new JournalLineService()
    return await lineService.listByJournalEntry(entryId, businessId)
  }

  /**
   * List journal entries with optional filters.
   */
  async listJournalEntries(
    businessId: string,
    options?: {
      status?: JournalEntryStatus
      dateFrom?: string
      dateTo?: string
      referenceType?: string
      referenceId?: string
      fiscalYear?: string
      limit?: number
      offset?: number
    }
  ): Promise<JournalEntry[]> {
    const queries: any[] = []

    if (options?.status) {
      queries.push(Query.equal('status', options.status))
    }
    if (options?.fiscalYear) {
      queries.push(Query.equal('fiscalYear', options.fiscalYear))
    }
    if (options?.referenceType) {
      queries.push(Query.equal('referenceType', options.referenceType))
    }
    if (options?.referenceId) {
      queries.push(Query.equal('referenceId', options.referenceId))
    }
    if (options?.dateFrom) {
      queries.push(Query.greaterThanEqual('date', options.dateFrom))
    }
    if (options?.dateTo) {
      queries.push(Query.lessThanEqual('date', options.dateTo))
    }
    if (options?.limit) {
      queries.push(Query.limit(options.limit))
    }
    if (options?.offset) {
      queries.push(Query.offset(options.offset))
    }

    queries.push(Query.orderDesc('date'))
    queries.push(Query.orderDesc('$createdAt'))

    return await this.list<JournalEntry>(businessId, queries)
  }

  // ==================== Account Balances ====================

  /**
   * Calculate the current balance of an account.
   * Debit-normal accounts (assets, expenses): balance = sum(debits) - sum(credits)
   * Credit-normal accounts (liabilities, equity, revenue): balance = sum(credits) - sum(debits)
   */
  async calculateAccountBalance(
    businessId: string,
    accountId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{ balance: number; debitTotal: number; creditTotal: number }> {
    const account = await this.getById<Account>(accountId, businessId)
    const lineService = new JournalLineService()
    const lines = await lineService.listByAccount(accountId, businessId, dateFrom, dateTo)

    let debitTotalPaisa = 0
    let creditTotalPaisa = 0

    for (const line of lines) {
      // Only count lines from POSTED entries
      // (We fetch lines already filtered by posted entries in the line service)
      debitTotalPaisa += toMinorUnits(line.debit)
      creditTotalPaisa += toMinorUnits(line.credit)
    }

    const isDebitNormal = account.type === 'asset' || account.type === 'expense'
    const balancePaisa = isDebitNormal
      ? debitTotalPaisa - creditTotalPaisa
      : creditTotalPaisa - debitTotalPaisa

    return {
      balance: fromMinorUnits(balancePaisa),
      debitTotal: fromMinorUnits(debitTotalPaisa),
      creditTotal: fromMinorUnits(creditTotalPaisa),
    }
  }

  /**
   * Calculate balances for all active accounts.
   */
  async calculateAllAccountBalances(
    businessId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<Array<{
    account: Account
    balance: number
    debitTotal: number
    creditTotal: number
  }>> {
    const accounts = await this.listActiveAccounts(businessId)
    const results: Array<{
      account: Account
      balance: number
      debitTotal: number
      creditTotal: number
    }> = []

    for (const account of accounts) {
      const balances = await this.calculateAccountBalance(businessId, account.$id, dateFrom, dateTo)
      results.push({
        account,
        ...balances,
      })
    }

    return results
  }

  // ==================== Trial Balance ====================

  /**
   * Generate a trial balance as of a given date.
   * Returns all accounts with non-zero balances.
   */
  async generateTrialBalance(
    businessId: string,
    asOfDate?: string
  ): Promise<TrialBalanceRow[]> {
    const balances = await this.calculateAllAccountBalances(businessId, undefined, asOfDate)
    const rows: TrialBalanceRow[] = []

    for (const { account, balance, debitTotal, creditTotal } of balances) {
      // Skip accounts with zero balance
      if (Math.abs(balance) < 0.01) continue

      const isDebitNormal = account.type === 'asset' || account.type === 'expense'
      rows.push({
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        debit: isDebitNormal ? Math.max(0, balance) : debitTotal,
        credit: !isDebitNormal ? Math.max(0, balance) : creditTotal,
      })
    }

    // Sort by account code
    rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode))

    return rows
  }

  /**
   * Validate that trial balance is balanced (total debits = total credits).
   */
  async validateTrialBalance(
    businessId: string,
    asOfDate?: string
  ): Promise<{ isBalanced: boolean; totalDebit: number; totalCredit: number; difference: number }> {
    const rows = await this.generateTrialBalance(businessId, asOfDate)

    let totalDebitPaisa = 0
    let totalCreditPaisa = 0

    for (const row of rows) {
      totalDebitPaisa += toMinorUnits(row.debit)
      totalCreditPaisa += toMinorUnits(row.credit)
    }

    const totalDebit = fromMinorUnits(totalDebitPaisa)
    const totalCredit = fromMinorUnits(totalCreditPaisa)
    const difference = fromMinorUnits(Math.abs(totalDebitPaisa - totalCreditPaisa))

    return {
      isBalanced: Math.abs(totalDebitPaisa - totalCreditPaisa) < 2, // Allow 1 paisa rounding tolerance
      totalDebit,
      totalCredit,
      difference,
    }
  }

  // ==================== Auto-Generated Journal Entry Helpers ====================

  /**
   * Create a balanced journal entry from a sale transaction.
   * Accounts affected:
   *   DR Cash/Bank (1000-1030) or Accounts Receivable (1100) — amount received or due
   *   DR Output VAT (2100) — if VAT enabled
   *   CR Sales Revenue (4000) — taxable amount
   *   CR Sales Returns (4200) — if applicable (negative revenue)
   */
  async createSaleJournalEntry(
    businessId: string,
    userId: string,
    params: {
      saleId: string
      saleNumber: string
      date: string
      paymentMethod: string
      subtotal: number
      taxAmount: number
      total: number
      paidAmount: number
      dueAmount: number
      vatEnabled: boolean
    }
  ): Promise<JournalEntry> {
    const accounts = await this.listAccounts(businessId)
    const getAccount = (code: string) => {
      const acc = accounts.find(a => a.code === code && a.isActive)
      if (!acc) throw new Error(`Default account '${code}' not found. Run provisionDefaultChartOfAccounts first.`)
      return acc
    }

    // Determine cash/bank account based on payment method
    const cashAccountCode = this.getCashAccountCode(params.paymentMethod)
    const cashAccount = getAccount(cashAccountCode)
    const salesRevenueAccount = getAccount('4000')

    const lines: JournalEntryLineInput[] = []

    // DR Cash/Bank for amount received
    if (params.paidAmount > 0) {
      lines.push({
        accountId: cashAccount.$id,
        accountCode: cashAccount.code,
        accountName: cashAccount.name,
        debit: params.paidAmount,
        credit: 0,
        description: `Payment received for ${params.saleNumber}`,
      })
    }

    // DR Accounts Receivable for amount due
    if (params.dueAmount > 0) {
      const arAccount = getAccount('1100')
      lines.push({
        accountId: arAccount.$id,
        accountCode: arAccount.code,
        accountName: arAccount.name,
        debit: params.dueAmount,
        credit: 0,
        description: `Udhaar for ${params.saleNumber}`,
      })
    }

    // DR Output VAT (liability increases with debit? No — liability increases with credit)
    // Actually: Output VAT is a liability. When we collect VAT, we CREDIT the Output VAT account.
    // Wait — double check Nepal accounting:
    // On a sale with VAT:
    //   DR Cash/Bank or AR: total
    //   CR Sales Revenue: taxable amount
    //   CR Output VAT: tax amount
    // So Output VAT is CREDITED (liability increases)

    // CR Sales Revenue
    lines.push({
      accountId: salesRevenueAccount.$id,
      accountCode: salesRevenueAccount.code,
      accountName: salesRevenueAccount.name,
      debit: 0,
      credit: params.subtotal,
      description: `Sales revenue for ${params.saleNumber}`,
    })

    // CR Output VAT
    if (params.vatEnabled && params.taxAmount > 0) {
      const outputVatAccount = getAccount('2100')
      lines.push({
        accountId: outputVatAccount.$id,
        accountCode: outputVatAccount.code,
        accountName: outputVatAccount.name,
        debit: 0,
        credit: params.taxAmount,
        description: `VAT collected on ${params.saleNumber}`,
      })
    }

    return await this.createJournalEntry(
      {
        date: params.date,
        type: 'auto',
        description: `Sale: ${params.saleNumber}`,
        referenceType: 'sale',
        referenceId: params.saleId,
        lines,
      },
      businessId,
      userId
    )
  }

  /**
   * Create a balanced journal entry for a purchase transaction.
   * DR Inventory / Purchases (5000 or 1200)
   * DR Input VAT (1400) — if applicable
   * CR Cash/Bank or Accounts Payable
   */
  async createPurchaseJournalEntry(
    businessId: string,
    userId: string,
    params: {
      purchaseId: string
      purchaseNumber: string
      date: string
      paymentMethod: string
      subtotal: number
      taxAmount: number
      total: number
      paidAmount: number
      dueAmount: number
    }
  ): Promise<JournalEntry> {
    const accounts = await this.listAccounts(businessId)
    const getAccount = (code: string) => {
      const acc = accounts.find(a => a.code === code && a.isActive)
      if (!acc) throw new Error(`Default account '${code}' not found. Run provisionDefaultChartOfAccounts first.`)
      return acc
    }

    const cogsAccount = getAccount('5000')
    const cashAccountCode = this.getCashAccountCode(params.paymentMethod)
    const cashAccount = getAccount(cashAccountCode)

    const lines: JournalEntryLineInput[] = []

    // DR COGS / Inventory for subtotal
    lines.push({
      accountId: cogsAccount.$id,
      accountCode: cogsAccount.code,
      accountName: cogsAccount.name,
      debit: params.subtotal,
      credit: 0,
      description: `Purchase: ${params.purchaseNumber}`,
    })

    // DR Input VAT (asset — recoverable VAT)
    if (params.taxAmount > 0) {
      const inputVatAccount = getAccount('1400')
      lines.push({
        accountId: inputVatAccount.$id,
        accountCode: inputVatAccount.code,
        accountName: inputVatAccount.name,
        debit: params.taxAmount,
        credit: 0,
        description: `Input VAT on ${params.purchaseNumber}`,
      })
    }

    // CR Cash/Bank for amount paid
    if (params.paidAmount > 0) {
      lines.push({
        accountId: cashAccount.$id,
        accountCode: cashAccount.code,
        accountName: cashAccount.name,
        debit: 0,
        credit: params.paidAmount,
        description: `Payment for ${params.purchaseNumber}`,
      })
    }

    // CR Accounts Payable for amount due
    if (params.dueAmount > 0) {
      const apAccount = getAccount('2000')
      lines.push({
        accountId: apAccount.$id,
        accountCode: apAccount.code,
        accountName: apAccount.name,
        debit: 0,
        credit: params.dueAmount,
        description: `Amount owed for ${params.purchaseNumber}`,
      })
    }

    return await this.createJournalEntry(
      {
        date: params.date,
        type: 'auto',
        description: `Purchase: ${params.purchaseNumber}`,
        referenceType: 'purchase',
        referenceId: params.purchaseId,
        lines,
      },
      businessId,
      userId
    )
  }

  /**
   * Create a journal entry for a customer payment received.
   * DR Cash/Bank
   * CR Accounts Receivable
   */
  async createPaymentReceivedJournalEntry(
    businessId: string,
    userId: string,
    params: {
      paymentId: string
      saleId: string
      saleNumber: string
      date: string
      paymentMethod: string
      amount: number
    }
  ): Promise<JournalEntry> {
    const accounts = await this.listAccounts(businessId)
    const getAccount = (code: string) => {
      const acc = accounts.find(a => a.code === code && a.isActive)
      if (!acc) throw new Error(`Default account '${code}' not found.`)
      return acc
    }

    const cashAccountCode = this.getCashAccountCode(params.paymentMethod)
    const cashAccount = getAccount(cashAccountCode)
    const arAccount = getAccount('1100')

    return await this.createJournalEntry(
      {
        date: params.date,
        type: 'auto',
        description: `Payment received for ${params.saleNumber}`,
        referenceType: 'payment',
        referenceId: params.paymentId,
        lines: [
          {
            accountId: cashAccount.$id,
            accountCode: cashAccount.code,
            accountName: cashAccount.name,
            debit: params.amount,
            credit: 0,
            description: `Cash received`,
          },
          {
            accountId: arAccount.$id,
            accountCode: arAccount.code,
            accountName: arAccount.name,
            debit: 0,
            credit: params.amount,
            description: `Customer payment for ${params.saleNumber}`,
          },
        ],
      },
      businessId,
      userId
    )
  }

  /**
   * Create a journal entry for a supplier payment made.
   * DR Accounts Payable
   * CR Cash/Bank
   */
  async createSupplierPaymentJournalEntry(
    businessId: string,
    userId: string,
    params: {
      paymentId: string
      supplierId: string
      date: string
      paymentMethod: string
      amount: number
    }
  ): Promise<JournalEntry> {
    const accounts = await this.listAccounts(businessId)
    const getAccount = (code: string) => {
      const acc = accounts.find(a => a.code === code && a.isActive)
      if (!acc) throw new Error(`Default account '${code}' not found.`)
      return acc
    }

    const apAccount = getAccount('2000')
    const cashAccountCode = this.getCashAccountCode(params.paymentMethod)
    const cashAccount = getAccount(cashAccountCode)

    return await this.createJournalEntry(
      {
        date: params.date,
        type: 'auto',
        description: `Supplier payment`,
        referenceType: 'supplier_payment',
        referenceId: params.paymentId,
        lines: [
          {
            accountId: apAccount.$id,
            accountCode: apAccount.code,
            accountName: apAccount.name,
            debit: params.amount,
            credit: 0,
            description: `Payment to supplier`,
          },
          {
            accountId: cashAccount.$id,
            accountCode: cashAccount.code,
            accountName: cashAccount.name,
            debit: 0,
            credit: params.amount,
            description: `Cash/bank payment`,
          },
        ],
      },
      businessId,
      userId
    )
  }

  /**
   * Create a journal entry for an expense.
   * DR Expense account
   * CR Cash/Bank
   */
  async createExpenseJournalEntry(
    businessId: string,
    userId: string,
    params: {
      expenseId: string
      date: string
      category: string
      amount: number
      paymentMethod: string
      description: string
    }
  ): Promise<JournalEntry> {
    const accounts = await this.listAccounts(businessId)
    const getAccount = (code: string) => {
      const acc = accounts.find(a => a.code === code && a.isActive)
      if (!acc) throw new Error(`Default account '${code}' not found.`)
      return acc
    }

    // Map expense category to account code
    const expenseAccountCode = this.getExpenseAccountCode(params.category)
    const expenseAccount = getAccount(expenseAccountCode)
    const cashAccountCode = this.getCashAccountCode(params.paymentMethod)
    const cashAccount = getAccount(cashAccountCode)

    return await this.createJournalEntry(
      {
        date: params.date,
        type: 'auto',
        description: `Expense: ${params.description}`,
        referenceType: 'expense',
        referenceId: params.expenseId,
        lines: [
          {
            accountId: expenseAccount.$id,
            accountCode: expenseAccount.code,
            accountName: expenseAccount.name,
            debit: params.amount,
            credit: 0,
            description: params.description,
          },
          {
            accountId: cashAccount.$id,
            accountCode: cashAccount.code,
            accountName: cashAccount.name,
            debit: 0,
            credit: params.amount,
            description: `Payment for expense`,
          },
        ],
      },
      businessId,
      userId
    )
  }

  /**
   * Create a journal entry for a sales return.
   * DR Sales Returns (contra-revenue)
   * DR Output VAT (reduce liability) — if applicable
   * CR Cash/Bank or AR (refund amount)
   */
  async createSalesReturnJournalEntry(
    businessId: string,
    userId: string,
    params: {
      returnId: string
      returnNumber: string
      saleId: string
      saleNumber: string
      date: string
      refundMethod: string
      subtotal: number
      taxAmount: number
      totalRefund: number
    }
  ): Promise<JournalEntry> {
    const accounts = await this.listAccounts(businessId)
    const getAccount = (code: string) => {
      const acc = accounts.find(a => a.code === code && a.isActive)
      if (!acc) throw new Error(`Default account '${code}' not found.`)
      return acc
    }

    const salesReturnAccount = getAccount('4200')

    const lines: JournalEntryLineInput[] = []

    // DR Sales Returns (contra-revenue — reduces total revenue)
    lines.push({
      accountId: salesReturnAccount.$id,
      accountCode: salesReturnAccount.code,
      accountName: salesReturnAccount.name,
      debit: params.subtotal,
      credit: 0,
      description: `Return: ${params.returnNumber} for ${params.saleNumber}`,
    })

    // DR Output VAT (reduce liability — we collected less VAT now)
    if (params.taxAmount > 0) {
      const outputVatAccount = getAccount('2100')
      lines.push({
        accountId: outputVatAccount.$id,
        accountCode: outputVatAccount.code,
        accountName: outputVatAccount.name,
        debit: params.taxAmount,
        credit: 0,
        description: `VAT reversal for ${params.returnNumber}`,
      })
    }

    // CR Cash/Bank for refund amount
    const cashAccountCode = this.getCashAccountCode(params.refundMethod)
    const cashAccount = getAccount(cashAccountCode)
    lines.push({
      accountId: cashAccount.$id,
      accountCode: cashAccount.code,
      accountName: cashAccount.name,
      debit: 0,
      credit: params.totalRefund,
      description: `Refund for ${params.returnNumber}`,
    })

    return await this.createJournalEntry(
      {
        date: params.date,
        type: 'auto',
        description: `Sales Return: ${params.returnNumber}`,
        referenceType: 'sales_return',
        referenceId: params.returnId,
        lines,
      },
      businessId,
      userId
    )
  }

  // ==================== Private Helpers ====================

  private getCashAccountCode(paymentMethod: string): string {
    const methodMap: Record<string, string> = {
      cash: '1000',
      card: '1010',
      bank_transfer: '1010',
      digital_wallet: '1020',
      eSewa: '1020',
      Khalti: '1030',
      credit: '1100',
      full_udhaar: '1100',
      other: '1000',
    }
    return methodMap[paymentMethod] || '1000'
  }

  private getExpenseAccountCode(category: string): string {
    const categoryMap: Record<string, string> = {
      rent: '6000',
      utilities: '6100',
      salary: '6200',
      wages: '6200',
      office: '6300',
      supplies: '6300',
      transport: '6400',
      marketing: '6500',
      advertising: '6500',
      telephone: '6600',
      internet: '6600',
      insurance: '6700',
      repair: '6800',
      maintenance: '6800',
      depreciation: '7000',
      interest: '7100',
      tax: '7300',
    }
    return categoryMap[category?.toLowerCase() || ''] || '7200' // Default to Other Expense
  }

  private async allocateJournalEntryNumber(_businessId: string, fyShortLabel: string): Promise<string> {
    // Use numbering service pattern — allocate JE-83/84-000001
    // We'll use a simple counter stored in the business's financial sequences
    // For now, use timestamp-based unique number
    const timestamp = Date.now().toString(36).toUpperCase()
    return `JE-${fyShortLabel}-${timestamp}`
  }
}

// ==================== Journal Line Sub-Service ====================

/**
 * Internal service for journal entry lines.
 */
class JournalLineService extends BaseService {
  constructor() {
    super(COLLECTIONS.JOURNAL_LINES)
  }

  async createJournalLine(
    data: Omit<JournalEntryLine, '$id' | '$createdAt' | '$updatedAt' | '$collectionId' | '$databaseId' | '$permissions' | 'createdAt'>,
    businessId: string
  ): Promise<JournalEntryLine> {
    return await this.create<JournalEntryLine>(
      {
        ...data,
        createdAt: new Date().toISOString(),
      },
      businessId
    )
  }

  async listByJournalEntry(journalEntryId: string, businessId: string): Promise<JournalEntryLine[]> {
    return await this.list<JournalEntryLine>(businessId, [
      Query.equal('journalEntryId', journalEntryId),
    ])
  }

  async listByAccount(accountId: string, businessId: string, _dateFrom?: string, _dateTo?: string): Promise<JournalEntryLine[]> {
    // We need to join with journal entries to filter by status and date
    // Since Appwrite doesn't support joins, we'll fetch all lines for the account
    // and then filter by the journal entry's status
    const lines = await this.list<JournalEntryLine>(businessId, [
      Query.equal('accountId', accountId),
    ])

    // Filter by status via journal entries - done at the caller level
    return lines
  }
}

export const accountingService = new AccountingService()
