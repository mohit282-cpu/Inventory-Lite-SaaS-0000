import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { DebitNote } from '@/types'
import { Query } from 'appwrite'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { numberingService } from './numbering.service'
import { supplierService } from './supplier.service'

export interface CreateDebitNoteInput {
  purchaseId?: string
  supplierId?: string
  supplierName?: string
  reason: string
  taxableAmount: number
  vatAmount?: number
  adjustSupplierBalance?: boolean
}

export class DebitNoteService extends BaseService {
  constructor() {
    super(COLLECTIONS.DEBIT_NOTES)
  }

  async listDebitNotes(businessId: string, queryParams?: { dateFrom?: string; dateTo?: string }): Promise<DebitNote[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]
    if (queryParams?.dateFrom) {
      queries.push(Query.greaterThanEqual('issuedDate', queryParams.dateFrom))
    }
    if (queryParams?.dateTo) {
      queries.push(Query.lessThanEqual('issuedDate', queryParams.dateTo))
    }
    return await this.listAll<DebitNote>(businessId, queries)
  }

  async createDebitNote(
    data: CreateDebitNoteInput,
    businessId: string,
    userId: string
  ): Promise<DebitNote> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    if (!data.reason || data.reason.trim() === '') {
      throw new Error('Debit Note reason is required')
    }

    if (typeof data.taxableAmount !== 'number' || data.taxableAmount <= 0) {
      throw new Error('Taxable amount must be a positive number greater than zero')
    }

    const vatAmount = typeof data.vatAmount === 'number' && data.vatAmount >= 0 ? data.vatAmount : data.taxableAmount * 0.13
    const totalAmount = data.taxableAmount + vatAmount
    const debitNoteNumber = await numberingService.getNextDebitNoteNumber(businessId)
    const nowIso = new Date().toISOString()

    const payload = {
      debitNoteNumber,
      purchaseId: data.purchaseId || '',
      supplierId: data.supplierId || '',
      supplierName: data.supplierName || '',
      reason: data.reason.trim(),
      taxableAmount: data.taxableAmount,
      vatAmount,
      totalAmount,
      issuedDate: nowIso,
      createdBy: userId,
    }

    const debitNote = await this.create<DebitNote>(payload, businessId, userId)

    // Adjust supplier payable balance if specified and supplier exists
    if (data.adjustSupplierBalance && data.supplierId) {
      try {
        const supplier = await supplierService.getSupplier(data.supplierId, businessId)
        if (supplier && supplier.outstandingPayable > 0) {
          const newPayable = Math.max(0, supplier.outstandingPayable - totalAmount)
          await supplierService.updateSupplier(data.supplierId, { outstandingPayable: newPayable }, businessId, userId)
        }
      } catch (err) {
        console.warn(`[DebitNoteService] Could not adjust balance for supplier ${data.supplierId}:`, err)
      }
    }

    return debitNote
  }
}

export const debitNoteService = new DebitNoteService()
