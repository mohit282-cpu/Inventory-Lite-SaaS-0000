import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Invoice, Sale, SaleItem, Customer, Business } from '@/types'
import { Query } from 'appwrite'
import { saleService } from './sale.service'
import { saleItemService } from './sale-item.service'
import { customerService } from './customer.service'
import { businessService } from './business.service'
import { offlineNumberPoolService } from './offline-number-pool.service'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { idempotencyManager } from '@/lib/idempotency'

export interface InvoiceFullDetails {
  invoice: Invoice
  sale: Sale
  saleItems: SaleItem[]
  customer: Customer | null
  business: Business
}

/**
 * Invoice Service
 * 
 * Manages invoice documents linked to sales under strict tenant isolation.
 */
export class InvoiceService extends BaseService {
  constructor() {
    super(COLLECTIONS.INVOICES)
  }

  /**
   * Helper to generate a unique sequential invoice number per business starting from 1 every financial year (INV-83/84-000001)
   */
  async generateNextInvoiceNumber(businessId: string, dateInput?: string | Date): Promise<string> {
    const allocated = await offlineNumberPoolService.allocateDocumentNumber(businessId, 'INVOICE', dateInput)
    return allocated.formattedNumber
  }

  /**
   * Create an invoice for a sale with strict service boundary authorization (P1)
   */
  async createInvoice(
    data: {
      saleId: string
      invoiceNumber?: string
      issueDate?: string
      dueDate?: string
      pdfUrl?: string
      idempotencyKey?: string
    },
    businessId: string,
    userId: string
  ): Promise<Invoice> {
    // 1. RBAC authorization check
    await authorizeBusinessAccess({
      userId,
      businessId,
      requiredRole: ['owner', 'admin', 'staff'],
    })

    // 2. Persistent Idempotency check
    const persistentCheck = async (): Promise<Invoice | null> => {
      return await this.getInvoiceBySaleId(data.saleId, businessId)
    }

    return await idempotencyManager.executeIdempotentTransaction(
      {
        idempotencyKey: data.idempotencyKey || `inv_${data.saleId}`,
        businessId,
        operationType: 'create_invoice',
        payload: data,
        resourceType: 'invoice',
      },
      persistentCheck,
      async () => {
        // 3. Verify sale exists and belongs to business
        const sale = await saleService.getSale(data.saleId, businessId)
        if (!sale) {
          throw new Error('Associated sale transaction not found for invoice creation')
        }

        // 4. Verify invoice does not already exist for sale
        const existingInvoice = await this.getInvoiceBySaleId(data.saleId, businessId)
        if (existingInvoice) {
          return existingInvoice
        }

        // 5. Generate collision-proof sequential invoice number
        const invoiceNumber = data.invoiceNumber || (await this.generateNextInvoiceNumber(businessId, data.issueDate))
        const issueDate = data.issueDate || new Date().toISOString()

        // 6. Verify invoice number uniqueness for business
        try {
          const existingByNum = await this.list<Invoice>(businessId, [
            Query.equal('invoiceNumber', invoiceNumber),
            Query.limit(1),
          ])
          if (existingByNum.length > 0 && existingByNum[0].saleId !== data.saleId) {
            throw new Error(`DUPLICATE_INVOICE_NUMBER: Invoice number '${invoiceNumber}' already exists for business '${businessId}'`)
          }
        } catch (err: any) {
          if (err.message?.includes('DUPLICATE_INVOICE_NUMBER')) throw err
        }

        const invoiceData = {
          saleId: data.saleId,
          invoiceNumber,
          issueDate,
          dueDate: data.dueDate || issueDate,
          pdfUrl: data.pdfUrl || '',
        }

        return await this.create<Invoice>(invoiceData, businessId, userId)
      }
    )
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string, businessId: string): Promise<Invoice> {
    return await this.getById<Invoice>(invoiceId, businessId)
  }

  /**
   * Get full aggregated invoice details (Invoice, Sale, Item Snapshots, Customer, Business)
   */
  async getInvoiceFullDetails(invoiceId: string, businessId: string): Promise<InvoiceFullDetails> {
    const invoice = await this.getById<Invoice>(invoiceId, businessId)
    const sale = await saleService.getSale(invoice.saleId, businessId)
    const saleItems = await saleItemService.listSaleItems(invoice.saleId, businessId)
    
    let customer: Customer | null = null
    if (sale.customerId) {
      try {
        customer = await customerService.getCustomer(sale.customerId, businessId)
      } catch (err) {
        console.warn('Could not load customer for invoice:', err)
      }
    }

    const business = await businessService.getBusiness(businessId)

    return {
      invoice,
      sale,
      saleItems,
      customer,
      business,
    }
  }

  /**
   * Get invoice by sale ID
   */
  async getInvoiceBySaleId(saleId: string, businessId: string): Promise<Invoice | null> {
    const results = await this.list<Invoice>(businessId, [
      Query.equal('saleId', saleId),
      Query.limit(1),
    ])
    return results.length > 0 ? results[0] : null
  }

  /**
   * List invoices for a business
   */
  async listInvoices(businessId: string): Promise<Invoice[]> {
    return await this.list<Invoice>(businessId, [Query.orderDesc('createdAt')])
  }

  /**
   * Update invoice PDF URL
   */
  async updatePdfUrl(invoiceId: string, pdfUrl: string, businessId: string): Promise<Invoice> {
    return await this.update<Invoice>(invoiceId, { pdfUrl }, businessId)
  }
}

export const invoiceService = new InvoiceService()
