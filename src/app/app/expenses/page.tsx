"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { PageHeader } from '@/components/ui/page-header'
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
import { formatBSDate } from '@/lib/date/bs-date'
import { formatMoney } from '@/lib/money'
import { Plus, Edit, Trash2, Receipt, Calendar, Wallet, FilterX } from 'lucide-react'
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
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)

  const fetchExpensesData = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setLoading(true)
      const bId = activeBusiness.$id
      const [list, sum] = await Promise.all([
        expenseService.listExpenses(bId, { category: selectedCategory === 'all' ? undefined : selectedCategory }),
        expenseService.getExpenseSummary(bId),
      ])
      setExpenses(list)
      setSummary(sum)
    } catch (err) {
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
          title: 'Expense updated successfully',
          description: 'Expense record has been saved.',
        })
      } else {
        await expenseService.createExpense(data, activeBusiness.$id, user.$id)
        toast({
          title: 'Expense recorded successfully',
          description: 'New expense entry logged.',
        })
      }
      setFormOpen(false)
      setEditingExpense(null)
      await fetchExpensesData()
    } catch (err: any) {
      toast({
        title: 'Unable to save expense',
        description: err?.message || 'Failed to record expense entry. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!activeBusiness?.$id || !deletingExpense?.$id) return
    try {
      await expenseService.deleteExpense(deletingExpense.$id, activeBusiness.$id)
      toast({
        title: 'Expense deleted',
        description: 'Expense record has been removed.',
      })
      setDeleteConfirmOpen(false)
      setDeletingExpense(null)
      await fetchExpensesData()
    } catch (err: any) {
      toast({
        title: 'Error deleting expense',
        description: err?.message || 'Failed to delete expense entry.',
        variant: 'destructive',
      })
    }
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setDateFilter('all')
  }

  const isFilterActive = searchQuery.trim() !== '' || selectedCategory !== 'all' || dateFilter !== 'all'

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const query = searchQuery.toLowerCase().trim()
      const titleMatch = (exp.title || exp.description || '').toLowerCase().includes(query)
      const categoryMatch = (exp.category || '').toLowerCase().includes(query)
      const notesMatch = (exp.notes || '').toLowerCase().includes(query)
      const textPass = query === '' || titleMatch || categoryMatch || notesMatch

      const todayStr = new Date().toISOString().slice(0, 10)
      const now = new Date()
      const monthStr = now.toISOString().slice(0, 7)
      
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthStr = lastMonthDate.toISOString().slice(0, 7)

      const expDate = (exp.date || exp.createdAt || '').slice(0, 10)

      let datePass = true
      if (dateFilter === 'today' && expDate !== todayStr) datePass = false
      if (dateFilter === 'month' && !expDate.startsWith(monthStr)) datePass = false
      if (dateFilter === 'last_month' && !expDate.startsWith(lastMonthStr)) datePass = false

      return textPass && datePass
    })
  }, [expenses, searchQuery, dateFilter])

  const columns: Column<Expense>[] = [
    {
      key: 'title',
      header: 'Expense Description',
      sortable: true,
      width: '35%',
      render: (item) => (
        <div>
          <p className="font-bold text-slate-900 text-sm">{item.title || item.description}</p>
          {item.notes && <p className="text-xs text-slate-500 font-normal mt-0.5">{item.notes}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      width: '20%',
      render: (item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
          {item.category}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      width: '18%',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
          Rs. {formatMoney(item.amount)}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      width: '15%',
      align: 'center',
      render: (item) => (
        <span className="text-xs text-slate-800 font-mono font-bold">
          {formatBSDate(item.date || item.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '12%',
      align: 'right',
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setEditingExpense(item)
              setFormOpen(true)
            }}
            title="Edit Expense"
            aria-label={`Edit expense ${item.title || item.description}`}
            className="h-8 w-8 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-indigo-600"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setDeletingExpense(item)
              setDeleteConfirmOpen(true)
            }}
            title="Delete Expense"
            aria-label={`Delete expense ${item.title || item.description}`}
            className="h-8 w-8 text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          >
            <Trash2 className="h-3.5 w-3.5" />
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
        description="Track operating expenses and monitor business spending."
        actions={
          <Button
            onClick={() => {
              setEditingExpense(null)
              setFormOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Record Expense
          </Button>
        }
      />

      {/* 3 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Today's Expenses */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Today&apos;s Expenses</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight mt-1">
            Rs. {formatMoney(summary.todayExpenses)}
          </div>
          <p className="text-xs text-slate-500 font-medium">Expenses recorded today</p>
        </div>

        {/* Card 2: This Month's Expenses */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>This Month</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight mt-1">
            Rs. {formatMoney(summary.thisMonthExpenses)}
          </div>
          <p className="text-xs text-slate-500 font-medium">Current calendar month total</p>
        </div>

        {/* Card 3: All-Time Total Expenses */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>All-Time</span>
            <div className="h-9 w-9 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight mt-1">
            Rs. {formatMoney(summary.totalExpenses)}
          </div>
          <p className="text-xs text-slate-500 font-medium">Total recorded expenses</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <SearchInput
              aria-label="Search expenses by title, notes, or category"
              placeholder="Search expenses by title, notes, or category..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="w-full max-w-full"
            />
          </div>

          <div className="sm:col-span-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger aria-label="Filter expenses by category" className="h-11 bg-white border-slate-300 text-slate-800 text-xs font-medium rounded-lg">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="rent">Rent</SelectItem>
                <SelectItem value="utilities">Utilities (Water, Power, Net)</SelectItem>
                <SelectItem value="salaries">Salaries & Wages</SelectItem>
                <SelectItem value="supplies">Supplies & Stationery</SelectItem>
                <SelectItem value="transport">Transport & Logistics</SelectItem>
                <SelectItem value="maintenance">Maintenance & Repairs</SelectItem>
                <SelectItem value="other">Other Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-3 flex gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger aria-label="Filter expenses by date range" className="h-11 bg-white border-slate-300 text-slate-800 text-xs font-medium rounded-lg flex-1">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today Only</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
              </SelectContent>
            </Select>

            {isFilterActive && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="h-11 px-3 border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg shrink-0"
                title="Clear active filters"
                aria-label="Clear active filters"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isFilterActive && (
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500"></span>
            Filters active. Displaying {filteredExpenses.length} matching expense record{filteredExpenses.length === 1 ? '' : 's'}.
          </div>
        )}
      </div>

      {/* Expense Table */}
      <DataTable
        data={filteredExpenses}
        columns={columns}
        emptyTitle={isFilterActive ? 'No matching expenses found' : 'No expenses recorded'}
        emptyDescription={
          isFilterActive
            ? 'No expense entries match your search or filter criteria. Try adjusting your filters.'
            : 'Start tracking operational costs (rent, utilities, salaries, supplies) to monitor business net profit.'
        }
        emptyAction={
          isFilterActive ? (
            <Button
              onClick={handleClearFilters}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4 text-xs"
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditingExpense(null)
                setFormOpen(true)
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4 text-xs"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Record Expense
            </Button>
          )
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
          setDeletingExpense(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Record"
        description={
          deletingExpense
            ? `Are you sure you want to remove "${deletingExpense.title || deletingExpense.description}" (Rs. ${formatMoney(deletingExpense.amount)})? This action cannot be undone.`
            : 'Are you sure you want to remove this expense record? This action cannot be undone.'
        }
        confirmText="Delete Expense"
      />
    </div>
  )
}
