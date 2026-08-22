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

    try {
      const doc = await this.create<Expense>(expenseData, businessId, userId)
      try {
        const { localDB } = await import('@/lib/offline/db')
        await localDB.expenses.put({
          id: doc.$id,
          businessId,
          title: descStr,
          amount: data.amount,
          category: data.category,
          date: expenseData.date,
          notes: data.notes || '',
          syncStatus: 'SYNCED',
          createdAt: doc.createdAt || doc.$createdAt || new Date().toISOString(),
          createdBy: userId,
        })
      } catch {}
      return this.mapExpense(doc)
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
        const localId = `LOCAL-EXP-${Date.now()}-${generateSecureToken(4)}`
        const createdAt = new Date().toISOString()

        const localObj: Expense = {
          $id: localId,
          businessId,
          title: descStr,
          description: descStr,
          category: data.category,
          amount: data.amount,
          date: expenseData.date,
          notes: data.notes || '',
          createdBy: userId,
          createdAt,
          updatedAt: createdAt,
          $createdAt: createdAt,
          $updatedAt: createdAt,
          $databaseId: '',
          $collectionId: '',
          $permissions: [],
        }

        await localDB.expenses.put({
          id: localId,
          businessId,
          title: descStr,
          amount: data.amount,
          category: data.category,
          date: expenseData.date,
          notes: data.notes || '',
          syncStatus: 'PENDING_SYNC',
          createdAt,
          createdBy: userId,
        })

        await localDB.syncQueue.add({
          businessId,
          userId,
          entityType: 'expense',
          entityId: localId,
          operation: 'CREATE',
          payload: data,
          retryCount: 0,
          status: 'PENDING',
          createdAt,
        })

        return localObj
      }
      throw err
    }
  }

  /**
   * Get expense by ID
   */
  async getExpense(expenseId: string, businessId: string): Promise<Expense> {
    try {
      const doc = await this.getById<Expense>(expenseId, businessId)
      return this.mapExpense(doc)
    } catch (err) {
      const { localDB } = await import('@/lib/offline/db')
      const localExp = await localDB.expenses.get(expenseId)
      if (localExp) {
        return {
          $id: localExp.id,
          businessId: localExp.businessId,
          title: localExp.title,
          description: localExp.title,
          category: localExp.category,
          amount: localExp.amount,
          date: localExp.date,
          notes: localExp.notes || '',
          createdBy: localExp.createdBy || '',
          createdAt: localExp.createdAt,
          updatedAt: localExp.createdAt,
          $createdAt: localExp.createdAt,
          $updatedAt: localExp.createdAt,
          $databaseId: '',
          $collectionId: '',
          $permissions: [],
        }
      }
      throw err
    }
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
    const isOffline =
      typeof window !== 'undefined' &&
      (!navigator.onLine)

    if (isOffline) {
      const { localDB } = await import('@/lib/offline/db')
      let localExps = await localDB.expenses.where('businessId').equals(businessId).toArray()

      if (filters?.category && filters.category !== 'all') {
        localExps = localExps.filter((e) => e.category === filters.category)
      }

      return localExps
        .sort((a, b) => (b.date > a.date ? 1 : -1))
        .map((exp) => ({
          $id: exp.id,
          businessId: exp.businessId,
          title: exp.title,
          description: exp.title,
          category: exp.category,
          amount: exp.amount,
          date: exp.date,
          notes: exp.notes || '',
          createdBy: exp.createdBy || '',
          createdAt: exp.createdAt,
          updatedAt: exp.createdAt,
          $createdAt: exp.createdAt,
          $updatedAt: exp.createdAt,
          $databaseId: '',
          $collectionId: '',
          $permissions: [],
        }))
    }

    try {
      const queries: any[] = [Query.orderDesc('date')]

      if (filters?.category && filters.category !== 'all') {
        queries.push(Query.equal('category', filters.category))
      }

      const list = await this.list<Expense>(businessId, queries)
      return list.map((exp) => this.mapExpense(exp))
    } catch (err) {
      const { localDB } = await import('@/lib/offline/db')
      let localExps = await localDB.expenses.where('businessId').equals(businessId).toArray()

      if (filters?.category && filters.category !== 'all') {
        localExps = localExps.filter((e) => e.category === filters.category)
      }

      return localExps
        .sort((a, b) => (b.date > a.date ? 1 : -1))
        .map((exp) => ({
          $id: exp.id,
          businessId: exp.businessId,
          title: exp.title,
          description: exp.title,
          category: exp.category,
          amount: exp.amount,
          date: exp.date,
          notes: exp.notes || '',
          createdBy: exp.createdBy || '',
          createdAt: exp.createdAt,
          updatedAt: exp.createdAt,
          $createdAt: exp.createdAt,
          $updatedAt: exp.createdAt,
          $databaseId: '',
          $collectionId: '',
          $permissions: [],
        }))
    }
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
