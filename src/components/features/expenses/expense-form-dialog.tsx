"use client"

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { expenseSchema, ExpenseInput } from '@/lib/validations'
import { Expense } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Receipt } from 'lucide-react'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: ExpenseInput) => Promise<void>
  initialData?: Expense | null
  loading?: boolean
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  loading = false,
}: ExpenseFormDialogProps) {
  const isEditing = !!initialData

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      category: 'supplies',
      amount: undefined as any,
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || initialData.description || '',
        category: (initialData.category as any) || 'supplies',
        amount: initialData.amount || 0,
        date: initialData.date ? initialData.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        notes: initialData.notes || '',
      })
    } else {
      reset({
        title: '',
        category: 'supplies',
        amount: '' as any,
        date: new Date().toISOString().slice(0, 10),
        notes: '',
      })
    }
  }, [initialData, reset, open])

  const handleFormSubmit = async (data: ExpenseInput) => {
    await onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={(op) => { if (!op && !loading) onOpenChange(false) }}>
      <DialogContent
        aria-modal="true"
        className="max-w-lg w-[95vw] sm:w-full border-slate-200 bg-white text-slate-900 shadow-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl z-[60]"
      >
        {/* Sticky Header */}
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Expense Record' : 'Record Expense'}
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs mt-0.5">
                Add an operating expense to your business records.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form id="expense-form" onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4 scrollbar-thin scrollbar-thumb-slate-300">
          {/* Title / Description */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-extrabold text-slate-700">
              Expense Title *
            </Label>
            <Input
              id="title"
              placeholder="e.g. Electricity Bill, Shop Rent, Staff Tea"
              disabled={loading}
              className="h-11 text-xs bg-white border-slate-300 text-slate-900 rounded-lg"
              {...register('title')}
            />
            {errors.title && <p className="text-[11px] text-red-600 font-medium">{errors.title.message}</p>}
          </div>

          {/* Category & Amount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-extrabold text-slate-700">
                Category *
              </Label>
              <select
                id="category"
                disabled={loading}
                {...register('category')}
                className="w-full h-11 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs px-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 font-medium shadow-xs"
              >
                <option value="rent">Rent</option>
                <option value="utilities">Utilities (Water, Power, Net)</option>
                <option value="salaries">Salaries & Wages</option>
                <option value="supplies">Supplies & Stationery</option>
                <option value="transport">Transport & Logistics</option>
                <option value="maintenance">Maintenance & Repairs</option>
                <option value="other">Other Expense</option>
              </select>
              {errors.category && <p className="text-[11px] text-red-600 font-medium">{errors.category.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-extrabold text-slate-700">
                Amount (Rs.) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                disabled={loading}
                className="h-11 font-mono font-bold text-sm bg-white border-slate-300 text-slate-900 rounded-lg"
                {...register('amount')}
              />
              {errors.amount && <p className="text-[11px] text-red-600 font-medium">{errors.amount.message}</p>}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-xs font-extrabold text-slate-700">
              Expense Date *
            </Label>
            <Input
              id="date"
              type="date"
              disabled={loading}
              className="h-11 text-xs font-medium bg-white border-slate-300 text-slate-900 rounded-lg"
              {...register('date')}
            />
            {errors.date && <p className="text-[11px] text-red-600 font-medium">{errors.date.message}</p>}
          </div>

          {/* Notes / Reference */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-extrabold text-slate-700">
              Notes / Receipt Reference (Optional)
            </Label>
            <textarea
              id="notes"
              placeholder="e.g. Receipt #EXP-001, Paid via Fonepay"
              disabled={loading}
              className="w-full h-16 p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-none text-slate-900"
              {...register('notes')}
            />
          </div>
        </form>

        {/* Sticky Footer */}
        <DialogFooter className="p-4 border-t border-slate-100 shrink-0 bg-slate-50/90 backdrop-blur-xs flex flex-col-reverse sm:flex-row gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-11 border-slate-300 bg-white text-slate-700 font-semibold rounded-lg text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="expense-form"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-5 shadow-xs disabled:opacity-50 min-w-[140px] rounded-lg text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Expense...
              </>
            ) : (
              isEditing ? 'Save Changes' : 'Record Expense'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
