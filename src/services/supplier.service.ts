import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Supplier, SupplierStatus } from '@/types'
import { Query } from 'appwrite'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { toMinorUnits, fromMinorUnits } from '@/lib/money'
import { auditLogService } from './audit-log.service'

export interface SupplierLedgerEntry {
  id: string
  date: string
  type: 'PURCHASE' | 'PAYMENT'
  reference: string
  description: string
  debit: number // Increases payable (Purchase)
  credit: number // Decreases payable (Payment)
  runningBalance: number
}

export class SupplierService extends BaseService {
  constructor() {
    super(COLLECTIONS.SUPPLIERS)
  }

  /**
   * Create a new supplier for a business
   */
  async createSupplier(
    data: {
      name: string
      phone?: string
      email?: string
      address?: string
      panVatNumber?: string
      notes?: string
    },
    businessId: string,
    userId: string
  ): Promise<Supplier> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    if (!data.name || data.name.trim() === '') {
      throw new Error('Supplier name is required')
    }

    if (data.phone && data.phone.trim() !== '') {
      const existing = await this.getSupplierByPhone(businessId, data.phone.trim())
      if (existing) {
        throw new Error(`Supplier with phone number "${data.phone}" already exists`)
      }
    }

    const supplierData = {
      name: data.name.trim(),
      phone: data.phone?.trim() || '',
      email: data.email?.trim() || '',
      address: data.address?.trim() || '',
      panVatNumber: data.panVatNumber?.trim() || '',
      notes: data.notes?.trim() || '',
      status: 'active' as SupplierStatus,
      totalPurchases: 0,
      totalPaid: 0,
      outstandingPayable: 0,
      createdBy: userId,
    }

    const supplier = await this.create<Supplier>(supplierData, businessId, userId)

    try {
      await auditLogService.logEvent(businessId, userId, 'supplier_created', supplier.$id, {
        name: supplier.name,
      })
    } catch {}

    return supplier
  }

  /**
   * Get supplier by ID with tenant isolation verification
   */
  async getSupplier(supplierId: string, businessId: string): Promise<Supplier> {
    return await this.getById<Supplier>(supplierId, businessId)
  }

  /**
   * List suppliers for a business with optional search and status filter
   */
  async listSuppliers(
    businessId: string,
    filters?: {
      searchTerm?: string
      status?: SupplierStatus | 'all'
      limit?: number
    }
  ): Promise<Supplier[]> {
    const limit = filters?.limit || 200
    const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

    if (filters?.searchTerm && filters.searchTerm.trim() !== '') {
      queries.push(Query.search('name', filters.searchTerm.trim()))
    }

    if (filters?.status && filters.status !== 'all') {
      queries.push(Query.equal('status', filters.status))
    }

    return await this.list<Supplier>(businessId, queries)
  }

  /**
   * List ALL suppliers for a business without limit (for selectors/reports)
   */
  async listAllSuppliers(businessId: string): Promise<Supplier[]> {
    return await this.listAll<Supplier>(businessId, [Query.orderDesc('createdAt')])
  }

  /**
   * Update supplier details
   */
  async updateSupplier(
    supplierId: string,
    data: Partial<{
      name: string
      phone: string
      email: string
      address: string
      panVatNumber: string
      notes: string
      status: SupplierStatus
    }>,
    businessId: string,
    userId: string
  ): Promise<Supplier> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    const existing = await this.getSupplier(supplierId, businessId)

    if (data.phone && data.phone.trim() !== '') {
      const match = await this.getSupplierByPhone(businessId, data.phone.trim())
      if (match && match.$id !== supplierId) {
        throw new Error(`Supplier with phone number "${data.phone}" already exists`)
      }
    }

    const updated = await this.update<Supplier>(supplierId, data, businessId)

    try {
      await auditLogService.logEvent(businessId, userId, 'supplier_updated', supplierId, {
        previousName: existing.name,
        updatedName: updated.name,
      })
    } catch {}

    return updated
  }

  /**
   * Archive supplier (Soft delete). Permanent deletion is prohibited for suppliers with transactions.
   */
  async archiveSupplier(supplierId: string, businessId: string, userId: string): Promise<Supplier> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    const updated = await this.update<Supplier>(supplierId, { status: 'archived' }, businessId)

    try {
      await auditLogService.logEvent(businessId, userId, 'supplier_archived', supplierId, {
        name: updated.name,
      })
    } catch {}

    return updated
  }

  /**
   * Override delete to prevent hard deleting suppliers with financial history
   */
  async deleteSupplier(supplierId: string, businessId: string, userId: string): Promise<boolean> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    const supplier = await this.getSupplier(supplierId, businessId)
    if (supplier.totalPurchases > 0 || supplier.totalPaid > 0 || supplier.outstandingPayable > 0) {
      throw new Error('Forbidden: Suppliers with historical financial transactions cannot be deleted. Use Archive instead.')
    }

    return await this.delete(supplierId, businessId)
  }

  /**
   * Helper: Find supplier by phone number within business
   */
  async getSupplierByPhone(businessId: string, phone: string): Promise<Supplier | null> {
    const results = await this.list<Supplier>(businessId, [Query.equal('phone', phone), Query.limit(1)])
    return results.length > 0 ? results[0] : null
  }

  /**
   * Update supplier balances (totalPurchases, totalPaid, outstandingPayable)
   */
  async updateBalances(
    supplierId: string,
    purchasesDelta: number,
    paidDelta: number,
    businessId: string
  ): Promise<Supplier> {
    const supplier = await this.getSupplier(supplierId, businessId)

    const totalPurchasesP = Math.max(0, toMinorUnits(supplier.totalPurchases || 0) + toMinorUnits(purchasesDelta))
    const totalPaidP = Math.max(0, toMinorUnits(supplier.totalPaid || 0) + toMinorUnits(paidDelta))
    const outstandingP = Math.max(0, totalPurchasesP - totalPaidP)

    return await this.update<Supplier>(
      supplierId,
      {
        totalPurchases: fromMinorUnits(totalPurchasesP),
        totalPaid: fromMinorUnits(totalPaidP),
        outstandingPayable: fromMinorUnits(outstandingP),
      },
      businessId
    )
  }

  /**
   * Get supplier transaction ledger history
   */
  async getSupplierLedger(supplierId: string, businessId: string): Promise<SupplierLedgerEntry[]> {
    const supplier = await this.getSupplier(supplierId, businessId)
    if (!supplier) throw new Error('Supplier not found')

    let purchases: any[] = []
    let payments: any[] = []

    try {
      const { purchaseService } = await import('./purchase.service')
      purchases = await purchaseService.listPurchases(businessId, { supplierId })
    } catch {}

    try {
      const { supplierPaymentService } = await import('./supplier-payment.service')
      payments = await supplierPaymentService.listSupplierPayments(businessId, { supplierId })
    } catch {}

    const entries: Array<{
      id: string
      date: string
      type: 'PURCHASE' | 'PAYMENT'
      reference: string
      description: string
      debit: number
      credit: number
    }> = []

    for (const p of purchases) {
      if (p.status === 'cancelled') continue
      entries.push({
        id: p.$id,
        date: p.purchaseDate || p.createdAt,
        type: 'PURCHASE',
        reference: p.purchaseNumber || `PUR-${p.$id.slice(-6)}`,
        description: `Purchase intake (Bill: ${p.supplierInvoiceNumber || 'N/A'})`,
        debit: p.total || 0,
        credit: 0,
      })
    }

    for (const pay of payments) {
      entries.push({
        id: pay.$id,
        date: pay.paymentDate || pay.createdAt,
        type: 'PAYMENT',
        reference: pay.referenceNumber || `PAY-${pay.$id.slice(-6)}`,
        description: `Supplier payment (${pay.paymentMethod || 'cash'}) ${pay.notes ? `- ${pay.notes}` : ''}`,
        debit: 0,
        credit: pay.amount || 0,
      })
    }

    // Sort chronologically ascending to calculate running balance
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let runningP = 0
    const ledger: SupplierLedgerEntry[] = entries.map((entry) => {
      const debitP = toMinorUnits(entry.debit)
      const creditP = toMinorUnits(entry.credit)
      runningP = runningP + debitP - creditP

      return {
        ...entry,
        runningBalance: fromMinorUnits(runningP),
      }
    })

    return ledger
  }
}

export const supplierService = new SupplierService()
