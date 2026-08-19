import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Expense } from '@/types'
import { Query } from 'appwrite'

/**
 * Expense Service
 * 
 * Manages business expense logging and tracking under strict tenant isolation.
 */
export class ExpenseService extends BaseService {
  constructor() {
    super(COLLECTIONS.EXPENSES)
  }

  /**
   * Log a new business expense
   */
  async createExpense(
    data: {
      category: string
      description: string
      amount: number
      date?: string
    },
    businessId: string,
    userId: string
  ): Promise<Expense> {
    if (data.amount <= 0) {
      throw new Error('Expense amount must be greater than zero')
    }

    const expenseData = {
      category: data.category,
      description: data.description,
      amount: data.amount,
      date: data.date || new Date().toISOString(),
      createdBy: userId,
    }

    return await this.create<Expense>(expenseData, businessId, userId)
  }

  /**
   * Get expense by ID
   */
  async getExpense(expenseId: string, businessId: string): Promise<Expense> {
    return await this.getById<Expense>(expenseId, businessId)
  }

  /**
   * List expenses for a business with optional category filter
   */
  async listExpenses(
    businessId: string,
    filters?: {
      category?: string
    }
  ): Promise<Expense[]> {
    const queries: any[] = [Query.orderDesc('date')]

    if (filters?.category) {
      queries.push(Query.equal('category', filters.category))
    }

    return await this.list<Expense>(businessId, queries)
  }

  /**
   * Update expense
   */
  async updateExpense(
    expenseId: string,
    data: Partial<{
      category: string
      description: string
      amount: number
      date: string
    }>,
    businessId: string
  ): Promise<Expense> {
    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Expense amount must be greater than zero')
    }

    return await this.update<Expense>(expenseId, data, businessId)
  }

  /**
   * Delete expense
   */
  async deleteExpense(expenseId: string, businessId: string): Promise<void> {
    await this.delete(expenseId, businessId)
  }
}

export const expenseService = new ExpenseService()
