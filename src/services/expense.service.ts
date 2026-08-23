import { BaseService } from './base.service'
import { COLLECTIONS } from '@/config/appwrite'
import { Expense } from '@/types'
import { Query } from 'appwrite'

export interface ExpenseSummary {
  todayExpenses: number
  thisMonthExpenses: number
  totalExpenses: number
}

/**
 * Expense Service
 * 
 * Manages business expense logging and tracking under strict tenant isolation.
 */
export class ExpenseService extends BaseService {
  constructor() {
    super(COLLECTIONS.EXPENSES)
  }

  private mapExpense(exp: any): Expense {
    if (!exp) return exp
    return {
      ...exp,
      title: exp.title || exp.description || 'Business Expense',
    }
  }

  /**
   * Log a new business expense
   */
  async createExpense(
    data: {
      title?: string
      category: string
      description?: string
      amount: number
      date?: string
      notes?: string
    },
    businessId: string,
    userId: string
  ): Promise<Expense> {
    if (data.amount <= 0) {
      throw new Error('Expense amount must be greater than zero')
    }

    const descStr = data.description || data.title || 'Business Expense'
    const expenseData: Record<string, any> = {
      category: data.category,
      description: descStr,
      amount: data.amount,
      date: data.date || new Date().toISOString().slice(0, 10),
      notes: data.notes || '',
      createdBy: userId,
    }

    const doc = await this.create<Expense>(expenseData, businessId, userId)
    return this.mapExpense(doc)
  }

  /**
   * Get expense by ID
   */
  async getExpense(expenseId: string, businessId: string): Promise<Expense> {
    const doc = await this.getById<Expense>(expenseId, businessId)
    return this.mapExpense(doc)
  }

  /**
   * List expenses for a business with optional category filter and pagination
   */
  async listExpenses(
    businessId: string,
    filters?: {
      category?: string
      limit?: number
      offset?: number
    }
  ): Promise<Expense[]> {
    const queries: string[] = []

    if (filters?.category && filters.category !== 'all') {
      queries.push(Query.equal('category', filters.category))
    }

    queries.push(Query.orderDesc('date'))
    queries.push(Query.limit(filters?.limit ?? 50))
    if (filters?.offset) {
      queries.push(Query.offset(filters.offset))
    }

    const response = await this.list<Expense>(businessId, queries)
    return response.map((doc) => this.mapExpense(doc))
  }

  /**
   * Get expense summary metrics for today, this month, and total
   */
  async getExpenseSummary(businessId: string): Promise<ExpenseSummary> {
    const expenses = await this.listExpenses(businessId)
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    const monthStr = now.toISOString().slice(0, 7)

    let todayExpenses = 0
    let thisMonthExpenses = 0
    let totalExpenses = 0

    for (const exp of expenses) {
      const amt = exp.amount || 0
      totalExpenses += amt

      const expDate = (exp.date || exp.createdAt || '').slice(0, 10)
      const expMonth = (exp.date || exp.createdAt || '').slice(0, 7)

      if (expDate === todayStr) todayExpenses += amt
      if (expMonth === monthStr) thisMonthExpenses += amt
    }

    return {
      todayExpenses: Math.round(todayExpenses * 100) / 100,
      thisMonthExpenses: Math.round(thisMonthExpenses * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
    }
  }

  /**
   * Update expense
   */
  async updateExpense(
    expenseId: string,
    data: Partial<{
      title: string
      category: string
      description: string
      amount: number
      date: string
      notes: string
    }>,
    businessId: string
  ): Promise<Expense> {
    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Expense amount must be greater than zero')
    }

    const updatePayload: Record<string, any> = { ...data }
    if (updatePayload.title && !updatePayload.description) {
      updatePayload.description = updatePayload.title
    }
    delete updatePayload.title

    const doc = await this.update<Expense>(expenseId, updatePayload, businessId)
    return this.mapExpense(doc)
  }

  /**
   * Delete expense
   */
  async deleteExpense(expenseId: string, businessId: string): Promise<void> {
    await this.delete(expenseId, businessId)
  }
}

export const expenseService = new ExpenseService()
