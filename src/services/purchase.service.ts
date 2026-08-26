import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Purchase, PurchaseItem, PurchaseStatus, PaymentMethod } from '@/types'
import { Query } from 'appwrite'
import { supplierService } from './supplier.service'
import { productService } from './product.service'
import { stockMovementService } from './stock-movement.service'
import { numberingService } from './numbering.service'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { toMinorUnits, fromMinorUnits } from '@/lib/money'
import { auditLogService } from './audit-log.service'
import { idempotencyManager } from '@/lib/idempotency'

export class PurchaseItemService extends BaseService {
  constructor() {
    super(COLLECTIONS.PURCHASE_ITEMS)
  }

  async listPurchaseItems(purchaseId: string, businessId: string): Promise<PurchaseItem[]> {
    return await this.list<PurchaseItem>(businessId, [Query.equal('purchaseId', purchaseId)])
  }
}

export const purchaseItemService = new PurchaseItemService()

export class PurchaseService extends BaseService {
  constructor() {
    super(COLLECTIONS.PURCHASES)
  }

  /**
   * Allocate sequential purchase number: PUR-83/84-000001
   */
  async generateNextPurchaseNumber(businessId: string, dateInput?: string | Date): Promise<string> {
    const allocated = await numberingService.allocateNextNumber(businessId, 'PURCHASE', dateInput)
    return allocated.formattedNumber
  }

  /**
   * Create a Purchase transaction and intake inventory stock
   */
  async createPurchase(
    data: {
      supplierId: string
      supplierInvoiceNumber?: string
      purchaseDate?: string
      items: Array<{
        productId: string
        quantity: number
        purchasePrice: number
        discount?: number
        tax?: number
      }>
      discount?: number
      tax?: number
      paidAmount: number
      paymentMethod: PaymentMethod
      notes?: string
      idempotencyKey?: string
    },
    businessId: string,
    userId: string
  ): Promise<{ purchase: Purchase; items: PurchaseItem[] }> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error('Purchase must include at least one product item')
    }

    const supplier = await supplierService.getSupplier(data.supplierId, businessId)
    if (!supplier) {
      throw new Error('Supplier record not found')
    }

    const persistentCheck = async (): Promise<{ purchase: Purchase; items: PurchaseItem[] } | null> => {
      if (!data.idempotencyKey) return null
      const existingPurchases = await this.listPurchases(businessId, { supplierId: data.supplierId })
      const match = existingPurchases.find((p) => p.notes?.includes(data.idempotencyKey!))
      if (match) {
        const items = await purchaseItemService.listPurchaseItems(match.$id, businessId)
        return { purchase: match, items }
      }
      return null
    }

    return await idempotencyManager.executeIdempotentTransaction(
      {
        idempotencyKey: data.idempotencyKey,
        businessId,
        operationType: 'create_purchase',
        payload: data,
        resourceType: 'purchase',
      },
      persistentCheck,
      async () => {
        let grossSubtotalP = 0
        const validatedItems: Array<{
          productId: string
          quantity: number
          purchasePrice: number
          discount: number
          tax: number
          lineTotal: number
          productName: string
        }> = []

        // Validate products & calculate line totals
        for (const item of data.items) {
          if (typeof item.quantity !== 'number' || isNaN(item.quantity) || !isFinite(item.quantity) || item.quantity <= 0) {
            throw new Error('Purchase item quantity must be a positive number greater than zero')
          }
          if (typeof item.purchasePrice !== 'number' || isNaN(item.purchasePrice) || !isFinite(item.purchasePrice) || item.purchasePrice < 0) {
            throw new Error('Purchase price cannot be negative')
          }

          const product = await productService.getProduct(item.productId, businessId)
          if (!product) {
            throw new Error(`Product not found: ${item.productId}`)
          }

          const lineDiscount = item.discount || 0
          const lineTax = item.tax || 0
          const lineSubtotalP = toMinorUnits(item.quantity * item.purchasePrice)
          const lineDiscP = toMinorUnits(lineDiscount)
          const lineTaxP = toMinorUnits(lineTax)
          const lineTotalP = Math.max(0, lineSubtotalP - lineDiscP + lineTaxP)

          grossSubtotalP += lineSubtotalP

          validatedItems.push({
            productId: item.productId,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            discount: lineDiscount,
            tax: lineTax,
            lineTotal: fromMinorUnits(lineTotalP),
            productName: product.name,
          })
        }

        const overallDiscountP = toMinorUnits(data.discount || 0)
        const overallTaxP = toMinorUnits(data.tax || 0)
        const totalP = Math.max(0, grossSubtotalP - overallDiscountP + overallTaxP)
        const paidP = toMinorUnits(data.paidAmount || 0)
        const dueP = Math.max(0, totalP - paidP)
        const actualPaidP = Math.min(paidP, totalP)

        const purchaseNumber = await this.generateNextPurchaseNumber(businessId, data.purchaseDate)
        const pDate = data.purchaseDate || new Date().toISOString()
        const status: PurchaseStatus = dueP > 0 ? 'pending' : 'completed'

        const purchaseData = {
          supplierId: data.supplierId,
          purchaseNumber,
          supplierInvoiceNumber: data.supplierInvoiceNumber || '',
          purchaseDate: pDate,
          subtotal: fromMinorUnits(grossSubtotalP),
          discount: fromMinorUnits(overallDiscountP),
          tax: fromMinorUnits(overallTaxP),
          total: fromMinorUnits(totalP),
          paidAmount: fromMinorUnits(actualPaidP),
          dueAmount: fromMinorUnits(dueP),
          paymentMethod: data.paymentMethod,
          status,
          notes: `${data.notes || ''} ${data.idempotencyKey ? `[Key: ${data.idempotencyKey}]` : ''}`.trim(),
          createdBy: userId,
        }

        const purchase = await this.create<Purchase>(purchaseData, businessId, userId)

        // Create PurchaseItem documents & process Stock In
        const createdItems: PurchaseItem[] = []
        for (const item of validatedItems) {
          const itemDocData = {
            purchaseId: purchase.$id,
            productId: item.productId,
            productNameSnapshot: item.productName,
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            discount: item.discount,
            tax: item.tax,
            total: item.lineTotal,
          }

          const itemDoc = await purchaseItemService.create<PurchaseItem>(itemDocData, businessId, userId)
          createdItems.push(itemDoc)

          // 1. Process Stock IN movement
          await stockMovementService.processStockIn(
            item.productId,
            item.quantity,
            businessId,
            userId,
            `Purchase Intake #${purchase.purchaseNumber}`,
            purchase.$id
          )

          // 2. Recalculate Weighted Average Cost (WAC) & update product catalog cost
          try {
            await productService.recordPurchaseIntakeWAC(
              item.productId,
              item.quantity,
              item.purchasePrice,
              businessId
            )
          } catch (wacErr) {
            console.error('[PurchaseService] Failed to update WAC:', wacErr)
          }
        }

        // Update supplier balance
        await supplierService.updateBalances(
          data.supplierId,
          fromMinorUnits(totalP),
          fromMinorUnits(actualPaidP),
          businessId
        )

        try {
          await auditLogService.logEvent(businessId, userId, 'purchase_created', purchase.$id, {
            purchaseNumber: purchase.purchaseNumber,
            supplierId: data.supplierId,
            total: purchase.total,
            paidAmount: purchase.paidAmount,
          })
        } catch { }

        return { purchase, items: createdItems }
      }
    )
  }

  /**
   * Get purchase by ID
   */
  async getPurchase(purchaseId: string, businessId: string): Promise<Purchase> {
    return await this.getById<Purchase>(purchaseId, businessId)
  }

  /**
   * List purchases for a business with optional filters
   */
  async listPurchases(
    businessId: string,
    filters?: {
      supplierId?: string
      status?: PurchaseStatus
      limit?: number
    }
  ): Promise<Purchase[]> {
    const limit = filters?.limit || 200
    const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

    if (filters?.supplierId) {
      queries.push(Query.equal('supplierId', filters.supplierId))
    }

    if (filters?.status) {
      queries.push(Query.equal('status', filters.status))
    }

    return await this.list<Purchase>(businessId, queries)
  }

  /**
   * List ALL purchases for a business within a date range (for reporting)
   */
  async listAllPurchases(
    businessId: string,
    filters?: {
      dateFrom?: string
      dateTo?: string
      supplierId?: string
    }
  ): Promise<Purchase[]> {
    const queries: any[] = [Query.orderDesc('createdAt')]

    if (filters?.dateFrom) {
      queries.push(Query.greaterThanEqual('purchaseDate', filters.dateFrom))
    }

    if (filters?.dateTo) {
      queries.push(Query.lessThanEqual('purchaseDate', filters.dateTo))
    }

    if (filters?.supplierId) {
      queries.push(Query.equal('supplierId', filters.supplierId))
    }

    return await this.listAll<Purchase>(businessId, queries)
  }

  /**
   * Cancel a purchase transaction
   */
  async cancelPurchase(purchaseId: string, businessId: string, userId: string, reason?: string): Promise<boolean> {
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin'],
    })

    const purchase = await this.getPurchase(purchaseId, businessId)
    if (!purchase) {
      throw new Error('Purchase record not found')
    }

    if (purchase.status === 'cancelled') {
      throw new Error('Purchase is already cancelled')
    }

    const items = await purchaseItemService.listPurchaseItems(purchaseId, businessId)

    // 1. Reverse stock
    for (const item of items) {
      try {
        await stockMovementService.processStockOut(
          item.productId,
          item.quantity,
          businessId,
          userId,
          `Purchase Cancellation: #${purchase.purchaseNumber || purchase.$id}`,
          purchase.$id
        )
      } catch (err) {
        console.error('Failed to deduct stock on purchase cancellation:', err)
      }
    }

    // 2. Reverse supplier balances
    try {
      await supplierService.updateBalances(
        purchase.supplierId,
        -purchase.total,
        -purchase.paidAmount,
        businessId
      )
    } catch (err) {
      console.error('Failed to update supplier balances on purchase cancellation:', err)
    }

    // 3. Mark purchase status as cancelled
    await this.update<Purchase>(
      purchaseId,
      {
        status: 'cancelled',
        dueAmount: 0,
        notes: `${purchase.notes || ''} [CANCELLED by ${userId}: ${reason || 'Manual cancellation'}]`.trim(),
      },
      businessId
    )

    try {
      await auditLogService.logEvent(businessId, userId, 'purchase_cancelled', purchaseId, {
        purchaseNumber: purchase.purchaseNumber,
        supplierId: purchase.supplierId,
        reason: reason || 'Manual cancellation',
      })
    } catch { }

    return true
  }
  /**
   * Apply a supplier payment amount to a purchase.
   * Adjust `paidAmount`, `dueAmount` and `status`.
   */
  async applySupplierPayment(
    purchaseId: string,
    amountPaisa: number, // amount in minor units
    businessId: string,
    userId: string
  ): Promise<void> {
    // Fetch the purchase
    const purchase = await this.getPurchase(purchaseId, businessId);
    if (!purchase) {
      throw new Error('Purchase record not found');
    }

    const currentPaidPaisa = toMinorUnits(purchase.paidAmount ?? 0);
    const duePaisa = toMinorUnits(purchase.dueAmount ?? 0);
    if (duePaisa <= 0) {
      // Nothing to allocate
      return;
    }
    const allocatePaisa = Math.min(amountPaisa, duePaisa);
    const newPaidPaisa = currentPaidPaisa + allocatePaisa;
    const newDuePaisa = duePaisa - allocatePaisa;
    const newStatus = newDuePaisa === 0 ? 'completed' : 'pending';

    await this.update<Purchase>(purchaseId, {
      paidAmount: fromMinorUnits(newPaidPaisa),
      dueAmount: fromMinorUnits(newDuePaisa),
      status: newStatus as any,
    }, businessId);

    // Emit audit log for this allocation
    try {
      await auditLogService.logEvent(businessId, userId, 'supplier_payment_applied_to_purchase', purchaseId, {
        allocatedAmount: fromMinorUnits(allocatePaisa),
        newPaidAmount: fromMinorUnits(newPaidPaisa),
        newDueAmount: fromMinorUnits(newDuePaisa),
        status: newStatus,
      });
    } catch { }
  }

  /**
   * List outstanding purchases (dueAmount > 0) for a supplier, ordered by oldest first.
   */
  async listOutstandingPurchases(businessId: string, supplierId: string): Promise<Purchase[]> {
    // Retrieve all purchases for the supplier
    const allPurchases = await this.listPurchases(businessId, { supplierId });
    // Filter those with dueAmount > 0
    const outstanding = allPurchases.filter(p => (p.dueAmount ?? 0) > 0);
    // Sort by creation date (oldest first)
    outstanding.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return outstanding;
  }





}

export const purchaseService = new PurchaseService()
