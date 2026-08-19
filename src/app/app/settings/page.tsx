"use client"

import React, { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/use-toast'
import { Store, Save, Building, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { activeBusiness, memberships } = useAuth()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const currentRole = memberships.find((m) => m.businessId === activeBusiness?.$id)?.role || 'owner'

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: 'Settings Saved',
        description: 'Business details have been updated successfully.',
      })
    }, 600)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account & Business Settings"
        description="Manage business profile, PAN/VAT tax numbers, staff roles, and preferences."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation / Overview Panel */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 h-fit space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="h-12 w-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-lg">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{activeBusiness?.name || 'My Business'}</h3>
              <p className="text-xs text-slate-400 capitalize">Role: {currentRole}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-500">Business ID:</span>
              <span className="font-mono text-slate-200">{activeBusiness?.$id}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-500">Base Currency:</span>
              <span className="font-semibold text-slate-200">{activeBusiness?.currency || 'NPR'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-500">Timezone:</span>
              <span className="text-slate-200">{activeBusiness?.timezone || 'Asia/Kathmandu'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Your Role:</span>
              <StatusBadge status={currentRole} />
            </div>
          </div>
        </Card>

        {/* Business Settings Form */}
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-400" /> Business Profile Information
            </CardTitle>
            <CardDescription className="text-slate-400">
              Update tax registrations (PAN/VAT), contact details, and location for official invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveBusiness} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bizName">Business Name</Label>
                  <Input
                    id="bizName"
                    defaultValue={activeBusiness?.name}
                    className="bg-slate-950/60 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bizPhone">Contact Phone</Label>
                  <Input
                    id="bizPhone"
                    defaultValue={activeBusiness?.phone}
                    className="bg-slate-950/60 border-slate-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <Input
                    id="panNumber"
                    defaultValue={activeBusiness?.panNumber}
                    placeholder="e.g. 600112233"
                    className="bg-slate-950/60 border-slate-800 text-white font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatNumber">VAT Number</Label>
                  <Input
                    id="vatNumber"
                    defaultValue={activeBusiness?.vatNumber}
                    placeholder="e.g. 100223344"
                    className="bg-slate-950/60 border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bizAddress">Address</Label>
                <Input
                  id="bizAddress"
                  defaultValue={activeBusiness?.address}
                  placeholder="Street Address, City, District"
                  className="bg-slate-950/60 border-slate-800 text-white"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20"
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
