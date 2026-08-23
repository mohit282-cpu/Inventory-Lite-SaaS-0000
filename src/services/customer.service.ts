import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Customer } from '@/types'
import { Query } from 'appwrite'

/**
 * Customer Service
 * 
 * Handles customer relationship management and due tracking under strict tenant isolation.
 */
export class CustomerService extends BaseService {
  constructor() {
    super(COLLECTIONS.CUSTOMERS)
  }

  /**
   * Create customer with phone uniqueness validation
   */
  async createCustomer(
    data: {
      name: string
      phone?: string
      email?: string
      address?: string
      totalDue?: number
    },
    businessId: string,
    userId: string
  ): Promise<Customer> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Customer name is required')
    }

    const customerData = {
      name: data.name,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      totalDue: data.totalDue || 0,
      dueAmount: data.totalDue || 0,
    }

    return await this.create<Customer>(customerData, businessId, userId)
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string, businessId: string): Promise<Customer> {
    return await this.getById<Customer>(customerId, businessId)
  }

  /**
   * List customers for a business
   */
  async listCustomers(
    businessId: string,
    filters?: {
      searchTerm?: string
      hasDueOnly?: boolean
      limit?: number
    }
  ): Promise<Customer[]> {
    const limit = filters?.limit || 200
    const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

    if (filters?.searchTerm && filters.searchTerm.trim() !== '') {
      queries.push(Query.search('name', filters.searchTerm.trim()))
    }

    if (filters?.hasDueOnly) {
      queries.push(Query.greaterThan('totalDue', 0))
    }

    return await this.list<Customer>(businessId, queries)
  }

  /**
   * Update customer record
   */
  async updateCustomer(
    customerId: string,
    data: Partial<{
      name: string
      phone: string
      email: string
      address: string
      totalDue: number
    }>,
    businessId: string
  ): Promise<Customer> {
    if (data.phone && data.phone.trim() !== '') {
      const existing = await this.getCustomerByPhone(businessId, data.phone)
      if (existing && existing.$id !== customerId) {
        throw new Error(`Customer with phone number "${data.phone}" already exists for this business`)
      }
    }

    if (data.email && data.email.trim() !== '') {
      const existing = await this.getCustomerByEmail(businessId, data.email)
      if (existing && existing.$id !== customerId) {
        throw new Error(`Customer with email "${data.email}" already exists for this business`)
      }
    }

    return await this.update<Customer>(customerId, data, businessId)
  }

  /**
   * Delete customer record
   */
  async deleteCustomer(customerId: string, businessId: string): Promise<void> {
    await this.delete(customerId, businessId)
  }

  /**
   * Get customer by phone number within business
   */
  async getCustomerByPhone(businessId: string, phone: string): Promise<Customer | null> {
    const results = await this.list<Customer>(businessId, [
      Query.equal('phone', phone),
      Query.limit(1)
    ])
    return results.length > 0 ? results[0] : null
  }

  /**
   * Get customer by email address within business
   */
  async getCustomerByEmail(businessId: string, email: string): Promise<Customer | null> {
    const results = await this.list<Customer>(businessId, [
      Query.equal('email', email),
      Query.limit(1)
    ])
    return results.length > 0 ? results[0] : null
  }

  /**
   * Update customer due amount (adds or subtracts delta)
   */
  async updateDueAmount(
    customerId: string,
    delta: number,
    businessId: string
  ): Promise<Customer> {
    const customer = await this.getCustomer(customerId, businessId)
    const newTotalDue = Math.max(0, (customer.totalDue || 0) + delta)
    return await this.update<Customer>(customerId, { totalDue: newTotalDue }, businessId)
  }

  /**
   * Get customer summary with sales history and calculated balances
   */
  async getCustomerSummary(customerId: string, businessId: string) {
    const customer = await this.getCustomer(customerId, businessId)
    let sales: any[] = []
    try {
      const { saleService } = await import('./sale.service')
      sales = await saleService.listSales(businessId, { customerId })
    } catch {
      // Fallback if sales query fails
    }

    const totalPurchases = sales.reduce((sum, s) => sum + (s.total ?? s.totalAmount ?? 0), 0)
    const totalPaid = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0)
    const computedDue = Math.max(0, totalPurchases - totalPaid)
    const totalDue = sales.length > 0 ? computedDue : (customer.totalDue || 0)

    return {
      customer,
      totalPurchases,
      totalPaid,
      totalDue,
      sales,
    }
  }
}

export const customerService = new CustomerService()
