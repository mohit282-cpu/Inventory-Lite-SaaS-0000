import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { CreditNote } from '@/types'
import { Query } from 'appwrite'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { numberingService } from './numbering.service'
import { customerService } from './customer.service'

export interface CreateCreditNoteInput {
  saleId?: string
  invoiceId?: string
  invoiceNumber?: string
  customerId?: string
  customerName?: string
  reason: string
  taxableAmount: number
  vatAmount?: number
  adjustCustomerDue?: boolean
}

export class CreditNoteService extends BaseService {
  constructor() {
    super(COLLECTIONS.CREDIT_NOTES)
  }

  async listCreditNotes(businessId: string, queryParams?: { dateFrom?: string; dateTo?: string }): Promise<CreditNote[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]
    if (queryParams?.dateFrom) {
      queries.push(Query.greaterThanEqual('issuedDate', queryParams.dateFrom))
    }
    if (queryParams?.dateTo) {
      queries.push(Query.lessThanEqual('issuedDate', queryParams.dateTo))
    }
    return await this.listAll<CreditNote>(businessId, queries)
  }

  async createCreditNote(
    data: CreateCreditNoteInput,
    businessId: string,
    userId: string
  ): Promise<CreditNote> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    if (!data.reason || data.reason.trim() === '') {
      throw new Error('Credit Note reason is required')
    }

    if (typeof data.taxableAmount !== 'number' || data.taxableAmount <= 0) {
      throw new Error('Taxable amount must be a positive number greater than zero')
    }

    const vatAmount = typeof data.vatAmount === 'number' && data.vatAmount >= 0 ? data.vatAmount : data.taxableAmount * 0.13
    const totalAmount = data.taxableAmount + vatAmount
    const creditNoteNumber = await numberingService.getNextCreditNoteNumber(businessId)
    const nowIso = new Date().toISOString()

    const payload = {
      creditNoteNumber,
      saleId: data.saleId || '',
      invoiceId: data.invoiceId || '',
      invoiceNumber: data.invoiceNumber || '',
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      reason: data.reason.trim(),
      taxableAmount: data.taxableAmount,
      vatAmount,
      totalAmount,
      issuedDate: nowIso,
      createdBy: userId,
    }

    const creditNote = await this.create<CreditNote>(payload, businessId, userId)

    // Adjust customer credit/due balance if specified and customer exists
    if (data.adjustCustomerDue && data.customerId) {
      try {
        const customer = await customerService.getCustomer(data.customerId, businessId)
        if (customer && customer.totalDue > 0) {
          const newDue = Math.max(0, customer.totalDue - totalAmount)
          await customerService.updateCustomer(data.customerId, { totalDue: newDue }, businessId)
        }
      } catch (err) {
        console.warn(`[CreditNoteService] Could not adjust due for customer ${data.customerId}:`, err)
      }
    }

    return creditNote
  }
}

export const creditNoteService = new CreditNoteService()
