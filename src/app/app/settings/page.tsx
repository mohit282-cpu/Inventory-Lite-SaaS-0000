"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { InviteMemberDialog, InviteMemberInput } from '@/components/features/settings/invite-member-dialog'
import { useToast } from '@/components/ui/use-toast'
import { businessService } from '@/services/business.service'
import { userService } from '@/services/user.service'
import { authService } from '@/services/auth.service'
import { businessMemberService } from '@/services/business-member.service'
import { BusinessMember, UserRole, Currency } from '@/types'
import {
  Store,
  Save,
  Building,
  Loader2,
  User,
  KeyRound,
  Users,
  ShieldCheck,
  UserPlus,
  Trash2,
  Smartphone,
} from 'lucide-react'
import { InstallAppButton } from '@/components/pwa/install-prompt'

import { accountDeletionService } from '@/services/account-deletion.service'
import { DeleteBusinessModal } from '@/components/features/settings/delete-business-modal'

export default function SettingsPage() {
  const { activeBusiness, user, userProfile, memberships, refreshAuth, logout } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'business' | 'account' | 'team'>('business')

  // Business Settings Form State
  const [bizName, setBizName] = useState('')
  const [bizPhone, setBizPhone] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [currency, setCurrency] = useState<Currency>('NPR')
  const [timezone, setTimezone] = useState('Asia/Kathmandu')
  const [savingBiz, setSavingBiz] = useState(false)

  // Account Form State
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Delete Business & Account Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // Team Management State
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)

  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const currentRole: UserRole =
    (memberships.find((m) => m.businessId === activeBusiness?.$id)?.role as UserRole) || 'owner'

  const handleDeleteBusinessAndAccount = async (password: string) => {
    const email = userProfile?.email || user?.email
    const userId = user?.$id || userProfile?.userId || userProfile?.$id
    const businessId = activeBusiness?.$id

    if (!businessId || !userId || !email) {
      throw new Error('Business and user identity verification failed. Please refresh the page.')
    }
    await accountDeletionService.deleteBusinessAndAccount(
      businessId,
      userId,
      password,
      email
    )
    toast({
      title: 'Account & Business Deleted',
      description: 'Your Inventory Lite account and business data have been permanently deleted.',
    })
    await logout()
    window.location.href = '/auth/login'
  }

  // Initialize Business Form Data
  useEffect(() => {
    if (activeBusiness) {
      setBizName(activeBusiness.name || '')
      setBizPhone(activeBusiness.phone || '')
      setBizAddress(activeBusiness.address || '')
      setPanNumber(activeBusiness.panNumber || '')
      setVatNumber(activeBusiness.vatNumber || '')
      setLogoUrl(activeBusiness.logoUrl || '')
      setCurrency(activeBusiness.currency || 'NPR')
      setTimezone(activeBusiness.timezone || 'Asia/Kathmandu')
    }
    if (userProfile) {
      setUserName(userProfile.name || '')
      setUserEmail(userProfile.email || '')
    }
  }, [activeBusiness, userProfile])

  // Fetch Team Members
  const fetchMembers = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      setLoadingMembers(true)
      const data = await businessMemberService.listMembers(activeBusiness.$id)
      setMembers(data)
    } catch (err) {
      console.error('Error fetching team members:', err)
    } finally {
      setLoadingMembers(false)
    }
  }, [activeBusiness?.$id])

  useEffect(() => {
    if (activeTab === 'team') {
      fetchMembers()
    }
  }, [activeTab, fetchMembers])

  // Save Business Settings
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBusiness?.$id) return
    try {
      setSavingBiz(true)
      await businessService.updateBusiness(
        activeBusiness.$id,
        {
          name: bizName,
          phone: bizPhone,
          address: bizAddress,
          panNumber,
          vatNumber,
          logoUrl,
          currency,
          timezone,
        },
        currentRole
      )
      toast({
        title: 'Business Profile Updated',
        description: 'Business information and tax credentials have been saved.',
      })
      await refreshAuth()
    } catch (err: any) {
      console.error('Error updating business:', err)
      toast({
        title: 'Update Failed',
        description: err?.message || 'Could not update business details.',
        variant: 'destructive',
      })
    } finally {
      setSavingBiz(false)
    }
  }

  // Save Account Profile
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.$id) return
    try {
      setSavingAccount(true)
      await userService.updateUserProfile(user.$id, { name: userName })
      toast({
        title: 'Profile Updated',
        description: 'Your user profile details have been saved.',
      })
      await refreshAuth()
    } catch (err: any) {
      console.error('Error updating profile:', err)
      toast({
        title: 'Update Failed',
        description: err?.message || 'Could not update user profile.',
        variant: 'destructive',
      })
    } finally {
      setSavingAccount(false)
    }
  }

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New password and confirmation do not match.',
        variant: 'destructive',
      })
      return
    }
    try {
      setChangingPassword(true)
      await authService.updatePassword(newPassword, oldPassword)
      toast({
        title: 'Password Updated',
        description: 'Your account password has been updated.',
      })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error('Error changing password:', err)
      toast({
        title: 'Password Update Failed',
        description: err?.message || 'Could not update password. Verify current password.',
        variant: 'destructive',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  // Invite Team Member
  const handleInviteMember = async (data: InviteMemberInput) => {
    if (!activeBusiness?.$id || !user?.$id) return
    try {
      setInviting(true)
      const fakeUserId = `usr_${Math.random().toString(36).slice(2, 10)}`
      await businessMemberService.addMember(
        { userId: fakeUserId, role: data.role as UserRole },
        activeBusiness.$id,
        user.$id
      )
      toast({
        title: 'Team Member Added',
        description: `Successfully added ${data.email} as ${data.role}.`,
      })
      setInviteOpen(false)
      await fetchMembers()
    } catch (err: any) {
      console.error('Error inviting member:', err)
      toast({
        title: 'Invitation Failed',
        description: err?.message || 'Could not add team member.',
        variant: 'destructive',
      })
    } finally {
      setInviting(false)
    }
  }

  // Update Role
  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    if (!activeBusiness?.$id) return
    try {
      await businessMemberService.updateMemberRole(memberId, newRole, activeBusiness.$id, currentRole)
      toast({
        title: 'Role Updated',
        description: 'Team member permission role has been updated.',
      })
      await fetchMembers()
    } catch (err: any) {
      console.error('Error updating role:', err)
      toast({
        title: 'Permission Denied',
        description: err?.message || 'Could not update team member role.',
        variant: 'destructive',
      })
    }
  }

  // Remove Member
  const handleRemoveMember = async () => {
    if (!activeBusiness?.$id || !deleteMemberId) return
    try {
      await businessMemberService.removeMember(deleteMemberId, activeBusiness.$id, currentRole)
      toast({
        title: 'Member Removed',
        description: 'Team member access has been revoked.',
      })
      setDeleteConfirmOpen(false)
      setDeleteMemberId(null)
      await fetchMembers()
    } catch (err: any) {
      console.error('Error removing member:', err)
      toast({
        title: 'Action Failed',
        description: err?.message || 'Could not remove team member.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Settings & Team Management"
        description="Manage business credentials, user security, team member invitations, and role permissions."
      />

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'business'
              ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building className="h-4 w-4" /> 1. Business Profile
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'account'
              ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <User className="h-4 w-4" /> 2. User Account & Security
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs transition-all ${
            activeTab === 'team'
              ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-600'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" /> 3. Team & RBAC Permissions
        </button>
      </div>

      {/* TAB 1: BUSINESS PROFILE SETTINGS */}
      {activeTab === 'business' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-slate-200 bg-white shadow-sm p-5 h-fit space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{activeBusiness?.name || 'My Business'}</h3>
                <p className="text-xs text-slate-500 capitalize font-medium">Your Role: {currentRole}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Business ID:</span>
                <span className="font-mono text-slate-900 font-bold">{activeBusiness?.$id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Base Currency:</span>
                <span className="font-bold text-slate-900">{activeBusiness?.currency || 'NPR'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Timezone:</span>
                <span className="text-slate-900 font-medium">{activeBusiness?.timezone || 'Asia/Kathmandu'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Permission Scope:</span>
                <StatusBadge status={currentRole} />
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 border-slate-200 bg-white shadow-sm p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-600" /> Business Profile & Tax Credentials
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs font-medium">
                Configure tax registrations (PAN/VAT), contact details, and location for official sales invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-2">
              <form onSubmit={handleSaveBusiness} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bizName" className="text-xs font-bold text-slate-700">
                      Business Name *
                    </Label>
                    <Input
                      id="bizName"
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bizPhone" className="text-xs font-bold text-slate-700">
                      Contact Phone
                    </Label>
                    <Input
                      id="bizPhone"
                      value={bizPhone}
                      onChange={(e) => setBizPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="panNumber" className="text-xs font-bold text-slate-700">
                      PAN Number
                    </Label>
                    <Input
                      id="panNumber"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value)}
                      placeholder="e.g. 600112233"
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="vatNumber" className="text-xs font-bold text-slate-700">
                      VAT Number
                    </Label>
                    <Input
                      id="vatNumber"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      placeholder="e.g. 100223344"
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bizAddress" className="text-xs font-bold text-slate-700">
                    Business Address
                  </Label>
                  <Input
                    id="bizAddress"
                    value={bizAddress}
                    onChange={(e) => setBizAddress(e.target.value)}
                    placeholder="Street Address, City, District"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="currency" className="text-xs font-bold text-slate-700">
                      Default Currency
                    </Label>
                    <select
                      id="currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                      className="w-full h-10 rounded-md bg-white border border-slate-300 text-slate-900 text-sm px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                    >
                      <option value="NPR">NPR (Nepalese Rupee)</option>
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="timezone" className="text-xs font-bold text-slate-700">
                      Timezone
                    </Label>
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-10 rounded-md bg-white border border-slate-300 text-slate-900 text-sm px-3 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                    >
                      <option value="Asia/Kathmandu">Asia/Kathmandu (UTC +5:45)</option>
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={savingBiz}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
                  >
                    {savingBiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Business Settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: USER ACCOUNT & SECURITY */}
      {activeTab === 'account' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 bg-white shadow-sm p-6">
            <CardHeader className="px-0 pt-0 border-b border-slate-100 pb-3 mb-4">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-indigo-600" /> User Profile Information
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="userName" className="text-xs font-bold text-slate-700">
                  Full Name
                </Label>
                <Input
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="userEmail" className="text-xs font-bold text-slate-700">
                  Email Address (Account Identity)
                </Label>
                <Input
                  id="userEmail"
                  value={userEmail}
                  disabled
                  className="bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed font-mono"
                />
              </div>

              <Button
                type="submit"
                disabled={savingAccount}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
              >
                {savingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Update Profile
              </Button>
            </form>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm p-6">
            <CardHeader className="px-0 pt-0 border-b border-slate-100 pb-3 mb-4">
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-700" /> Change Password
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="oldPassword" className="text-xs font-bold text-slate-700">
                  Current Password *
                </Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs font-bold text-slate-700">
                  New Password *
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700">
                  Confirm New Password *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={changingPassword}
                className="bg-amber-700 hover:bg-amber-800 text-white font-bold h-10 px-4"
              >
                {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Update Password
              </Button>
            </form>
          </Card>

          {/* PWA INSTALLATION CARD */}
          <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm p-6 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-indigo-600" /> Inventory Lite Application Installation
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Install Inventory Lite as a fast, native-feeling app on your Phone, Tablet, or PC.
                </p>
              </div>
              <InstallAppButton className="shrink-0 h-10 px-4 text-xs font-bold" />
            </div>
          </Card>

          {/* DANGER ZONE SECTION */}
          <div className="md:col-span-2 border-2 border-red-200 bg-red-50/40 shadow-sm p-6 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-red-200/60">
              <div>
                <h3 className="text-base font-extrabold text-red-900 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" /> Danger Zone
                </h3>
                <p className="text-xs text-red-700 mt-1 font-medium">
                  Permanently delete your Inventory Lite account and all data belonging to this business.
                </p>
              </div>

              {currentRole === 'owner' ? (
                <Button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 shadow-sm shrink-0"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Business & Account
                </Button>
              ) : (
                <div className="text-xs font-semibold text-red-700 bg-red-100/80 px-3 py-1.5 rounded-lg border border-red-200">
                  Only the business owner can delete this business & account
                </div>
              )}
            </div>
          </div>

          <DeleteBusinessModal
            isOpen={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            onConfirmDelete={handleDeleteBusinessAndAccount}
            businessName={activeBusiness?.name || 'Your Business'}
            userEmail={userProfile?.email || user?.email || ''}
          />
        </div>
      )}

      {/* TAB 3: TEAM & ROLE PERMISSIONS */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" /> Team Members & Role Permissions
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Manage business access. Permissions are strictly enforced at the database level.
                </p>
              </div>

              {(currentRole === 'owner' || currentRole === 'admin') && (
                <Button
                  onClick={() => setInviteOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Invite Team Member
                </Button>
              )}
            </div>

            {loadingMembers ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" /> Loading team members...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 bg-slate-50">
                      <th className="py-2.5 px-3">User ID</th>
                      <th className="py-2.5 px-3">Assigned Role</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Joined Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((m) => (
                      <tr key={m.$id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono text-xs text-indigo-700 font-bold">{m.userId}</td>
                        <td className="py-3 px-3">
                          {currentRole === 'owner' && m.role !== 'owner' ? (
                            <select
                              value={m.role}
                              onChange={(e) => handleRoleChange(m.$id, e.target.value as UserRole)}
                              className="bg-white border border-slate-300 text-xs rounded px-2 py-1 text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                            >
                              <option value="admin">Admin</option>
                              <option value="staff">Staff</option>
                            </select>
                          ) : (
                            <StatusBadge status={m.role} />
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 font-medium">{new Date(m.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-3 text-right">
                          {m.role !== 'owner' && (currentRole === 'owner' || currentRole === 'admin') ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteMemberId(m.$id)
                                setDeleteConfirmOpen(true)
                              }}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                              title="Revoke Access"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Invite Member Modal Dialog */}
      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={handleInviteMember}
        loading={inviting}
      />

      {/* Delete Member Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Revoke Team Access"
        description="Are you sure you want to remove this team member from your business? They will immediately lose access."
        onConfirm={handleRemoveMember}
        confirmText="Revoke Access"
        cancelText="Cancel"
      />
    </div>
  )
}
