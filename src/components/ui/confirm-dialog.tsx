"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'default'
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                variant === 'destructive'
                  ? 'bg-destructive/20 text-destructive'
                  : 'bg-indigo-500/20 text-indigo-400'
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">{title}</DialogTitle>
              <DialogDescription className="text-sm text-slate-400 mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              variant === 'destructive'
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
