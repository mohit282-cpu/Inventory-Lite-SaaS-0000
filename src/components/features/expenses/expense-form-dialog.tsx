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
      <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 text-slate-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {isEditing ? 'Edit Expense Record' : 'Record Business Expense'}
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            {isEditing
              ? 'Update details for this expenditure record.'
              : 'Log operational expenses (rent, utilities, salaries, supplies) for accurate profit calculations.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Title / Description */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-bold text-slate-700">
              Expense Description / Title *
            </Label>
            <Input
              id="title"
              placeholder="e.g. Office Electricity Bill, Shop Rent"
              {...register('title')}
            />
            {errors.title && <p className="text-xs text-red-600 font-medium">{errors.title.message}</p>}
          </div>

          {/* Category & Amount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-bold text-slate-700">
                Category *
              </Label>
              <select
                id="category"
                {...register('category')}
                className="w-full h-10 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 font-medium shadow-xs"
              >
                <option value="rent">Rent</option>
                <option value="utilities">Utilities (Water, Power, Net)</option>
                <option value="salaries">Salaries & Wages</option>
                <option value="supplies">Supplies & Stationery</option>
                <option value="transport">Transport & Logistics</option>
                <option value="maintenance">Maintenance & Repairs</option>
                <option value="other">Other Expense</option>
              </select>
              {errors.category && <p className="text-xs text-red-600 font-medium">{errors.category.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-bold text-slate-700">
                Amount (Rs.) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount')}
                className="font-mono"
              />
              {errors.amount && <p className="text-xs text-red-600 font-medium">{errors.amount.message}</p>}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date" className="text-xs font-bold text-slate-700">
              Expense Date *
            </Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
            />
            {errors.date && <p className="text-xs text-red-600 font-medium">{errors.date.message}</p>}
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-bold text-slate-700">
              Notes / Reference (Optional)
            </Label>
            <Input
              id="notes"
              placeholder="e.g. Receipt #104, Paid via Fonepay"
              {...register('notes')}
            />
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
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
