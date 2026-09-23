"use client"

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema } from '@/lib/validations'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle } from 'lucide-react'
import { Category } from '@/types'

type CategoryFormValues = z.infer<typeof categorySchema>

interface CategoryFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CategoryFormValues) => Promise<void>
  initialData?: Category | null
  isLoading?: boolean
}

export function CategoryFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: CategoryFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const descriptionVal = watch('description') || ''

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || '',
      })
    } else {
      reset({
        name: '',
        description: '',
      })
    }
    setServerError(null)
  }, [initialData, isOpen, reset])

  const handleFormSubmit = async (data: CategoryFormValues) => {
    try {
      setServerError(null)
      const normalizedData = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
      }
      await onSubmit(normalizedData)
      onClose()
    } catch (err: any) {
      console.error('[CategoryFormDialog] Form submission failed:', err)
      setServerError(err?.message || 'Failed to save category. Please check your input.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {initialData ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {initialData
              ? 'Update the details and description for this category.'
              : 'Add a new product category to organize your inventory.'}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="category-name" className="text-xs font-bold text-slate-700">
                Category Name *
              </Label>
              <span className="text-[10px] text-slate-400 font-medium">Max 50 chars</span>
            </div>
            <Input
              id="category-name"
              placeholder="e.g. Beverages, Electronics, Groceries"
              maxLength={50}
              {...register('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-red-600 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="category-description" className="text-xs font-bold text-slate-700">
                Description (Optional)
              </Label>
              <span className="text-[10px] text-slate-400 font-mono">
                {descriptionVal.length} / 200
              </span>
            </div>
            <Input
              id="category-description"
              placeholder="Brief description of products in this category"
              maxLength={200}
              {...register('description')}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-red-600 font-medium">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto font-medium border-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : initialData ? (
                'Update Category'
              ) : (
                'Save Category'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

