"use client"

import React, { useEffect } from 'react'
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
import { Loader2 } from 'lucide-react'

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
      amount: 0,
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
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        notes: '',
      })
    }
  }, [initialData, reset, open])

  const handleFormSubmit = async (data: ExpenseInput) => {
    await onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">
            {isEditing ? 'Edit Expense Record' : 'Record Business Expense'}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {isEditing
              ? 'Update details for this expenditure record.'
              : 'Log operational expenses (rent, utilities, salaries, supplies) for accurate profit calculations.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Title / Description */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold text-slate-300">
              Expense Description / Title *
            </Label>
            <Input
              id="title"
              placeholder="e.g. Office Electricity Bill, Shop Rent"
              {...register('title')}
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500"
            />
            {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
          </div>

          {/* Category & Amount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold text-slate-300">
                Category *
              </Label>
              <select
                id="category"
                {...register('category')}
                className="w-full h-10 rounded-md bg-slate-950 border border-slate-800 text-white text-sm px-3 focus:outline-none focus:border-indigo-500"
              >
                <option value="rent">Rent</option>
                <option value="utilities">Utilities (Water, Power, Net)</option>
                <option value="salaries">Salaries & Wages</option>
                <option value="supplies">Supplies & Stationery</option>
                <option value="transport">Transport & Logistics</option>
                <option value="maintenance">Maintenance & Repairs</option>
                <option value="other">Other Expense</option>
              </select>
              {errors.category && <p className="text-xs text-red-400">{errors.category.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold text-slate-300">
                Amount (Rs.) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount')}
                className="bg-slate-950 border-slate-800 text-white font-mono placeholder:text-slate-600 focus:border-indigo-500"
              />
              {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-xs font-semibold text-slate-300">
              Expense Date *
            </Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500"
            />
            {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold text-slate-300">
              Notes / Reference (Optional)
            </Label>
            <Input
              id="notes"
              placeholder="e.g. Receipt #104, Paid via Fonepay"
              {...register('notes')}
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/20"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Record Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
