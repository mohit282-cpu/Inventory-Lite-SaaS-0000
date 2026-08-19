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
  COLLECTIONS: {
    EXPENSES: 'expenses',
  },
}))

describe('Expenses Management Module', () => {
  const businessA = 'bus_tenant_alpha'
  const businessB = 'bus_tenant_beta'
  const userA = 'user_owner_100'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Expense Creation & Validation', () => {
    it('should create a valid expense document', async () => {
      vi.mocked(databases.createDocument).mockResolvedValueOnce({
        $id: 'exp_101',
        title: 'Office Electricity Bill',
        category: 'utilities',
        amount: 2500,
        date: '2026-08-19',
        businessId: businessA,
        createdBy: userA,
      } as any)

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
