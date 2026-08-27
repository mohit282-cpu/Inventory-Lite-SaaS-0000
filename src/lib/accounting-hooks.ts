/**
 * Accounting Hook Helper
 * 
 * Lightweight wrapper to attach journal entries to existing transactions.
 * All hooks are wrapped in try-catch so accounting failures never break
 * the main transaction flow. This is intentional — accounting is critical
 * but non-blocking for POS operations.
 */
import { accountingService } from '@/services/accounting.service'
import { taxEngineService } from '@/services/tax-engine.service'
import { auditLogService } from '@/services/audit-log.service'

export interface SaleAccountingHookParams {
  businessId: string
  userId: string
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

export interface PurchaseAccountingHookParams {
  businessId: string
  userId: string
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

export interface PaymentAccountingHookParams {
  businessId: string
  userId: string
  paymentId: string
  saleId: string
  saleNumber: string
  date: string
  paymentMethod: string
  amount: number
}

export interface SupplierPaymentAccountingHookParams {
  businessId: string
  userId: string
  paymentId: string
  supplierId: string
  date: string
  paymentMethod: string
  amount: number
}

export interface ExpenseAccountingHookParams {
  businessId: string
  userId: string
  expenseId: string
  date: string
  category: string
  amount: number
  paymentMethod: string
  description: string
}

export interface SalesReturnAccountingHookParams {
  businessId: string
  userId: string
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

/**
 * Hook: Create journal entry after a sale is completed.
 * Non-blocking — failures are logged but do not affect the sale.
 */
export async function hookSaleJournalEntry(params: SaleAccountingHookParams): Promise<void> {
  try {
    const entry = await accountingService.createSaleJournalEntry(
      params.businessId,
      params.userId,
      params
    )
    await accountingService.postJournalEntry(entry.$id, params.businessId)

    // Record tax transaction
    if (params.vatEnabled && params.taxAmount > 0) {
      const defaultRate = await taxEngineService.getDefaultTaxRate(params.businessId, 'output_vat')
      if (defaultRate) {
        await taxEngineService.recordTaxTransaction(
          {
            taxRateId: defaultRate.$id,
            taxRateName: defaultRate.name,
            taxRateValue: defaultRate.rate,
            taxType: 'output_vat',
            referenceType: 'sale',
            referenceId: params.saleId,
            taxableAmount: params.subtotal,
            taxAmount: params.taxAmount,
          },
          params.businessId
        )
      }
    }

    await auditLogService.logEvent(params.businessId, params.userId, 'journal_entry_created', entry.$id, {
      entityType: 'sale',
      entityId: params.saleId,
      entryNumber: entry.entryNumber,
    })
  } catch (err: any) {
    console.warn(`[AccountingHook] Failed to create journal entry for sale ${params.saleNumber}:`, err?.message)
  }
}

/**
 * Hook: Create journal entry after a purchase is completed.
 */
export async function hookPurchaseJournalEntry(params: PurchaseAccountingHookParams): Promise<void> {
  try {
    const entry = await accountingService.createPurchaseJournalEntry(
      params.businessId,
      params.userId,
      params
    )
    await accountingService.postJournalEntry(entry.$id, params.businessId)

    // Record input VAT
    if (params.taxAmount > 0) {
      const defaultRate = await taxEngineService.getDefaultTaxRate(params.businessId, 'input_vat')
      if (defaultRate) {
        await taxEngineService.recordTaxTransaction(
          {
            taxRateId: defaultRate.$id,
            taxRateName: defaultRate.name,
            taxRateValue: defaultRate.rate,
            taxType: 'input_vat',
            referenceType: 'purchase',
            referenceId: params.purchaseId,
            taxableAmount: params.subtotal,
            taxAmount: params.taxAmount,
          },
          params.businessId
        )
      }
    }

    await auditLogService.logEvent(params.businessId, params.userId, 'journal_entry_created', entry.$id, {
      entityType: 'purchase',
      entityId: params.purchaseId,
      entryNumber: entry.entryNumber,
    })
  } catch (err: any) {
    console.warn(`[AccountingHook] Failed to create journal entry for purchase ${params.purchaseNumber}:`, err?.message)
  }
}

/**
 * Hook: Create journal entry after a customer payment is received.
 */
export async function hookPaymentReceivedJournalEntry(params: PaymentAccountingHookParams): Promise<void> {
  try {
    const entry = await accountingService.createPaymentReceivedJournalEntry(
      params.businessId,
      params.userId,
      params
    )
    await accountingService.postJournalEntry(entry.$id, params.businessId)

    await auditLogService.logEvent(params.businessId, params.userId, 'journal_entry_created', entry.$id, {
      entityType: 'payment',
      entityId: params.paymentId,
      entryNumber: entry.entryNumber,
    })
  } catch (err: any) {
    console.warn(`[AccountingHook] Failed to create journal entry for payment ${params.paymentId}:`, err?.message)
  }
}

/**
 * Hook: Create journal entry after a supplier payment is made.
 */
export async function hookSupplierPaymentJournalEntry(params: SupplierPaymentAccountingHookParams): Promise<void> {
  try {
    const entry = await accountingService.createSupplierPaymentJournalEntry(
      params.businessId,
      params.userId,
      params
    )
    await accountingService.postJournalEntry(entry.$id, params.businessId)

    await auditLogService.logEvent(params.businessId, params.userId, 'journal_entry_created', entry.$id, {
      entityType: 'supplier_payment',
      entityId: params.paymentId,
      entryNumber: entry.entryNumber,
    })
  } catch (err: any) {
    console.warn(`[AccountingHook] Failed to create journal entry for supplier payment ${params.paymentId}:`, err?.message)
  }
}

/**
 * Hook: Create journal entry after an expense is recorded.
 */
export async function hookExpenseJournalEntry(params: ExpenseAccountingHookParams): Promise<void> {
  try {
    const entry = await accountingService.createExpenseJournalEntry(
      params.businessId,
      params.userId,
      params
    )
    await accountingService.postJournalEntry(entry.$id, params.businessId)

    await auditLogService.logEvent(params.businessId, params.userId, 'journal_entry_created', entry.$id, {
      entityType: 'expense',
      entityId: params.expenseId,
      entryNumber: entry.entryNumber,
    })
  } catch (err: any) {
    console.warn(`[AccountingHook] Failed to create journal entry for expense ${params.expenseId}:`, err?.message)
  }
}

/**
 * Hook: Create journal entry after a sales return is processed.
 */
export async function hookSalesReturnJournalEntry(params: SalesReturnAccountingHookParams): Promise<void> {
  try {
    const entry = await accountingService.createSalesReturnJournalEntry(
      params.businessId,
      params.userId,
      params
    )
    await accountingService.postJournalEntry(entry.$id, params.businessId)

    await auditLogService.logEvent(params.businessId, params.userId, 'journal_entry_created', entry.$id, {
      entityType: 'sales_return',
      entityId: params.returnId,
      entryNumber: entry.entryNumber,
    })
  } catch (err: any) {
    console.warn(`[AccountingHook] Failed to create journal entry for sales return ${params.returnNumber}:`, err?.message)
  }
}
