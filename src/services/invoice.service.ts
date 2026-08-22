import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Invoice, Sale, SaleItem, Customer, Business } from '@/types'
import { Query } from 'appwrite'
import { saleService } from './sale.service'
import { saleItemService } from './sale-item.service'
import { customerService } from './customer.service'
import { businessService } from './business.service'

import { offlineNumberPoolService } from './offline-number-pool.service'

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
   * Create an invoice for a sale
   */
  async createInvoice(
    data: {
      saleId: string
      invoiceNumber?: string
      issueDate?: string
      dueDate?: string
      pdfUrl?: string
    },
    businessId: string,
    userId: string
  ): Promise<Invoice> {
    const invoiceNumber = data.invoiceNumber || (await this.generateNextInvoiceNumber(businessId, data.issueDate))
    const issueDate = data.issueDate || new Date().toISOString()

    const invoiceData = {
      saleId: data.saleId,
      invoiceNumber,
      issueDate,
      dueDate: data.dueDate || issueDate,
      pdfUrl: data.pdfUrl || '',
    }

    return await this.create<Invoice>(invoiceData, businessId, userId)
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
