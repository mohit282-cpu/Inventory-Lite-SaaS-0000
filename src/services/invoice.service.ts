import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Invoice } from '@/types'
import { Query } from 'appwrite'

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
   * Helper to generate a unique invoice number in format INV-YYYYMMDD-XXXX
   */
  private generateInvoiceNumber(): string {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    const randomHex = Math.floor(1000 + Math.random() * 9000).toString()
    return `INV-${yyyy}${mm}${dd}-${randomHex}`
  }

  /**
   * Create an invoice for a sale
   */
  async createInvoice(
    data: {
      saleId: string
      issueDate?: string
      pdfUrl?: string
    },
    businessId: string,
    userId: string
  ): Promise<Invoice> {
    const invoiceNumber = this.generateInvoiceNumber()
    const issueDate = data.issueDate || new Date().toISOString()

    const invoiceData = {
      saleId: data.saleId,
      invoiceNumber,
      issueDate,
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
   * Get invoice by sale ID
   */
  async getInvoiceBySaleId(saleId: string, businessId: string): Promise<Invoice | null> {
    const results = await this.query<Invoice>(businessId, [
      Query.equal('saleId', saleId),
      Query.limit(1)
    ])
    return results.length > 0 ? results[0] : null
  }

  /**
   * List invoices for a business
   */
  async listInvoices(businessId: string): Promise<Invoice[]> {
    return await this.list<Invoice>(businessId, [
      Query.orderDesc('createdAt')
    ])
  }

  /**
   * Update invoice PDF URL
   */
  async updatePdfUrl(invoiceId: string, pdfUrl: string, businessId: string): Promise<Invoice> {
    return await this.update<Invoice>(invoiceId, { pdfUrl }, businessId)
  }
}

export const invoiceService = new InvoiceService()
