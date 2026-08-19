import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Customer } from '@/types'
import { Query } from 'appwrite'

/**
 * Customer Service
 * 
 * Handles customer operations with tenant isolation.
 * Customers are business-specific entities for sales and billing.
 */
export class CustomerService extends BaseService {
  constructor() {
    super(COLLECTIONS.CUSTOMERS)
  }

  /**
   * Create a new customer
   * @param data - Customer data
   * @param businessId - Business ID for tenant isolation
   * @param userId - User ID creating the customer
   */
  async createCustomer(
    data: {
      name: string
      phone?: string
      email?: string
      address?: string
    },
    businessId: string,
    userId: string
  ): Promise<Customer> {
    const customerData = {
      ...data,
      totalDue: 0,
    }
    return await this.create(customerData, businessId, userId) as Customer
  }

  /**
   * Get customer by ID
   * @param customerId - Customer ID
   * @param businessId - Business ID for tenant isolation
   */
  async getCustomer(customerId: string, businessId: string): Promise<Customer> {
    return await this.getById(customerId, businessId) as Customer
  }

  /**
   * List all customers for a business
   * @param businessId - Business ID for tenant isolation
   */
  async listCustomers(businessId: string): Promise<Customer[]> {
    const result = await this.list(businessId, [
      Query.orderDesc('createdAt')
    ])
    return result.documents as Customer[]
  }

  /**
   * Update customer
   * @param customerId - Customer ID
   * @param data - Customer data to update
   * @param businessId - Business ID for tenant isolation
   */
  async updateCustomer(
    customerId: string,
    data: Partial<{
      name?: string
      phone?: string
      email?: string
      address?: string
      totalDue?: number
    }>,
    businessId: string
  ): Promise<Customer> {
    return await this.update(customerId, data, businessId) as Customer
  }

  /**
   * Delete customer
   * @param customerId - Customer ID
   * @param businessId - Business ID for tenant isolation
   */
  async deleteCustomer(customerId: string, businessId: string): Promise<void> {
    await this.delete(customerId, businessId)
  }

  /**
   * Search customers by name or phone
   * @param businessId - Business ID for tenant isolation
   * @param searchTerm - Search term
   */
  async searchCustomers(businessId: string, searchTerm: string): Promise<Customer[]> {
    const result = await this.query(businessId, [
      Query.search('name', searchTerm),
      Query.search('phone', searchTerm)
    ])
    return result.documents as Customer[]
  }

  /**
   * Update customer due amount
   * @param customerId - Customer ID
   * @param amount - Amount to add (positive) or subtract (negative)
   * @param businessId - Business ID for tenant isolation
   */
  async updateDueAmount(
    customerId: string,
    amount: number,
    businessId: string
  ): Promise<Customer> {
    const customer = await this.getCustomer(customerId, businessId)
    const newTotalDue = Math.max(0, customer.totalDue + amount)
    
    return await this.updateCustomer(customerId, { totalDue: newTotalDue }, businessId)
  }

  /**
   * Get customers with outstanding balance
   * @param businessId - Business ID for tenant isolation
   */
  async getCustomersWithDue(businessId: string): Promise<Customer[]> {
    const result = await this.list(businessId, [
      Query.orderDesc('createdAt')
    ])
    
    // Filter in application logic since Appwrite doesn't support complex comparisons
    const customers = result.documents as Customer[]
    return customers.filter(customer => customer.totalDue > 0)
  }
}

export const customerService = new CustomerService()
