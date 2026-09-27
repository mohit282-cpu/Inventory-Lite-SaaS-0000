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
      <DialogContent className="max-w-lg w-[92vw] max-h-[85vh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-red-200 shadow-2xl rounded-2xl">
        {/* Fixed Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 shrink-0 text-center space-y-1.5 bg-white">
          <div className="mx-auto h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center border border-red-200 shrink-0 shadow-2xs">
            <Trash2 className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
            Delete your business permanently?
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            This action cannot be undone. <span className="font-bold text-slate-900">{businessName}</span> and all associated Inventory Lite data will be permanently erased.
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Warning & Impact Scope */}
        {step === 1 ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-left">
              {/* Red Warning Panel with Grouped Impact List */}
              <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                  <span>The following data will be PERMANENTLY deleted:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 text-[11px] text-slate-700 font-medium">
                  <div className="bg-white/90 p-2.5 rounded-lg border border-red-100 space-y-1">
                    <span className="font-bold text-red-900 text-[10px] uppercase tracking-wider block">Business & Team</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                      <li>Business profile & tax settings</li>
                      <li>Team memberships & invites</li>
                      <li>User profile session data</li>
                    </ul>
                  </div>

                  <div className="bg-white/90 p-2.5 rounded-lg border border-red-100 space-y-1">
                    <span className="font-bold text-red-900 text-[10px] uppercase tracking-wider block">Catalog & Stock</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                      <li>Products catalog & pricing</li>
                      <li>Product categories</li>
                      <li>Stock history & audit logs</li>
                    </ul>
                  </div>

                  <div className="bg-white/90 p-2.5 rounded-lg border border-red-100 space-y-1">
                    <span className="font-bold text-red-900 text-[10px] uppercase tracking-wider block">Customers & Sales</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                      <li>Customers directory</li>
                      <li>Udhaar / credit balances</li>
                      <li>Sales transactions & invoices</li>
                    </ul>
                  </div>

                  <div className="bg-white/90 p-2.5 rounded-lg border border-red-100 space-y-1">
                    <span className="font-bold text-red-900 text-[10px] uppercase tracking-wider block">Finance & Reports</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                      <li>Expense transaction logs</li>
                      <li>Generated financial reports</li>
                      <li>Analytics & history</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Irreversibility Warning */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Warning: Once deleted, this information cannot be recovered.</span>
              </div>
            </div>

            {/* Fixed Footer */}
            <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/60 shrink-0 flex flex-col-reverse sm:flex-row gap-2 justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto h-10 min-h-[44px] border-slate-300 text-slate-700 font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setStep(2)}
                className="w-full sm:w-auto h-10 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
              >
                Proceed to Security Verification →
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Step 2: Verification Form */
          <form onSubmit={handleDeleteSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-left">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="deleteConfirm" className="text-xs font-bold text-slate-800">
                  1. Type <span className="font-mono text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-200 font-bold">DELETE</span> to confirm:
                </Label>
                <Input
                  id="deleteConfirm"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder="Type DELETE"
                  className="h-10 text-sm font-mono focus:border-red-500 focus:ring-red-500 bg-white"
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
                    className="pl-9 h-10 text-sm focus:border-red-500 focus:ring-red-500 bg-white"
                    disabled={isDeleting}
                  />
                </div>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                <p className="text-xs font-bold text-red-700">Are you absolutely sure you want to delete {businessName}?</p>
              </div>
            </div>

            {/* Fixed Footer */}
            <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/60 shrink-0 flex flex-col-reverse sm:flex-row gap-2 justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isDeleting}
                className="w-full sm:w-auto h-10 min-h-[44px] border-slate-300 text-slate-700 font-bold text-xs"
              >
                ← Back
              </Button>
              <Button
                type="submit"
                disabled={!isTextMatch || !isPasswordEntered || isDeleting}
                className="w-full sm:w-auto h-10 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting business...
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

