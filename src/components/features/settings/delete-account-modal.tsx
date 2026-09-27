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
import { AlertCircle, Trash2, Loader2, ShieldAlert, Download, ArrowRight } from 'lucide-react'
import { exportBusinessData } from '@/lib/export-records'
import { useToast } from '@/components/ui/use-toast'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmDelete: (password: string) => Promise<void>
  businessName: string
  businessId?: string
  userEmail?: string
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirmDelete,
  businessName,
  businessId,
  userEmail: _userEmail,
}: DeleteAccountModalProps) {
  const { toast } = useToast()
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [password, setPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  const normalizedExpected = (businessName || '').trim()
  const isNameMatch = deleteConfirmationText.trim() === normalizedExpected
  const isPasswordEntered = password.trim().length > 0

  const handleClose = () => {
    if (isDeleting) return
    setDeleteConfirmationText('')
    setPassword('')
    setErrorMessage(null)
    setStep(1)
    onClose()
  }

  const handleExportRecords = async () => {
    if (!businessId) {
      toast({
        title: 'Export Unavailable',
        description: 'Business ID missing for data export.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsExporting(true)
      await exportBusinessData(businessId, businessName)
      toast({
        title: 'Records Exported 🎉',
        description: 'Your business records have been downloaded to your device as JSON format.',
      })
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err?.message || 'Could not export records.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isNameMatch || !isPasswordEntered || isDeleting) return

    try {
      setErrorMessage(null)
      setIsDeleting(true)
      await onConfirmDelete(password)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Account deletion failed. No changes were completed. Please try again.')
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-[92vw] max-h-[85vh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-rose-200 shadow-2xl rounded-2xl">
        {/* Fixed Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 shrink-0 text-center space-y-1.5 bg-white">
          <div className="mx-auto h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0 shadow-2xs">
            <Trash2 className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
            Delete Account & Business?
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            This will permanently delete your Inventory Lite business and all business data.
            <br />
            <span className="font-semibold text-rose-700">
              Your authentication account will be permanently blocked from accessing Inventory Lite.
            </span>
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-left">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>Data that will be PERMANENTLY ERASED:</span>
                </div>
                <ul className="text-[11px] text-slate-700 space-y-1 list-disc pl-5 font-medium grid grid-cols-2 gap-x-2">
                  <li>Business profile & settings</li>
                  <li>Products & price records</li>
                  <li>Categories directory</li>
                  <li>Stock movement history</li>
                  <li>Customer database</li>
                  <li>Udhaar / credit balances</li>
                  <li>Sales & sale line items</li>
                  <li>Invoices & payment logs</li>
                  <li>Expense entries</li>
                  <li>Reports & analytics</li>
                  <li>Team memberships & roles</li>
                  <li>Uploaded business files</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900 text-xs">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Export Warning:</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug pl-6">
                  Business records will be permanently deleted. Export your data before proceeding if you need local backup files.
                </p>
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

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportRecords}
                  disabled={isExporting}
                  className="w-full sm:w-auto h-10 min-h-[44px] border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-indigo-600" />}
                  Export Records
                </Button>

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto h-10 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleDeleteSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-left">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="businessNameConfirm" className="text-xs font-bold text-slate-800">
                  1. Type <span className="font-mono font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{normalizedExpected}</span> to confirm:
                </Label>
                <Input
                  id="businessNameConfirm"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  placeholder={`Type "${normalizedExpected}" to confirm`}
                  className="h-10 text-sm font-mono focus:border-rose-500 focus:ring-rose-500/20 bg-white"
                  disabled={isDeleting}
                />
                <p className="text-[11px] text-slate-500">Must match your exact business name string.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accountPassword" className="text-xs font-bold text-slate-800">
                  2. Enter your current password for owner re-authentication:
                </Label>
                <Input
                  id="accountPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Current password"
                  className="h-10 text-sm focus:border-rose-500 focus:ring-rose-500/20 bg-white"
                  disabled={isDeleting}
                />
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
                disabled={!isNameMatch || !isPasswordEntered || isDeleting}
                className="w-full sm:w-auto h-10 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting Account...
                  </>
                ) : (
                  'Delete Account Permanently'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

