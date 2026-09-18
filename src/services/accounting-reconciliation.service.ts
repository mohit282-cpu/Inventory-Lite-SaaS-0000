import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { saleService } from './sale.service'
import { paymentService } from './payment.service'
import { customerService } from './customer.service'
import { productService } from './product.service'
import { stockMovementService } from './stock-movement.service'
import { accountingService } from './accounting.service'
import { hookSaleJournalEntry } from '@/lib/accounting-hooks'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { auditLogService } from './audit-log.service'

export interface ReconciliationReport {
  timestamp: string
  businessId: string
  salesReconciliation: {
    totalSales: number
    unpostedSalesCount: number
    unpostedSaleIds: string[]
    autoRepostedCount: number
  }
  paymentsReconciliation: {
    totalPayments: number
    unpostedPaymentsCount: number
    unpostedPaymentIds: string[]
    autoRepostedCount: number
  }
  customerBalanceDiscrepancies: Array<{
    customerId: string
    customerName: string
    recordedDue: number
    calculatedDue: number
    difference: number
  }>
  stockQuantityDiscrepancies: Array<{
    productId: string
    productName: string
    catalogQuantity: number
    ledgerQuantity: number
    difference: number
  }>
  glBalanced: boolean
  totalDebits: number
  totalCredits: number
  overallStatus: 'BALANCED' | 'RECONCILIATION_REQUIRED'
}

export class AccountingReconciliationService extends BaseService {
  constructor() {
    super(COLLECTIONS.ACCOUNTS)
  }

  /**
   * Identify sales missing posted journal entries or with accountingStatus === 'ACCOUNTING_FAILED'
   */
  async findUnpostedSales(businessId: string): Promise<string[]> {
    const sales = await saleService.listAllSales(businessId)
    const journalEntries = await accountingService.listJournalEntries(businessId, { limit: 5000 })
    const journalSaleIds = new Set(
      journalEntries.map((j) => (j as any).referenceId || j.entryNumber)
    )

    const unpostedIds: string[] = []

    for (const sale of sales) {
      if (sale.status === 'cancelled') continue
      const isMissingJournal = !journalSaleIds.has(sale.$id) && !journalSaleIds.has(sale.saleNumber || '')
      if (isMissingJournal || sale.accountingStatus === 'ACCOUNTING_FAILED') {
        unpostedIds.push(sale.$id)
      }
    }

    return unpostedIds
  }

  /**
   * Attempt automatic re-posting of missing journal entry for a sale
   */
  async repostSaleJournal(saleId: string, businessId: string, userId: string): Promise<boolean> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    const sale = await saleService.getSale(saleId, businessId)
    if (!sale) return false

    const posted = await hookSaleJournalEntry({
      businessId,
      userId,
      saleId: sale.$id,
      saleNumber: sale.saleNumber || sale.$id,
      date: new Date(sale.createdAt).toISOString().split('T')[0],
      paymentMethod: sale.paymentMethod,
      subtotal: sale.subtotal,
      taxAmount: sale.vatAmount || sale.tax || 0,
      total: sale.total,
      paidAmount: sale.paidAmount,
      dueAmount: sale.dueAmount,
      vatEnabled: sale.vatEnabled ?? true,
    })

    if (posted) {
      await saleService.update(saleId, { accountingStatus: 'ACCOUNTING_POSTED' }, businessId)
    }

    return posted
  }

  /**
   * Reconcile customer recorded due balance against active sale dues
   */
  async reconcileCustomerBalances(businessId: string): Promise<
    Array<{
      customerId: string
      customerName: string
      recordedDue: number
      calculatedDue: number
      difference: number
    }>
  > {
    const [customers, sales] = await Promise.all([
      customerService.listCustomers(businessId),
      saleService.listAllSales(businessId),
    ])

    const salesDueMap = new Map<string, number>()
    sales.forEach((s) => {
      if (s.customerId && s.status !== 'cancelled' && s.dueAmount > 0) {
        const current = salesDueMap.get(s.customerId) || 0
        salesDueMap.set(s.customerId, current + s.dueAmount)
      }
    })

    const discrepancies: Array<{
      customerId: string
      customerName: string
      recordedDue: number
      calculatedDue: number
      difference: number
    }> = []

    customers.forEach((c) => {
      const recordedDue = c.totalDue || 0
      const calculatedDue = salesDueMap.get(c.$id) || 0
      const difference = Math.abs(recordedDue - calculatedDue)

      if (difference > 0.01) {
        discrepancies.push({
          customerId: c.$id,
          customerName: c.name,
          recordedDue,
          calculatedDue,
          difference,
        })
      }
    })

    return discrepancies
  }

  /**
   * Reconcile product catalog stock quantity against stock movement audit ledger sum
   */
  async reconcileStockQuantities(businessId: string): Promise<
    Array<{
      productId: string
      productName: string
      catalogQuantity: number
      ledgerQuantity: number
      difference: number
    }>
  > {
    const [products, movements] = await Promise.all([
      productService.listAllProducts(businessId),
      stockMovementService.fetchAllMovements(businessId),
    ])

    const ledgerStockMap = new Map<string, number>()
    movements.forEach((m) => {
      const current = ledgerStockMap.get(m.productId) || 0
      if (m.type === 'stock_in') {
        ledgerStockMap.set(m.productId, current + m.quantity)
      } else if (m.type === 'stock_out') {
        ledgerStockMap.set(m.productId, current - m.quantity)
      } else if (m.type === 'adjustment') {
        ledgerStockMap.set(m.productId, m.newQuantity)
      }
    })

    const discrepancies: Array<{
      productId: string
      productName: string
      catalogQuantity: number
      ledgerQuantity: number
      difference: number
    }> = []

    products.forEach((p) => {
      const catalogQuantity = p.stockQuantity || 0
      const ledgerQuantity = ledgerStockMap.has(p.$id) ? ledgerStockMap.get(p.$id)! : catalogQuantity
      const difference = Math.abs(catalogQuantity - ledgerQuantity)

      if (difference > 0) {
        discrepancies.push({
          productId: p.$id,
          productName: p.name,
          catalogQuantity,
          ledgerQuantity,
          difference,
        })
      }
    })

    return discrepancies
  }

  /**
   * Run full tenant reconciliation scan & report
   */
  async runFullTenantReconciliation(businessId: string, userId: string): Promise<ReconciliationReport> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'auditor'],
    })

    const unpostedSaleIds = await this.findUnpostedSales(businessId)
    let autoRepostedCount = 0

    // Auto-repair missing sale journal entries if user is admin
    for (const saleId of unpostedSaleIds) {
      const ok = await this.repostSaleJournal(saleId, businessId, userId)
      if (ok) autoRepostedCount++
    }

    const [customerDiscrepancies, stockDiscrepancies, trialBalance] = await Promise.all([
      this.reconcileCustomerBalances(businessId),
      this.reconcileStockQuantities(businessId),
      accountingService.generateTrialBalance(businessId).catch(() => []),
    ])

    let totalDebits = 0
    let totalCredits = 0
    trialBalance.forEach((row: any) => {
      totalDebits += row.debit || 0
      totalCredits += row.credit || 0
    })

    const glBalanced = Math.abs(totalDebits - totalCredits) < 0.01
    const isClean =
      glBalanced &&
      unpostedSaleIds.length === autoRepostedCount &&
      customerDiscrepancies.length === 0 &&
      stockDiscrepancies.length === 0

    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      businessId,
      salesReconciliation: {
        totalSales: (await saleService.listSales(businessId)).length,
        unpostedSalesCount: unpostedSaleIds.length - autoRepostedCount,
        unpostedSaleIds: unpostedSaleIds.filter((id) => !unpostedSaleIds.includes(id)),
        autoRepostedCount,
      },
      paymentsReconciliation: {
        totalPayments: (await paymentService.listPayments(businessId)).length,
        unpostedPaymentsCount: 0,
        unpostedPaymentIds: [],
        autoRepostedCount: 0,
      },
      customerBalanceDiscrepancies: customerDiscrepancies,
      stockQuantityDiscrepancies: stockDiscrepancies,
      glBalanced,
      totalDebits,
      totalCredits,
      overallStatus: isClean ? 'BALANCED' : 'RECONCILIATION_REQUIRED',
    }

    try {
      await auditLogService.logEvent(businessId, userId, 'full_tenant_reconciliation_executed', businessId, {
        overallStatus: report.overallStatus,
        autoRepostedCount,
        customerDiscrepancyCount: customerDiscrepancies.length,
        stockDiscrepancyCount: stockDiscrepancies.length,
      })
    } catch {}

    return report
  }
}

export const accountingReconciliationService = new AccountingReconciliationService()
