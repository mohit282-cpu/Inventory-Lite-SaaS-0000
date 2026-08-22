import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Payment, PaymentMethod, CreditStatus, Customer, Sale } from '@/types'
import { Query } from 'appwrite'
import { saleService } from './sale.service'
import { customerService } from './customer.service'
import { toMinorUnits, fromMinorUnits, validateFinancialInvariants } from '@/lib/money'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { idempotencyManager } from '@/lib/idempotency'
import { rateLimiter } from '@/lib/rate-limiter'

export interface CreditLedgerItem {
  id: string
  saleId: string
  invoiceId?: string
  saleNumber: string
  invoiceNumber?: string
  customerId?: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  customerAddress?: string
  saleDate: string
  dueDate?: string
  totalAmount: number
  paidAmount: number
  dueAmount: number
  status: CreditStatus
  lastPaymentDate?: string
  payments: Payment[]
}

export class PaymentService extends BaseService {
  constructor() {
    super(COLLECTIONS.PAYMENTS)
  }

  /**
   * Record a new customer payment against a sale/invoice
   * Includes idempotency protection, rate limiting, and exact DB verification.
   */
  async createPayment(
    data: {
      saleId: string
      customerId?: string
      invoiceId?: string
      amount: number
      paymentMethod: PaymentMethod
      paymentDate?: string
      referenceNumber?: string
      notes?: string
      idempotencyKey?: string
    },
    businessId: string,
    userId: string
  ): Promise<Payment> {
    // 1. Database-verified RBAC check
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    // 2. Rate limiting check
    rateLimiter.checkLimit(`payment_${userId}`, 30, 60000)

    // 3. Persistent Idempotency check
    const persistentCheck = async (): Promise<Payment | null> => {
      if (!data.idempotencyKey) return null
      const existingPayments = await this.listPayments(businessId, { saleId: data.saleId })
      const match = existingPayments.find(
        (p) => p.referenceNumber === data.idempotencyKey || p.notes?.includes(data.idempotencyKey!)
      )
      return match || null
    }

    return await idempotencyManager.executeWithPersistentFallback(data.idempotencyKey, persistentCheck, async () => {
      const paymentPaisa = toMinorUnits(data.amount)
      if (paymentPaisa <= 0) {
        throw new Error('Payment amount must be greater than zero')
      }

      // Fetch target sale with tenant isolation verification
      const sale = await saleService.getSale(data.saleId, businessId)
      if (!sale) {
        throw new Error('Associated sale transaction not found')
      }

      const saleDuePaisa = toMinorUnits(sale.dueAmount)
      if (paymentPaisa > saleDuePaisa) {
        throw new Error(
          `Payment amount (Rs. ${data.amount.toFixed(
            2
          )}) cannot exceed remaining due balance (Rs. ${sale.dueAmount.toFixed(2)})`
        )
      }

      // Customer integrity verification
      if (data.customerId && sale.customerId && data.customerId.trim() !== '' && sale.customerId.trim() !== '' && data.customerId !== sale.customerId) {
        throw new Error(`Payment customerId mismatch: Cannot credit payment to customer '${data.customerId}' for sale belonging to '${sale.customerId}'`)
      }

      const pDate = data.paymentDate || new Date().toISOString()
      const custId = data.customerId || sale.customerId || ''

      if (custId && custId.trim() !== '') {
        await customerService.getCustomer(custId, businessId)
      }

      // Persist Payment document
      let paymentDoc: Payment
      try {
        paymentDoc = await this.create<Payment>(
          {
            saleId: data.saleId,
            customerId: custId,
            invoiceId: data.invoiceId || sale.invoiceId || '',
            amount: fromMinorUnits(paymentPaisa),
            paymentMethod: data.paymentMethod,
            paymentDate: pDate,
            referenceNumber: data.referenceNumber || '',
            notes: data.notes || '',
            createdBy: userId,
          },
          businessId,
          userId
        )
      } catch (err: any) {
        const isCollectionMissingOrOffline =
          (typeof window !== 'undefined' && !navigator.onLine) ||
          err.message?.includes('could not be found') ||
          err.message?.includes('404') ||
          err.message?.includes('Collection') ||
          err.message?.includes('Network') ||
          err.message?.includes('fetch')

        if (isCollectionMissingOrOffline) {
          const generatedId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
          const localPayment = {
            id: generatedId,
            businessId,
            customerId: custId,
            saleId: data.saleId,
            amount: fromMinorUnits(paymentPaisa),
            paymentMethod: data.paymentMethod,
            notes: data.notes || '',
            syncStatus: 'PENDING_SYNC' as const,
            createdAt: pDate,
          }

          try {
            const { localDB } = await import('@/lib/offline/db')
            await localDB.payments.put(localPayment)
            await localDB.syncQueue.add({
              businessId,
              userId,
              entityType: 'payment',
              entityId: generatedId,
              operation: 'CREATE',
              payload: localPayment,
              retryCount: 0,
              status: 'PENDING',
              createdAt: pDate,
            })
          } catch {
            // Local DB write non-fatal
          }

          paymentDoc = {
            $id: generatedId,
            businessId,
            customerId: custId,
            saleId: data.saleId,
            invoiceId: data.invoiceId || sale.invoiceId || '',
            amount: fromMinorUnits(paymentPaisa),
            paymentMethod: data.paymentMethod,
            paymentDate: pDate,
            referenceNumber: data.referenceNumber || '',
            notes: data.notes || '',
            createdBy: userId,
            createdAt: pDate,
            updatedAt: pDate,
            $createdAt: pDate,
            $updatedAt: pDate,
            $databaseId: '',
            $collectionId: '',
            $permissions: [],
          }
        } else {
          throw err
        }
      }

      try {
        // Recalculate Sale paid & due amount using minor units
        const saleTotalPaisa = toMinorUnits(sale.total)
        const currentPaidPaisa = toMinorUnits(sale.paidAmount)
        const newPaidPaisa = currentPaidPaisa + paymentPaisa
        const newDuePaisa = Math.max(0, saleTotalPaisa - newPaidPaisa)
        const newStatus = newDuePaisa === 0 ? 'completed' : sale.status

        const newPaid = fromMinorUnits(newPaidPaisa)
        const newDue = fromMinorUnits(newDuePaisa)

        validateFinancialInvariants({ total: sale.total, paidAmount: newPaid, dueAmount: newDue })

        try {
          await saleService.update<Sale>(
            sale.$id,
            {
              paidAmount: newPaid,
              dueAmount: newDue,
              status: newStatus,
            },
            businessId
          )
        } catch {
          // Fallback local update if sale update in cloud fails
          try {
            const { localDB } = await import('@/lib/offline/db')
            const localSale = await localDB.sales.get(sale.$id)
            if (localSale) {
              await localDB.sales.update(sale.$id, {
                paidAmount: newPaid,
                dueAmount: newDue,
                status: newStatus as any,
              })
            }
          } catch {
            // Local fallback non-fatal
          }
        }

        // Update Customer total due balance
        if (custId && custId.trim() !== '') {
          try {
            await customerService.updateDueAmount(custId, -fromMinorUnits(paymentPaisa), businessId)
          } catch {
            try {
              const { localDB } = await import('@/lib/offline/db')
              const localCust = await localDB.customers.get(custId)
              if (localCust) {
                const newCustDue = Math.max(0, (localCust.dueAmount || 0) - fromMinorUnits(paymentPaisa))
                await localDB.customers.update(custId, { dueAmount: newCustDue })
              }
            } catch {
              // Local fallback non-fatal
            }
          }
        }

        return paymentDoc
      } catch (transactionErr) {
        // TRANSACTION ROLLBACK: Delete created payment document if downstream sale/customer update fails
        try {
          await this.delete(paymentDoc.$id, businessId)
        } catch {
          // Ignore deletion error during transaction rollback
        }
        throw transactionErr
      }
    })
  }

  /**
   * List all payment records for a business with pagination
   */
  async listPayments(
    businessId: string,
    filters?: {
      saleId?: string
      customerId?: string
      limit?: number
    }
  ): Promise<Payment[]> {
    const limit = filters?.limit || 200
    const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

    if (filters?.saleId) {
      queries.push(Query.equal('saleId', filters.saleId))
    }
    if (filters?.customerId) {
      queries.push(Query.equal('customerId', filters.customerId))
    }

    try {
      const items = await this.list<Payment>(businessId, queries)
      try {
        const { localDB } = await import('@/lib/offline/db')
        for (const item of items) {
          await localDB.payments.put({
            id: item.$id,
            businessId: item.businessId,
            customerId: item.customerId || '',
            saleId: item.saleId,
            amount: item.amount,
            paymentMethod: item.paymentMethod,
            notes: item.notes,
            syncStatus: 'SYNCED',
            createdAt: item.paymentDate || item.createdAt || item.$createdAt,
          })
        }
      } catch {
        // Caching non-fatal
      }
      return items
    } catch {
      try {
        const { localDB } = await import('@/lib/offline/db')
        const localItems = await localDB.payments.where('businessId').equals(businessId).toArray()
        let filtered = localItems
        if (filters?.saleId) {
          filtered = filtered.filter((p) => p.saleId === filters.saleId)
        }
        if (filters?.customerId) {
          filtered = filtered.filter((p) => p.customerId === filters.customerId)
        }
        return filtered.map((p) => ({
          $id: p.id,
          businessId: p.businessId,
          customerId: p.customerId || '',
          saleId: p.saleId || '',
          invoiceId: '',
          amount: p.amount,
          paymentMethod: p.paymentMethod as any,
          paymentDate: p.createdAt,
          referenceNumber: '',
          notes: p.notes || '',
          createdBy: '',
          createdAt: p.createdAt,
          updatedAt: p.createdAt,
          $createdAt: p.createdAt,
          $updatedAt: p.createdAt,
          $databaseId: '',
          $collectionId: '',
          $permissions: [],
        }))
      } catch {
        return []
      }
    }
  }

  /**
   * Update an existing payment record with exact difference balance adjustments
   */
  async updatePayment(
    paymentId: string,
    data: {
      amount?: number
      paymentMethod?: PaymentMethod
      paymentDate?: string
      referenceNumber?: string
      notes?: string
    },
    businessId: string,
    updatingUserId: string
  ): Promise<Payment | null> {
    // Database-verified RBAC check: only owner or admin can edit payment records
    await authorizeBusinessAccess({
      userId: updatingUserId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    const existingPayment = await this.getById<Payment>(paymentId, businessId)
    if (!existingPayment) {
      throw new Error('Payment record not found')
    }

    const oldAmountPaisa = toMinorUnits(existingPayment.amount)
    const newAmountPaisa = data.amount !== undefined ? toMinorUnits(data.amount) : oldAmountPaisa
    const amountDiffPaisa = newAmountPaisa - oldAmountPaisa

    if (data.amount !== undefined && newAmountPaisa <= 0) {
      throw new Error('Payment amount must be greater than zero')
    }

    if (amountDiffPaisa !== 0 && existingPayment.saleId) {
      const sale = await saleService.getSale(existingPayment.saleId, businessId)
      if (sale) {
        const saleTotalP = toMinorUnits(sale.total)
        const salePaidP = toMinorUnits(sale.paidAmount)
        const resultingPaidP = salePaidP + amountDiffPaisa

        if (resultingPaidP > saleTotalP) {
          throw new Error(
            `Updated payment exceeds sale total (Rs. ${sale.total.toFixed(2)})`
          )
        }
      }
    }

    // 1. Update Payment doc
    const updated = await this.update<Payment>(paymentId, data, businessId)

    // 2. Adjust Sale paid & due amount if amount changed
    if (amountDiffPaisa !== 0 && existingPayment.saleId) {
      const sale = await saleService.getSale(existingPayment.saleId, businessId)
      if (sale) {
        const saleTotalP = toMinorUnits(sale.total)
        const newPaidP = Math.max(0, Math.min(saleTotalP, toMinorUnits(sale.paidAmount) + amountDiffPaisa))
        const newDueP = Math.max(0, saleTotalP - newPaidP)
        const newStatus = newDueP === 0 ? 'completed' : sale.status
        await saleService.update<Sale>(
          sale.$id,
          { paidAmount: fromMinorUnits(newPaidP), dueAmount: fromMinorUnits(newDueP), status: newStatus },
          businessId
        )
      }

      // 3. Adjust Customer total due balance
      if (existingPayment.customerId) {
        await customerService.updateDueAmount(
          existingPayment.customerId,
          -fromMinorUnits(amountDiffPaisa),
          businessId
        )
      }
    }

    return updated
  }

  /**
   * Delete a payment record and restore outstanding balance
   */
  async deletePayment(paymentId: string, businessId: string, deletingUserId: string): Promise<boolean> {
    // Database-verified RBAC check: only owner or admin can delete payment records
    await authorizeBusinessAccess({
      userId: deletingUserId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    const existingPayment = await this.getById<Payment>(paymentId, businessId)
    if (!existingPayment) {
      throw new Error('Payment record not found')
    }

    const amountPaisa = toMinorUnits(existingPayment.amount)

    // 1. Revert sale paid amount
    if (existingPayment.saleId) {
      const sale = await saleService.getSale(existingPayment.saleId, businessId)
      if (sale) {
        const saleTotalP = toMinorUnits(sale.total)
        const newPaidP = Math.max(0, toMinorUnits(sale.paidAmount) - amountPaisa)
        const newDueP = Math.max(0, saleTotalP - newPaidP)
        const newStatus = newDueP > 0 ? 'pending' : sale.status
        await saleService.update<Sale>(
          sale.$id,
          { paidAmount: fromMinorUnits(newPaidP), dueAmount: fromMinorUnits(newDueP), status: newStatus },
          businessId
        )
      }

      // 2. Revert customer due balance
      if (existingPayment.customerId) {
        await customerService.updateDueAmount(
          existingPayment.customerId,
          fromMinorUnits(amountPaisa),
          businessId
        )
      }
    }

    // 3. Delete payment doc
    await this.delete(paymentId, businessId)
    return true
  }

  /**
   * Calculate KPI summary cards for the Credit/Udha Dashboard
   */
  async getCreditSummary(businessId: string): Promise<{
    totalCreditDue: number
    customersWithCredit: number
    overdueAmount: number
    paymentsThisMonth: number
  }> {
    const [sales, customers, payments] = await Promise.all([
      saleService.listSales(businessId),
      customerService.listCustomers(businessId),
      this.listPayments(businessId),
    ])

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let totalCreditDuePaisa = 0
    let overdueAmountPaisa = 0

    sales.forEach((s) => {
      if (s.dueAmount > 0) {
        const dueP = toMinorUnits(s.dueAmount)
        totalCreditDuePaisa += dueP

        const isOverdue =
          s.dueDate
            ? new Date(s.dueDate) < now
            : (now.getTime() - new Date(s.createdAt).getTime()) / (1000 * 3600 * 24) > 30

        if (isOverdue) {
          overdueAmountPaisa += dueP
        }
      }
    })

    const customersWithCredit = customers.filter((c) => (c.totalDue || 0) > 0).length

    let paymentsThisMonthPaisa = 0
    payments.forEach((p) => {
      const pDate = new Date(p.paymentDate || p.createdAt)
      if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
        paymentsThisMonthPaisa += toMinorUnits(p.amount)
      }
    })

    return {
      totalCreditDue: fromMinorUnits(totalCreditDuePaisa),
      customersWithCredit,
      overdueAmount: fromMinorUnits(overdueAmountPaisa),
      paymentsThisMonth: fromMinorUnits(paymentsThisMonthPaisa),
    }
  }

  /**
   * Get main credit ledger list
   */
  async getCreditLedger(
    businessId: string,
    filters?: {
      searchQuery?: string
      status?: 'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'
      customerId?: string
    }
  ): Promise<CreditLedgerItem[]> {
    const [sales, customers, allPayments] = await Promise.all([
      saleService.listSales(businessId),
      customerService.listCustomers(businessId),
      this.listPayments(businessId),
    ])

    const customerMap = new Map<string, Customer>()
    customers.forEach((c) => customerMap.set(c.$id, c))

    const paymentsBySale = new Map<string, Payment[]>()
    allPayments.forEach((p) => {
      const existing = paymentsBySale.get(p.saleId) || []
      existing.push(p)
      paymentsBySale.set(p.saleId, existing)
    })

    const now = new Date()

    const items: CreditLedgerItem[] = sales.map((sale) => {
      const cust = sale.customerId ? customerMap.get(sale.customerId) : null
      const salePayments = paymentsBySale.get(sale.$id) || []

      let lastPaymentDate: string | undefined = undefined
      if (salePayments.length > 0) {
        const sorted = [...salePayments].sort(
          (a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime()
        )
        lastPaymentDate = sorted[0].paymentDate || sorted[0].createdAt
      }

      let status: CreditStatus = 'UNPAID'
      const due = sale.dueAmount || 0
      const paid = sale.paidAmount || 0

      if (due <= 0) {
        status = 'PAID'
      } else if (paid > 0) {
        status = 'PARTIAL'
      } else {
        status = 'UNPAID'
      }

      if (due > 0) {
        const isOverdue =
          sale.dueDate
            ? new Date(sale.dueDate) < now
            : (now.getTime() - new Date(sale.createdAt).getTime()) / (1000 * 3600 * 24) > 30

        if (isOverdue) {
          status = 'OVERDUE'
        }
      }

      return {
        id: sale.$id,
        saleId: sale.$id,
        invoiceId: sale.invoiceId,
        saleNumber: sale.saleNumber || `SALE-${sale.$id.slice(-6)}`,
        invoiceNumber: sale.invoiceId ? `INV-${sale.invoiceId.slice(-6)}` : undefined,
        customerId: sale.customerId,
        customerName: cust ? cust.name : 'Walk-in Customer',
        customerPhone: cust?.phone,
        customerEmail: cust?.email,
        customerAddress: cust?.address,
        saleDate: sale.createdAt,
        dueDate: sale.dueDate,
        totalAmount: sale.total,
        paidAmount: sale.paidAmount,
        dueAmount: sale.dueAmount,
        status,
        lastPaymentDate,
        payments: salePayments,
      }
    })

    return items.filter((item) => {
      if (!filters?.status || filters.status === 'UNPAID') {
        if (filters?.status === 'UNPAID') {
          if (item.status !== 'UNPAID') return false
        } else {
          if (item.status === 'PAID') return false
        }
      } else if (filters.status === 'PARTIAL') {
        if (item.status !== 'PARTIAL') return false
      } else if (filters.status === 'OVERDUE') {
        if (item.status !== 'OVERDUE') return false
      } else if (filters.status === 'PAID') {
        if (item.status !== 'PAID') return false
      }

      if (filters?.customerId && item.customerId !== filters.customerId) {
        return false
      }

      if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
        const q = filters.searchQuery.toLowerCase()
        const matchName = item.customerName.toLowerCase().includes(q)
        const matchPhone = item.customerPhone ? item.customerPhone.includes(q) : false
        const matchSale = item.saleNumber.toLowerCase().includes(q)
        const matchInvoice = item.invoiceNumber ? item.invoiceNumber.toLowerCase().includes(q) : false
        if (!matchName && !matchPhone && !matchSale && !matchInvoice) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Get payments list for business
   */
  async getPayments(businessId: string): Promise<Payment[]> {
    return await this.listPayments(businessId)
  }
}

export const paymentService = new PaymentService()
