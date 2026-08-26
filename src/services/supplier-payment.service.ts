import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { SupplierPayment, PaymentMethod, Purchase } from '@/types'
import { Query } from 'appwrite'
import { supplierService } from './supplier.service'
import { purchaseService } from './purchase.service'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { toMinorUnits, fromMinorUnits } from '@/lib/money'
import { auditLogService } from './audit-log.service'
import { idempotencyManager } from '@/lib/idempotency'

export class SupplierPaymentService extends BaseService {
  constructor() {
    super(COLLECTIONS.SUPPLIER_PAYMENTS)
  }

  /**
   * Record a payment to a supplier
   */
  async createSupplierPayment(
    data: {
      supplierId: string
      purchaseId?: string
      amount: number
      paymentMethod: PaymentMethod
      paymentDate?: string
      referenceNumber?: string
      notes?: string
      idempotencyKey?: string
    },
    businessId: string,
    userId: string
  ): Promise<SupplierPayment> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    if (typeof data.amount !== 'number' || isNaN(data.amount) || !isFinite(data.amount) || data.amount <= 0) {
      throw new Error('Payment amount must be a positive number greater than zero')
    }

    const supplier = await supplierService.getSupplier(data.supplierId, businessId)
    if (!supplier) {
      throw new Error('Supplier record not found')
    }

    const persistentCheck = async (): Promise<SupplierPayment | null> => {
      if (!data.idempotencyKey) return null
      const existingPayments = await this.listSupplierPayments(businessId, { supplierId: data.supplierId })
      const match = existingPayments.find(
        (p) => p.referenceNumber === data.idempotencyKey || p.notes?.includes(data.idempotencyKey!)
      )
      return match || null
    }

    return await idempotencyManager.executeIdempotentTransaction(
      {
        idempotencyKey: data.idempotencyKey,
        businessId,
        operationType: 'create_supplier_payment',
        payload: data,
        resourceType: 'supplier_payment',
      },
      persistentCheck,
      async () => {
        const paymentPaisa = toMinorUnits(data.amount)
        const pDate = data.paymentDate || new Date().toISOString()

        const paymentDoc = await this.create<SupplierPayment>(
          {
            supplierId: data.supplierId,
            purchaseId: data.purchaseId || '',
            amount: fromMinorUnits(paymentPaisa),
            paymentMethod: data.paymentMethod,
            paymentDate: pDate,
            referenceNumber: data.referenceNumber || data.idempotencyKey || '',
            notes: data.notes || '',
            createdBy: userId,
          },
          businessId,
          userId
        )

// Update Supplier balances
// Allocate payment to outstanding purchases for the supplier
let remainingPaisa = paymentPaisa;
let purchases: any[] = [];
if (data.purchaseId) {
  const single = await purchaseService.getPurchase(data.purchaseId, businessId);
  if (single) purchases = [single];
} else {
  purchases = await purchaseService.listOutstandingPurchases(businessId, data.supplierId);
}
for (const purchase of purchases) {
  if (remainingPaisa <= 0) break;
  const duePaisa = toMinorUnits(purchase.dueAmount || 0);
  if (duePaisa <= 0) continue;
  const allocatePaisa = Math.min(remainingPaisa, duePaisa);
  await purchaseService.applySupplierPayment(purchase.$id, allocatePaisa, businessId, userId);
  remainingPaisa -= allocatePaisa;
}
// Update supplier balances: totalPaid increased, totalPurchases unchanged
await supplierService.updateBalances(data.supplierId, 0, fromMinorUnits(paymentPaisa), businessId)

        try {
          await auditLogService.logEvent(businessId, userId, 'supplier_payment_created', paymentDoc.$id, {
            supplierId: data.supplierId,
            supplierName: supplier.name,
            amount: paymentDoc.amount,
          })
        } catch { }

        return paymentDoc
      }
    )
  }

  /**
   * List supplier payments
   */
  async listSupplierPayments(
    businessId: string,
    filters?: {
      supplierId?: string
      purchaseId?: string
      limit?: number
    }
  ): Promise<SupplierPayment[]> {
    const limit = filters?.limit || 200
    const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

    if (filters?.supplierId) {
      queries.push(Query.equal('supplierId', filters.supplierId))
    }

    if (filters?.purchaseId) {
      queries.push(Query.equal('purchaseId', filters.purchaseId))
    }

    return await this.list<SupplierPayment>(businessId, queries)
  }
}

export const supplierPaymentService = new SupplierPaymentService()
