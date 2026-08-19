"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingPage } from '@/components/ui/loading'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ExpenseFormDialog } from '@/components/features/expenses/expense-form-dialog'
import { useAuth } from '@/context/auth-context'
import { expenseService, ExpenseSummary } from '@/services/expense.service'
import { ExpenseInput } from '@/lib/validations'
import { Expense } from '@/types'
import { Plus, Edit, Trash2, Receipt, Calendar, CreditCard } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function ExpensesPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary>({ todayExpenses: 0, thisMonthExpenses: 0, totalExpenses: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Dialog States
  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)

  const fetchExpensesData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setLoading(true)
      const bId = activeBusiness.$id
      const [list, sum] = await Promise.all([
        expenseService.listExpenses(bId, { category: selectedCategory }),
        expenseService.getExpenseSummary(bId),
      ])
      setExpenses(list)
      setSummary(sum)
    } catch (err) {
      console.error('Error fetching expenses:', err)
      toast({
        title: 'Error loading expenses',
        description: 'Could not retrieve expense records from database.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.$id, selectedCategory, toast])

  useEffect(() => {
    fetchExpensesData()
  }, [fetchExpensesData])

  const handleCreateOrEditSubmit = async (data: ExpenseInput) => {
    if (!activeBusiness?.$id || !user?.$id) return
    try {
      setSubmitting(true)
      if (editingExpense) {
        await expenseService.updateExpense(editingExpense.$id, data, activeBusiness.$id)
        toast({
          title: 'Expense updated',
          description: 'Expense record has been saved.',
        })
      } else {
        await expenseService.createExpense(data, activeBusiness.$id, user.$id)
        toast({
          title: 'Expense recorded',
          description: 'New expense log added successfully.',
        })
      }
      setFormOpen(false)
      setEditingExpense(null)
      await fetchExpensesData()
    } catch (err: any) {
      console.error('Error saving expense:', err)
      toast({
        title: 'Error saving expense',
        description: err?.message || 'Failed to save expense entry.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!activeBusiness?.$id || !deletingExpenseId) return
    try {
      await expenseService.deleteExpense(deletingExpenseId, activeBusiness.$id)
      toast({
        title: 'Expense deleted',
        description: 'Expense record has been removed.',
      })
      setDeleteConfirmOpen(false)
      setDeletingExpenseId(null)
      await fetchExpensesData()
    } catch (err: any) {
      console.error('Error deleting expense:', err)
      toast({
        title: 'Error deleting expense',
        description: err?.message || 'Failed to delete expense entry.',
        variant: 'destructive',
      })
    }
  }

  const filteredExpenses = expenses.filter((exp) => {
    const query = searchQuery.toLowerCase()
    const titleMatch = (exp.title || exp.description || '').toLowerCase().includes(query)
    const categoryMatch = (exp.category || '').toLowerCase().includes(query)
    const notesMatch = (exp.notes || '').toLowerCase().includes(query)
    const textPass = titleMatch || categoryMatch || notesMatch

    const todayStr = new Date().toISOString().slice(0, 10)
    const monthStr = new Date().toISOString().slice(0, 7)
    const expDate = (exp.date || exp.createdAt || '').slice(0, 10)

    let datePass = true
    if (dateFilter === 'today' && expDate !== todayStr) datePass = false
    if (dateFilter === 'month' && !expDate.startsWith(monthStr)) datePass = false

    return textPass && datePass
  })

  const currency = activeBusiness?.currency || 'NPR'

  const columns: Column<Expense>[] = [
    {
      key: 'title',
      header: 'Expense Description',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-bold text-slate-900">{item.title || item.description}</p>
          {item.notes && <p className="text-xs text-slate-500 mt-0.5">{item.notes}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
          {item.category}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount (Rs.)',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-rose-700 text-base">
          Rs. {item.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-500 font-medium">
          {item.date ? item.date.slice(0, 10) : item.createdAt?.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingExpense(item)
              setFormOpen(true)
            }}
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
            title="Edit Expense"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDeletingExpenseId(item.$id)
              setDeleteConfirmOpen(true)
            }}
            className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
            title="Delete Expense"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return <LoadingPage message="Loading operational expenses..." />
  }

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Expense Tracker"
        description="Log and monitor operational costs (rent, utilities, salaries) for accurate net profit estimations."
        actions={
          <Button
            onClick={() => {
              setEditingExpense(null)
              setFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
          >
            <Plus className="mr-2 h-4 w-4" /> Record New Expense
          </Button>
        }
      />

      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Today&apos;s Expenses
            </span>
            <Calendar className="h-4 w-4 text-rose-600 shrink-0" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700 font-mono tracking-tight">
            {currency} {summary.todayExpenses.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Expenses logged today</p>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              This Month&apos;s Expenses
            </span>
            <Receipt className="h-4 w-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {currency} {summary.thisMonthExpenses.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Current calendar month total</p>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              All-Time Total Expenses
            </span>
            <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {currency} {summary.totalExpenses.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Cumulative operational expenditure</p>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <SearchInput
          placeholder="Search by title, notes, or category..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:max-w-md"
        />

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="rent">Rent</SelectItem>
              <SelectItem value="utilities">Utilities</SelectItem>
              <SelectItem value="salaries">Salaries</SelectItem>
              <SelectItem value="supplies">Supplies</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today Only</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expense Table */}
      <DataTable
        data={filteredExpenses}
        columns={columns}
        emptyTitle="No expenses recorded"
        emptyDescription="Record business expenses to track operating costs."
        emptyAction={
          <Button
            onClick={() => {
              setEditingExpense(null)
              setFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <Plus className="mr-2 h-4 w-4" /> Record Expense
          </Button>
        }
      />

      {/* Record / Edit Form Modal */}
      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={(op) => {
          setFormOpen(op)
          if (!op) setEditingExpense(null)
        }}
        onSubmit={handleCreateOrEditSubmit}
        initialData={editingExpense}
        loading={submitting}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false)
          setDeletingExpenseId(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Record"
        description="Are you sure you want to remove this expense entry? This action cannot be undone."
        confirmText="Delete Entry"
      />
    </div>
  )
}
