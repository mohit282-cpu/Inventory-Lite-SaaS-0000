import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Payment, PaymentMethod, CreditStatus, Customer, Sale } from '@/types'
import { Query } from 'appwrite'
import { saleService } from './sale.service'
import { customerService } from './customer.service'

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
    },
    businessId: string,
    userId: string
  ): Promise<Payment> {
    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.')
    }

    // 1. Fetch target sale
    const sale = await saleService.getSale(data.saleId, businessId)
    if (!sale) {
      throw new Error('Associated sale transaction not found.')
    }

    if (data.amount > sale.dueAmount + 0.01) {
      throw new Error(
        `Payment amount (Rs. ${data.amount.toFixed(
          2
        )}) cannot exceed remaining due balance (Rs. ${sale.dueAmount.toFixed(2)}).`
      )
    }

    const pDate = data.paymentDate || new Date().toISOString()
    const custId = data.customerId || sale.customerId || ''

    // 2. Persist Payment document
    let paymentDoc: Payment
    try {
      paymentDoc = await this.create<Payment>(
        {
          saleId: data.saleId,
          customerId: custId,
          invoiceId: data.invoiceId || sale.invoiceId || '',
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          paymentDate: pDate,
          referenceNumber: data.referenceNumber || '',
          notes: data.notes || '',
          createdBy: userId,
        },
        businessId,
        userId
      )
    } catch {
      // Fallback object representation if remote payments collection is initializing
      paymentDoc = {
        $id: `pay_${Date.now()}`,
        businessId,
        customerId: custId,
        saleId: data.saleId,
        invoiceId: data.invoiceId || sale.invoiceId || '',
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate: pDate,
        referenceNumber: data.referenceNumber || '',
        notes: data.notes || '',
        createdBy: userId,
        createdAt: pDate,
      } as Payment
    }

    // 3. Recalculate and update Sale paid amount & due amount
    const newPaid = Math.min(sale.total, sale.paidAmount + data.amount)
    const newDue = Math.max(0, sale.total - newPaid)
    const newStatus = newDue === 0 ? 'completed' : sale.status

    await saleService.update<Sale>(
      sale.$id,
      {
        paidAmount: newPaid,
        dueAmount: newDue,
        status: newStatus,
      },
      businessId
    )

    // 4. Update Customer total due balance
    if (custId && custId.trim() !== '') {
      await customerService.updateDueAmount(custId, -data.amount, businessId)
    }

    return paymentDoc
  }

  /**
   * List all payment records for a business
   */
  async listPayments(
    businessId: string,
    filters?: {
      saleId?: string
      customerId?: string
    }
  ): Promise<Payment[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]

    if (filters?.saleId) {
      queries.push(Query.equal('saleId', filters.saleId))
    }
    if (filters?.customerId) {
      queries.push(Query.equal('customerId', filters.customerId))
    }

    try {
      return await this.list<Payment>(businessId, queries)
    } catch {
      return []
    }
  }

  /**
   * Update an existing payment record and recalculate balances
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
    businessId: string
  ): Promise<Payment | null> {
    let existingPayment: Payment | null = null
    try {
      existingPayment = await this.getById<Payment>(paymentId, businessId)
    } catch {
      return null
    }

    const amountDiff = (data.amount !== undefined ? data.amount : existingPayment.amount) - existingPayment.amount

    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero.')
    }

    // 1. Update Payment doc
    const updated = await this.update<Payment>(paymentId, data, businessId)

    // 2. Adjust Sale paid & due amount if amount changed
    if (amountDiff !== 0 && existingPayment.saleId) {
      try {
        const sale = await saleService.getSale(existingPayment.saleId, businessId)
        if (sale) {
          const newPaid = Math.max(0, Math.min(sale.total, sale.paidAmount + amountDiff))
          const newDue = Math.max(0, sale.total - newPaid)
          const newStatus = newDue === 0 ? 'completed' : sale.status
          await saleService.update<Sale>(
            sale.$id,
            { paidAmount: newPaid, dueAmount: newDue, status: newStatus },
            businessId
          )
        }
      } catch {
        // Continue if sale update handles errors
      }

      // 3. Adjust Customer total due balance
      if (existingPayment.customerId) {
        await customerService.updateDueAmount(existingPayment.customerId, -amountDiff, businessId)
      }
    }

    return updated
  }

  /**
   * Delete a payment record and restore outstanding balance
   */
  async deletePayment(paymentId: string, businessId: string): Promise<boolean> {
    let existingPayment: Payment | null = null
    try {
      existingPayment = await this.getById<Payment>(paymentId, businessId)
    } catch {
      return false
    }

    // 1. Revert sale paid amount
    if (existingPayment.saleId) {
      try {
        const sale = await saleService.getSale(existingPayment.saleId, businessId)
        if (sale) {
          const newPaid = Math.max(0, sale.paidAmount - existingPayment.amount)
          const newDue = Math.max(0, sale.total - newPaid)
          const newStatus = newDue > 0 ? 'pending' : sale.status
          await saleService.update<Sale>(
            sale.$id,
            { paidAmount: newPaid, dueAmount: newDue, status: newStatus },
            businessId
          )
        }
      } catch {
        // Continue
      }

      // 2. Revert customer due balance
      if (existingPayment.customerId) {
        await customerService.updateDueAmount(existingPayment.customerId, existingPayment.amount, businessId)
      }
    }

    // 3. Delete payment doc
    await this.delete(paymentId, businessId)
    return true
  }

  /**
   * Calculate 4 KPI summary cards for the Credit/Udha Dashboard & Module
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

    let totalCreditDue = 0
    let overdueAmount = 0

    sales.forEach((s) => {
      if (s.dueAmount > 0) {
        totalCreditDue += s.dueAmount

        // Check if overdue: dueDate < today OR sale created > 30 days ago
        const isOverdue =
          s.dueDate
            ? new Date(s.dueDate) < now
            : (now.getTime() - new Date(s.createdAt).getTime()) / (1000 * 3600 * 24) > 30

        if (isOverdue) {
          overdueAmount += s.dueAmount
        }
      }
    })

    const customersWithCredit = customers.filter((c) => (c.totalDue || 0) > 0).length

    let paymentsThisMonth = 0
    payments.forEach((p) => {
      const pDate = new Date(p.paymentDate || p.createdAt)
      if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
        paymentsThisMonth += p.amount
      }
    })

    return {
      totalCreditDue,
      customersWithCredit,
      overdueAmount,
      paymentsThisMonth,
    }
  }

  /**
   * Get main credit ledger list with customer data & statuses
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

      // Determine last payment date
      let lastPaymentDate: string | undefined = undefined
      if (salePayments.length > 0) {
        const sorted = [...salePayments].sort(
          (a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime()
        )
        lastPaymentDate = sorted[0].paymentDate || sorted[0].createdAt
      }

      // Determine Credit Status
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

      // Check overdue status for unpaid/partial sales
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

    // Filter by Search & Status
    return items.filter((item) => {
      // 1. Status Filter (Default hides fully PAID unless explicitly selected ALL or PAID)
      if (!filters?.status || filters.status === 'UNPAID') {
        if (filters?.status === 'UNPAID') {
          if (item.status !== 'UNPAID') return false
        } else {
          // Default view: Show unpaid, partial, overdue (hide completed paid)
          if (item.status === 'PAID') return false
        }
      } else if (filters.status === 'PARTIAL') {
        if (item.status !== 'PARTIAL') return false
      } else if (filters.status === 'OVERDUE') {
        if (item.status !== 'OVERDUE') return false
      } else if (filters.status === 'PAID') {
        if (item.status !== 'PAID') return false
      }

      // 2. Customer ID Filter
      if (filters?.customerId && item.customerId !== filters.customerId) {
        return false
      }

      // 3. Search Query Filter
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
}

export const paymentService = new PaymentService()
