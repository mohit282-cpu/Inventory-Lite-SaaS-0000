"use client"

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Loader2, ShieldAlert } from 'lucide-react'

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'staff']),
})

export type InviteMemberInput = z.infer<typeof inviteSchema>

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: InviteMemberInput) => Promise<void>
  loading?: boolean
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: InviteMemberDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'staff',
    },
  })

  const handleFormSubmit = async (data: InviteMemberInput) => {
    await onSubmit(data)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-indigo-400" /> Invite Team Member
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Add team members to your business workspace and assign role-based access permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* User Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
              Team Member Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              {...register('email')}
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-indigo-500"
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs font-semibold text-slate-300">
              Assigned Role *
            </Label>
            <select
              id="role"
              {...register('role')}
              className="w-full h-10 rounded-md bg-slate-950 border border-slate-800 text-white text-sm px-3 focus:outline-none focus:border-indigo-500"
            >
              <option value="admin">Admin (Operational management, reports, inventory)</option>
              <option value="staff">Staff (POS Billing, Stock Viewing, Products Viewing)</option>
            </select>
            {errors.role && <p className="text-xs text-red-400">{errors.role.message}</p>}
          </div>

          {/* Role Overview Guide */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1 text-slate-400">
            <p className="font-semibold text-slate-300">Role Permissions Overview:</p>
            <p>• <strong className="text-indigo-400">Admin</strong>: Full access to products, stock, sales, POS, and financial reports.</p>
            <p>• <strong className="text-emerald-400">Staff</strong>: Operational access for POS cashier billing and inventory viewing.</p>
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
              Send Team Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
