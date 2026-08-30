import { describe, it, expect, beforeEach, vi } from 'vitest'
import { expenseService } from '@/services/expense.service'
import { databases } from '@/config/appwrite'

vi.mock('@/config/appwrite', () => ({
  databases: {
    createDocument: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
  DATABASE_ID: 'inventory_lite_db',
  COLLECTIONS: new Proxy({}, {
    get: (_, prop) => (typeof prop === 'string' ? prop.toLowerCase() : prop),
  }),
}))

describe('Expenses Management Module', () => {
  const businessA = 'bus_tenant_alpha'
  const businessB = 'bus_tenant_beta'
  const userA = 'user_owner_100'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(databases.listDocuments).mockImplementation((_db, col) => {
      if (col === 'journal_lines') {
        return Promise.resolve({
          total: 2,
          documents: [
            { $id: 'jl_1', debit: 2500, credit: 0, businessId: businessA },
            { $id: 'jl_2', debit: 0, credit: 2500, businessId: businessA },
          ],
        } as any)
      }
      return Promise.resolve({ total: 0, documents: [] } as any)
    })
    vi.mocked(databases.getDocument).mockImplementation((_db, _col, docId) =>
      Promise.resolve({ $id: docId, businessId: businessA, status: 'DRAFT', isBalanced: true } as any)
    )
    let firstExpense = true
    vi.mocked(databases.createDocument).mockImplementation((_db, col, docId, data: any) => {
      let id = docId === 'ID.unique()' ? 'id_' + Math.random().toString(36).substring(2, 7) : docId
      if (firstExpense && col === 'expenses') {
        id = 'exp_101'
        firstExpense = false
      }
      return Promise.resolve({ $id: id, ...data } as any)
    })
  })

  describe('Expense Creation & Validation', () => {
    it('should create a valid expense document', async () => {

      const exp = await expenseService.createExpense(
        {
          title: 'Office Electricity Bill',
          category: 'utilities',
          amount: 2500,
          date: '2026-08-19',
        },
        businessA,
        userA
      )

      expect(exp.$id).toBe('exp_101')
      expect(exp.title).toBe('Office Electricity Bill')
      expect(exp.amount).toBe(2500)
    })

    it('should throw an error if expense amount is 0 or negative', async () => {
      await expect(
        expenseService.createExpense(
          {
            title: 'Invalid Expense',
            category: 'other',
            amount: 0,
          },
          businessA,
          userA
        )
      ).rejects.toThrow('Expense amount must be greater than zero')
    })
  })

  describe('Expense Summary Aggregation', () => {
    it('should calculate today, monthly, and total expenses correctly', async () => {
      const todayISO = new Date().toISOString().slice(0, 10)
      const monthISO = new Date().toISOString().slice(0, 7)

      vi.mocked(databases.listDocuments).mockResolvedValueOnce({
        total: 3,
        documents: [
          { $id: 'e1', amount: 1500, date: todayISO, createdAt: todayISO },
          { $id: 'e2', amount: 3500, date: `${monthISO}-01`, createdAt: `${monthISO}-01` },
          { $id: 'e3', amount: 5000, date: '2025-01-01', createdAt: '2025-01-01' },
        ],
      } as any)

      const summary = await expenseService.getExpenseSummary(businessA)

      expect(summary.todayExpenses).toBe(1500)
      expect(summary.thisMonthExpenses).toBe(5000)
      expect(summary.totalExpenses).toBe(10000)
    })
  })

  describe('Multi-Tenant Isolation', () => {
    it('should reject fetching an expense document belonging to another business', async () => {
      vi.mocked(databases.getDocument).mockResolvedValueOnce({
        $id: 'exp_secret_b',
        title: 'Competitor Secret Expense',
        amount: 99000,
        businessId: businessB,
      } as any)

      await expect(
        expenseService.getExpense('exp_secret_b', businessA)
      ).rejects.toThrow('Tenant Isolation Violation')
    })
  })
})
