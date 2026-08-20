"use client"

import React, { useState } from 'react'
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
import { AlertCircle, Trash2, Loader2, ShieldAlert, Lock } from 'lucide-react'

interface DeleteBusinessModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmDelete: (password: string) => Promise<void>
  businessName: string
  userEmail: string
}

export function DeleteBusinessModal({
  isOpen,
  onClose,
  onConfirmDelete,
  businessName,
}: DeleteBusinessModalProps) {
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [password, setPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  const isTextMatch = deleteConfirmationText.trim() === 'DELETE'
  const isPasswordEntered = password.length > 0

  const handleClose = () => {
    if (isDeleting) return
    setDeleteConfirmationText('')
    setPassword('')
    setErrorMessage(null)
    setStep(1)
    onClose()
  }

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isTextMatch || !isPasswordEntered || isDeleting) return

    try {
      setErrorMessage(null)
      setIsDeleting(true)
      await onConfirmDelete(password)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Deletion failed. Please verify your password.')
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white border-red-200">
        <DialogHeader className="space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center border border-red-200">
            <Trash2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-extrabold text-slate-900 text-lg">
            Delete your business permanently?
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-600">
            This action cannot be undone. <span className="font-bold text-slate-900">{businessName}</span> and all associated Inventory Lite data will be permanently erased.
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2 text-left">
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                <span>The following entities will be permanently erased:</span>
              </div>
              <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-5 font-medium">
                <li>Business profile & tax settings</li>
                <li>Products catalog & pricing</li>
                <li>Product Categories</li>
                <li>Stock movement history & audit logs</li>
                <li>Customers directory</li>
                <li>Customer credit / Udha balances</li>
                <li>Sales transaction records</li>
                <li>Invoices & line items</li>
                <li>Expense logs</li>
                <li>Reports & generated analytics</li>
                <li>Team memberships & invitations</li>
                <li>Your user profile & account session</li>
              </ul>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Warning: Once deleted, this information cannot be recovered.</span>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto h-10 border-slate-300 text-slate-700 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setStep(2)}
                className="w-full sm:w-auto h-10 bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
              >
                Proceed to Security Verification
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleDeleteSubmit} className="space-y-4 py-2 text-left">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="deleteConfirm" className="text-xs font-bold text-slate-800">
                1. Type <span className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-200">DELETE</span> to confirm:
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type DELETE"
                className="h-10 text-sm font-mono focus:border-red-500 focus:ring-red-500"
                disabled={isDeleting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="text-xs font-bold text-slate-800">
                2. Enter your current password to confirm identity:
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="currentPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your account password"
                  className="pl-9 h-10 text-sm focus:border-red-500 focus:ring-red-500"
                  disabled={isDeleting}
                />
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-xs font-bold text-red-700">Are you absolutely sure?</p>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isDeleting}
                className="w-full sm:w-auto h-10 border-slate-300 text-slate-700 font-bold text-xs"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={!isTextMatch || !isPasswordEntered || isDeleting}
                className="w-full sm:w-auto h-10 bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting business & account...
                  </>
                ) : (
                  'Permanently Delete Everything'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
