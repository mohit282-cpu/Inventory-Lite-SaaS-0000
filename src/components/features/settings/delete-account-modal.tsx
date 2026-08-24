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
      <DialogContent className="sm:max-w-lg bg-white border-red-200">
        <DialogHeader className="space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200">
            <Trash2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-extrabold text-slate-900 text-lg">
            Delete Account & Business?
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-600 leading-relaxed">
            This will permanently delete your Inventory Lite business and all business data.
            <br />
            <span className="font-semibold text-rose-700">
              Your authentication account will not be deleted. It will be permanently blocked from accessing Inventory Lite.
            </span>
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2 text-left">
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-lg space-y-2">
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

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1 text-amber-900 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Export Warning:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug pl-6">
                Business records will be permanently deleted. Export your data before proceeding if you need local backup files.
              </p>
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
                variant="outline"
                onClick={handleExportRecords}
                disabled={isExporting}
                className="w-full sm:w-auto h-10 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 text-indigo-600" />}
                Export My Records
              </Button>

              <Button
                type="button"
                onClick={() => setStep(2)}
                className="w-full sm:w-auto h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                Continue to Confirmation <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleDeleteSubmit} className="space-y-4 py-2 text-left">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-semibold">
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
                className="h-10 text-sm font-mono focus:border-rose-500 focus:ring-rose-500/20"
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
                className="h-10 text-sm focus:border-rose-500 focus:ring-rose-500/20"
                disabled={isDeleting}
              />
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
                disabled={!isNameMatch || !isPasswordEntered || isDeleting}
                className="w-full sm:w-auto h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2"
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
