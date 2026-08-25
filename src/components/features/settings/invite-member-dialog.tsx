"use client"

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
      <DialogContent className="sm:max-w-[460px] bg-white border-slate-200 text-slate-900 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-indigo-600" /> Invite Team Member
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            Add team members to your business workspace and assign role-based access permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* User Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold text-slate-700">
              Team Member Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-600 font-medium">{errors.email.message}</p>}
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs font-bold text-slate-700">
              Assigned Role *
            </Label>
            <select
              id="role"
              {...register('role')}
              className="w-full h-10 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm px-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 font-medium shadow-xs"
            >
              <option value="admin">Admin (Operational management, reports, inventory)</option>
              <option value="staff">Staff (POS Billing, Stock Viewing, Products Viewing)</option>
            </select>
            {errors.role && <p className="text-xs text-red-600 font-medium">{errors.role.message}</p>}
          </div>

          {/* Role Overview Guide */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1 text-slate-600">
            <p className="font-bold text-slate-900">Role Permissions Overview:</p>
            <p>• <strong className="text-indigo-700">Admin</strong>: Full access to products, stock, sales, POS, and financial reports.</p>
            <p>• <strong className="text-emerald-700">Staff</strong>: Operational access for POS cashier billing and inventory viewing.</p>
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
              Send Team Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
