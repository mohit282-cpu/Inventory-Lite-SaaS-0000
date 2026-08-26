import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Invoice, Sale, SaleItem, Customer, Business } from '@/types'
import { Query } from 'appwrite'
import { saleService } from './sale.service'
import { saleItemService } from './sale-item.service'
import { customerService } from './customer.service'
import { businessService } from './business.service'
import { authorizeBusinessAccess } from '@/lib/authorization'
import { idempotencyManager } from '@/lib/idempotency'

export interface InvoiceFullDetails {
  invoice: Invoice
  sale: Sale
  saleItems: SaleItem[]
  customer: Customer | null
  business: Business
}

import { numberingService } from './numbering.service'

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
    const allocated = await numberingService.allocateNextNumber(businessId, 'INVOICE', dateInput)
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

        const issueDate = data.issueDate || new Date().toISOString()
        let invoice: Invoice | null = null
        let attempts = 0
        let lastErr: any = null

        while (attempts < 5 && !invoice) {
          attempts++
          try {
            const invoiceNumber = data.invoiceNumber || (await this.generateNextInvoiceNumber(businessId, data.issueDate))

            const invoiceData = {
              saleId: data.saleId,
              invoiceNumber,
              issueDate,
              dueDate: data.dueDate || issueDate,
              pdfUrl: data.pdfUrl || '',
            }

            invoice = await this.create<Invoice>(invoiceData, businessId, userId)
          } catch (createErr: any) {
            lastErr = createErr
            const errMsg = String(createErr?.message || '')
            const isUniqueViolation =
              errMsg.includes('unique') ||
              errMsg.includes('violates') ||
              createErr?.code === 409

            if (isUniqueViolation && attempts < 5) {
              numberingService.resetInMemorySequences()
              await new Promise((resolve) => setTimeout(resolve, 50 * attempts))
              continue
            }
            throw createErr
          }
        }

        if (!invoice) {
          throw lastErr || new Error('Failed to create invoice document due to constraint error')
        }

        return invoice
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
   * List ALL invoices for a business within a date range (for reporting)
   */
  async listAllInvoices(
    businessId: string,
    filters?: {
      dateFrom?: string // ISO string
      dateTo?: string   // ISO string
    }
  ): Promise<Invoice[]> {
    const queries: any[] = [Query.orderDesc('issueDate')]

    if (filters?.dateFrom) {
      queries.push(Query.greaterThanEqual('issueDate', filters.dateFrom))
    }
    if (filters?.dateTo) {
      queries.push(Query.lessThanEqual('issueDate', filters.dateTo))
    }

    return await this.listAll<Invoice>(businessId, queries)
  }

  /**
   * Update invoice PDF URL
   */
  async updatePdfUrl(invoiceId: string, pdfUrl: string, businessId: string): Promise<Invoice> {
    return await this.update<Invoice>(invoiceId, { pdfUrl }, businessId)
  }
}

export const invoiceService = new InvoiceService()
