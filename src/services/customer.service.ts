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
   * Create a new customer record
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
    // Prevent duplicate phone per business if provided
    if (data.phone && data.phone.trim() !== '') {
      const existingPhone = await this.getCustomerByPhone(businessId, data.phone)
      if (existingPhone) {
        throw new Error(`Customer with phone number "${data.phone}" already exists for this business`)
      }
    }

    // Prevent duplicate email per business if provided
    if (data.email && data.email.trim() !== '') {
      const existingEmail = await this.getCustomerByEmail(businessId, data.email)
      if (existingEmail) {
        throw new Error(`Customer with email "${data.email}" already exists for this business`)
      }
    }

    const customerData = {
      name: data.name,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      totalDue: data.totalDue ?? 0,
    }

    try {
      const created = await this.create<Customer>(customerData, businessId, userId)
      try {
        const { localDB } = await import('@/lib/offline/db')
        await localDB.customers.put({
          id: created.$id,
          businessId,
          name: created.name,
          phone: created.phone,
          email: created.email,
          address: created.address,
          dueAmount: created.totalDue || 0,
          syncStatus: 'SYNCED',
          createdAt: created.createdAt || created.$createdAt,
        })
      } catch {}
      return created
    } catch (err: any) {
      const isOffline =
        typeof window !== 'undefined' &&
        (!navigator.onLine ||
          err.message?.includes('Network') ||
          err.message?.includes('fetch') ||
          err.message?.includes('offline'))

      if (isOffline) {
        const { generateSecureToken } = await import('@/lib/security')
        const { localDB } = await import('@/lib/offline/db')
        const localId = `LOCAL-CUST-${Date.now()}-${generateSecureToken(4)}`
        const createdAt = new Date().toISOString()

        const localCustomerObj: Customer = {
          $id: localId,
          businessId,
          name: data.name,
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          totalDue: data.totalDue ?? 0,
          dueAmount: data.totalDue ?? 0,
          createdAt,
          updatedAt: createdAt,
          $createdAt: createdAt,
          $updatedAt: createdAt,
          $databaseId: '',
          $collectionId: '',
          $permissions: [],
        }

        await localDB.customers.put({
          id: localId,
          businessId,
          name: data.name,
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          dueAmount: data.totalDue ?? 0,
          syncStatus: 'PENDING_SYNC',
          createdAt,
        })

        await localDB.syncQueue.add({
          businessId,
          userId,
          entityType: 'customer',
          entityId: localId,
          operation: 'CREATE',
          payload: data,
          retryCount: 0,
          status: 'PENDING',
          createdAt,
        })

        return localCustomerObj
      }
      throw err
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string, businessId: string): Promise<Customer> {
    try {
      return await this.getById<Customer>(customerId, businessId)
    } catch (err) {
      const { localDB } = await import('@/lib/offline/db')
      const localCust = await localDB.customers.get(customerId)
      if (localCust) {
        return {
          $id: localCust.id,
          businessId: localCust.businessId,
          name: localCust.name,
          phone: localCust.phone || '',
          email: localCust.email || '',
          address: localCust.address || '',
          totalDue: localCust.dueAmount || 0,
          dueAmount: localCust.dueAmount || 0,
          createdAt: localCust.createdAt || new Date().toISOString(),
          updatedAt: localCust.createdAt || new Date().toISOString(),
          $createdAt: localCust.createdAt || new Date().toISOString(),
          $updatedAt: localCust.createdAt || new Date().toISOString(),
          $databaseId: '',
          $collectionId: '',
          $permissions: [],
        }
      }
      throw err
    }
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
    try {
      const limit = filters?.limit || 200
      const queries: any[] = [Query.orderDesc('createdAt'), Query.limit(limit)]

      if (filters?.searchTerm && filters.searchTerm.trim() !== '') {
        queries.push(Query.search('name', filters.searchTerm.trim()))
      }

      if (filters?.hasDueOnly) {
        queries.push(Query.greaterThan('totalDue', 0))
      }

      const items = await this.list<Customer>(businessId, queries)

      try {
        const { localDB } = await import('@/lib/offline/db')
        for (const item of items) {
          await localDB.customers.put({
            id: item.$id,
            businessId: item.businessId,
            name: item.name,
            phone: item.phone,
            email: item.email,
            address: item.address,
            dueAmount: item.totalDue || item.dueAmount || 0,
            syncStatus: 'SYNCED',
            createdAt: item.createdAt || item.$createdAt,
          })
        }
      } catch {
        // Caching non-fatal
      }

      return items
    } catch (err: any) {
      const isOffline =
        typeof window !== 'undefined' &&
        (!navigator.onLine ||
          err.message?.includes('Network') ||
          err.message?.includes('fetch') ||
          err.message?.includes('offline'))

      if (isOffline) {
        try {
          const { localDB } = await import('@/lib/offline/db')
          const localCusts = await localDB.customers
            .where('businessId')
            .equals(businessId)
            .toArray()

          let filtered = localCusts
          if (filters?.searchTerm && filters.searchTerm.trim() !== '') {
            const q = filters.searchTerm.trim().toLowerCase()
            filtered = filtered.filter(
              (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
            )
          }
          if (filters?.hasDueOnly) {
            filtered = filtered.filter((c) => (c.dueAmount || 0) > 0)
          }

          return filtered.map((c) => ({
            $id: c.id,
            businessId: c.businessId,
            name: c.name,
            phone: c.phone || '',
            email: c.email || '',
            address: c.address || '',
            totalDue: c.dueAmount || 0,
            dueAmount: c.dueAmount || 0,
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: c.createdAt || new Date().toISOString(),
            $createdAt: c.createdAt || new Date().toISOString(),
            $updatedAt: c.createdAt || new Date().toISOString(),
            $databaseId: '',
            $collectionId: '',
            $permissions: [],
          }))
        } catch {
          return []
        }
      }
      throw err
    }
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
