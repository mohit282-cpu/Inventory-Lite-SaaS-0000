"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/search-input'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { LoadingPage } from '@/components/ui/loading'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ExpenseFormDialog } from '@/components/features/expenses/expense-form-dialog'
import { useAuth } from '@/context/auth-context'
import { expenseService, ExpenseSummary } from '@/services/expense.service'
import { ExpenseInput } from '@/lib/validations'
import { Expense } from '@/types'
import { Plus, Edit, Trash2, Receipt, Calendar, DollarSign } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function ExpensesPage() {
  const { activeBusiness, user } = useAuth()
  const { toast } = useToast()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary>({ todayExpenses: 0, thisMonthExpenses: 0, totalExpenses: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [minAmount, setMinAmount] = useState<string>('')
  const [maxAmount, setMaxAmount] = useState<string>('')
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

    const min = parseFloat(minAmount)
    const max = parseFloat(maxAmount)
    let amountPass = true
    if (!isNaN(min) && exp.amount < min) amountPass = false
    if (!isNaN(max) && exp.amount > max) amountPass = false

    const todayStr = new Date().toISOString().slice(0, 10)
    const monthStr = new Date().toISOString().slice(0, 7)
    const expDate = (exp.date || exp.createdAt || '').slice(0, 10)

    let datePass = true
    if (dateFilter === 'today' && expDate !== todayStr) datePass = false
    if (dateFilter === 'month' && !expDate.startsWith(monthStr)) datePass = false

    return textPass && amountPass && datePass
  })

  const currency = activeBusiness?.currency || 'NPR'

  const columns: Column<Expense>[] = [
    {
      key: 'title',
      header: 'Expense Description',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-semibold text-slate-100">{item.title || item.description}</p>
          {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
          {item.category}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount (Rs.)',
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-rose-400 text-base">
          Rs. {item.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-slate-400">
          {item.date ? item.date.slice(0, 10) : item.createdAt?.slice(0, 10)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingExpense(item)
              setFormOpen(true)
            }}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
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
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-800"
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
    <div className="space-y-6">
      <PageHeader
        title="Expense Tracker"
        description="Log and monitor operational costs (rent, utilities, salaries) for accurate net profit estimations."
        actions={
          <Button
            onClick={() => {
              setEditingExpense(null)
              setFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Record New Expense
          </Button>
        }
      />

      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Today&apos;s Expenses
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400 font-mono">
              {currency} {summary.todayExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Expenses logged today</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              This Month&apos;s Expenses
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">
              {currency} {summary.thisMonthExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Current calendar month total</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              All-Time Total Expenses
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-500/10 text-slate-300 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">
              {currency} {summary.totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Cumulative operational expenditure</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <SearchInput
          placeholder="Search by title, notes, or category..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">Date:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg px-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="rent">Rent</option>
              <option value="utilities">Utilities</option>
              <option value="salaries">Salaries</option>
              <option value="supplies">Supplies</option>
              <option value="transport">Transport</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Amount Range Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">Amount:</span>
            <input
              type="number"
              placeholder="Min"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="h-10 w-20 bg-slate-900 border border-slate-800 text-slate-200 text-sm font-mono rounded-lg px-2.5 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
            <span className="text-slate-600 text-xs">-</span>
            <input
              type="number"
              placeholder="Max"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="h-10 w-20 bg-slate-900 border border-slate-800 text-slate-200 text-sm font-mono rounded-lg px-2.5 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Expenses DataTable */}
      <DataTable
        data={filteredExpenses}
        columns={columns}
        emptyTitle="No expense records found"
        emptyDescription="Log your operational expenses to keep your business financial ledger up-to-date."
        emptyAction={
          <Button
            onClick={() => {
              setEditingExpense(null)
              setFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="mr-2 h-4 w-4" /> Record First Expense
          </Button>
        }
      />

      {/* Create/Edit Form Dialog */}
      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateOrEditSubmit}
        initialData={editingExpense}
        loading={submitting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Expense Record"
        description="Are you sure you want to delete this expense entry? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        confirmText="Delete Expense"
        cancelText="Cancel"
      />
    </div>
  )
}
