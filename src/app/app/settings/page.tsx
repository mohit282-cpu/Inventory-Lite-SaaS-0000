"use client"

import React, { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { useToast } from '@/components/ui/use-toast'
import { businessService } from '@/services/business.service'
import { userService } from '@/services/user.service'
import { authService } from '@/services/auth.service'
import { UserRole, Currency, TaxRegistrationType } from '@/types'
import { getEffectiveTaxRegistration } from '@/lib/localization'
import { formatBSDate } from '@/lib/date/bs-date'
import {
  Store,
  Save,
  Building,
  Loader2,
  User,
  KeyRound,
  ShieldCheck,
  Trash2,
  Smartphone,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { InstallAppButton } from '@/components/pwa/install-prompt'

import { accountDeletionService } from '@/services/account-deletion.service'
import { DeleteBusinessModal } from '@/components/features/settings/delete-business-modal'
import { DeleteAccountModal } from '@/components/features/settings/delete-account-modal'

export default function SettingsPage() {
  const { activeBusiness, user, userProfile, memberships, refreshAuth, logout } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'business' | 'account'>('business')

  // Business Settings Form State
  const [bizName, setBizName] = useState('')
  const [bizPhone, setBizPhone] = useState('')
  const [bizAddress, setBizAddress] = useState('')
  const [taxRegistrationType, setTaxRegistrationType] = useState<TaxRegistrationType>('NONE')
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [currency, setCurrency] = useState<Currency>('NPR')
  const [timezone, setTimezone] = useState('Asia/Kathmandu')
  const [savingBiz, setSavingBiz] = useState(false)

  // Calendar & Localization Preferences State
  const [primaryCalendar, setPrimaryCalendar] = useState<'BS' | 'AD'>('BS')
  const [dateDisplayMode, setDateDisplayMode] = useState<'DUAL' | 'BS_ONLY'>('DUAL')
  const [dateFormat, setDateFormat] = useState<string>('BS_FORMAT')
  const [savingCalendar, setSavingCalendar] = useState(false)

  // Account Form State
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingAccount, setSavingAccount] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Delete Business & Account Modal State
  const [deleteBusinessModalOpen, setDeleteBusinessModalOpen] = useState(false)
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false)

  const currentRole: UserRole =
    (memberships.find((m) => m.businessId === activeBusiness?.$id)?.role as UserRole) || 'owner'

  const handleDeleteBusinessOnly = async (password: string) => {
    const email = userProfile?.email || user?.email
    const userId = user?.$id || userProfile?.userId || userProfile?.$id
    const businessId = activeBusiness?.$id

    if (!businessId || !userId || !email) {
      throw new Error('Business and user identity verification failed. Please refresh the page.')
    }
    await accountDeletionService.deleteBusinessOnly(
      businessId,
      userId,
      password,
      email
    )
    toast({
      title: 'Business Deleted',
      description: 'Your business profile and associated operational data have been permanently deleted.',
    })
    await refreshAuth()
    window.location.href = '/onboarding'
  }

  const handleDeleteAccount = async (password: string) => {
    const email = userProfile?.email || user?.email
    const userId = user?.$id || userProfile?.userId || userProfile?.$id

    if (!userId || !email) {
      throw new Error('User identity verification failed. Please refresh the page.')
    }
    await accountDeletionService.deleteAccount(
      userId,
      password,
      email
    )
    toast({
      title: 'Account Deleted & Blocked',
      description: 'Your business data has been permanently deleted and your account has been blocked.',
    })
    await logout()
    window.location.href = '/account-blocked'
  }

  // Initialize Business Form Data
  useEffect(() => {
    if (activeBusiness) {
      setBizName(activeBusiness.name || '')
      setBizPhone(activeBusiness.phone || '')
      setBizAddress(activeBusiness.address || '')

      const effTax = getEffectiveTaxRegistration(activeBusiness)
      setTaxRegistrationType(effTax.type)
      setTaxRegistrationNumber(effTax.number)

      setLogoUrl(activeBusiness.logoUrl || '')
      setCurrency(activeBusiness.currency || 'NPR')
      setTimezone(activeBusiness.timezone || 'Asia/Kathmandu')
    }

    if (user || activeBusiness) {
      let savedFormat = 'BS_FORMAT'
      let savedPrimary: 'BS' | 'AD' = 'BS'
      let savedMode: 'DUAL' | 'BS_ONLY' = 'DUAL'

      if (typeof window !== 'undefined' && user?.$id) {
        const localPrefs = localStorage.getItem(`calendar_prefs_${user.$id}`)
        if (localPrefs) {
          try {
            const parsed = JSON.parse(localPrefs)
            if (parsed.primaryCalendar) savedPrimary = parsed.primaryCalendar
            if (parsed.dateDisplayMode) savedMode = parsed.dateDisplayMode
            if (parsed.dateFormat) savedFormat = parsed.dateFormat
          } catch {
            // Ignore JSON parse error
          }
        }
      }

      if (typeof window !== 'undefined' && user?.$id && !localStorage.getItem(`calendar_prefs_${user.$id}`)) {
        const prefFormat = (userProfile?.preferences as any)?.dateFormat || activeBusiness?.dateFormat || 'BS_FORMAT'
        savedFormat = prefFormat
        if (prefFormat === 'YYYY-MM-DD' || prefFormat === 'DD/MM/YYYY') {
          savedPrimary = 'AD'
          savedMode = 'DUAL'
        } else if (prefFormat === 'BS_ONLY') {
          savedPrimary = 'BS'
          savedMode = 'BS_ONLY'
        } else {
          savedPrimary = 'BS'
          savedMode = 'DUAL'
        }
      }

      setPrimaryCalendar(savedPrimary)
      setDateDisplayMode(savedMode)
      setDateFormat(savedFormat)
    }

    if (userProfile || user) {
      setUserName(userProfile?.name || user?.name || '')
      setUserEmail(userProfile?.email || user?.email || '')
      setUserPhone(userProfile?.phone || user?.prefs?.phone || (user as any)?.phone || '')
    }
  }, [activeBusiness, userProfile, user])

  const handleSelectPrimaryCalendar = (cal: 'BS' | 'AD') => {
    setPrimaryCalendar(cal)
    if (cal === 'AD') {
      setDateFormat('YYYY-MM-DD')
    } else {
      setDateFormat(dateDisplayMode === 'BS_ONLY' ? 'BS_ONLY' : 'BS_FORMAT')
    }
  }

  const handleSelectDateDisplayMode = (mode: 'DUAL' | 'BS_ONLY') => {
    setDateDisplayMode(mode)
    if (mode === 'BS_ONLY') {
      setPrimaryCalendar('BS')
      setDateFormat('BS_ONLY')
    } else {
      setDateFormat(primaryCalendar === 'AD' ? 'YYYY-MM-DD' : 'BS_FORMAT')
    }
  }

  // Save Calendar Preferences
  const handleSaveCalendar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!user?.$id) return
    try {
      setSavingCalendar(true)
      const computedDateFormat = primaryCalendar === 'AD' ? 'YYYY-MM-DD' : dateDisplayMode === 'BS_ONLY' ? 'BS_ONLY' : 'BS_FORMAT'
      
      setDateFormat(computedDateFormat)

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `calendar_prefs_${user.$id}`,
          JSON.stringify({
            primaryCalendar,
            dateDisplayMode,
            dateFormat: computedDateFormat,
          })
        )
      }

      try {
        await userService.updateUserPreferences(user.$id, {
          primaryCalendar,
          dateDisplayMode,
          dateFormat: computedDateFormat,
        } as any)
      } catch {
        // Fallback preference save
      }

      if (activeBusiness?.$id) {
        try {
          await businessService.updateBusiness(
            activeBusiness.$id,
            { dateFormat: computedDateFormat },
            user.$id
          )
        } catch {
          // Handled safely
        }
      }

      toast({
        title: 'Calendar Settings Saved 🎉',
        description: `Preferences saved: ${primaryCalendar === 'AD' ? 'Gregorian (A.D.)' : 'Bikram Sambat (B.S.)'} (${dateDisplayMode === 'BS_ONLY' ? 'BS Only' : 'BS + AD Dual'}).`,
      })
      await refreshAuth()
    } catch (err: any) {
      console.error('Error updating calendar settings:', err)
      toast({
        title: 'Save Failed',
        description: err?.message || 'Could not update calendar preferences.',
        variant: 'destructive',
      })
    } finally {
      setSavingCalendar(false)
    }
  }

  // Save Business Settings
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBusiness?.$id || !user?.$id) return
    try {
      setSavingBiz(true)

      if (taxRegistrationType !== 'NONE' && !taxRegistrationNumber.trim()) {
        toast({
          title: 'Validation Error',
          description: `Registration number is required for ${taxRegistrationType} registered businesses.`,
          variant: 'destructive',
        })
        setSavingBiz(false)
        return
      }

      await businessService.updateBusiness(
        activeBusiness.$id,
        {
          name: bizName,
          phone: bizPhone,
          address: bizAddress,
          taxRegistrationType,
          taxRegistrationNumber: taxRegistrationNumber.trim(),
          panNumber: taxRegistrationType === 'PAN' ? taxRegistrationNumber.trim() : '',
          vatNumber: taxRegistrationType === 'VAT' ? taxRegistrationNumber.trim() : '',
          logoUrl,
          currency,
          timezone,
        },
        user.$id
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
      await userService.updateUserProfile(user.$id, { name: userName, phone: userPhone })
      try {
        await authService.updateAccount({ name: userName })
        if (userPhone) {
          await authService.updatePhone(userPhone)
        }
      } catch {
        // Appwrite Auth name & phone sync fallback
      }
      toast({
        title: 'Profile Updated',
        description: 'Your user name and registered mobile phone details have been updated.',
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

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Settings"
        description="Manage business credentials, user security, and application preferences."
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

                {/* Tax Registration Section */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <Label className="text-xs font-bold text-slate-700">Tax Registration Type</Label>
                    <p className="text-[11px] text-slate-400">Select your shop/business tax registration type in Nepal.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTaxRegistrationType('NONE')
                        setTaxRegistrationNumber('')
                      }}
                      className={`p-3 rounded-lg border text-xs font-semibold transition-all text-center ${
                        taxRegistrationType === 'NONE'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      None
                    </button>

                    <button
                      type="button"
                      onClick={() => setTaxRegistrationType('PAN')}
                      className={`p-3 rounded-lg border text-xs font-semibold transition-all text-center ${
                        taxRegistrationType === 'PAN'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      PAN Registered
                    </button>

                    <button
                      type="button"
                      onClick={() => setTaxRegistrationType('VAT')}
                      className={`p-3 rounded-lg border text-xs font-semibold transition-all text-center ${
                        taxRegistrationType === 'VAT'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      VAT Registered
                    </button>
                  </div>

                  {taxRegistrationType !== 'NONE' && (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="taxRegistrationNumber" className="text-xs font-bold text-slate-700">
                        {taxRegistrationType === 'VAT' ? 'VAT Number *' : 'PAN Number *'}
                      </Label>
                      <Input
                        id="taxRegistrationNumber"
                        value={taxRegistrationNumber}
                        onChange={(e) => setTaxRegistrationNumber(e.target.value)}
                        placeholder={taxRegistrationType === 'VAT' ? 'e.g. 100223344' : 'e.g. 600112233'}
                        className="font-mono text-sm h-10"
                      />
                      <p className="text-[11px] text-slate-400">
                        {taxRegistrationType === 'VAT'
                          ? 'VAT Registered: New bills will default to 13% VAT ON.'
                          : 'PAN Registered: New bills will default to VAT OFF.'}
                      </p>
                    </div>
                  )}
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
                    Save Business Credentials
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Calendar & Localization Preferences Card */}
          <Card className="lg:col-span-3 border-slate-200 bg-white shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-indigo-600" /> Nepal Dual Calendar Settings
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Set Bikram Sambat (BS) or Gregorian (AD) as your primary application calendar and configure dual-date display preferences.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCalendar} className="space-y-6 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Primary Calendar System */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Primary Calendar System</Label>
                  <div className="space-y-2">
                    <label
                      onClick={() => handleSelectPrimaryCalendar('BS')}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer font-bold text-xs transition-colors ${
                        primaryCalendar === 'BS'
                          ? 'border-indigo-200 bg-indigo-50/50 text-slate-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="primaryCal"
                        checked={primaryCalendar === 'BS'}
                        onChange={() => handleSelectPrimaryCalendar('BS')}
                        className="accent-indigo-600"
                      />
                      <div>
                        <span>Bikram Sambat (B.S.) — Recommended Default</span>
                        <p className="text-[11px] font-normal text-slate-500">
                          Nepal-first calendar system ({formatBSDate(new Date(), { format: 'MEDIUM' })})
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => handleSelectPrimaryCalendar('AD')}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer font-bold text-xs transition-colors ${
                        primaryCalendar === 'AD'
                          ? 'border-indigo-200 bg-indigo-50/50 text-slate-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="primaryCal"
                        checked={primaryCalendar === 'AD'}
                        onChange={() => handleSelectPrimaryCalendar('AD')}
                        className="accent-indigo-600"
                      />
                      <div>
                        <span>Gregorian (A.D.)</span>
                        <p className="text-[11px] font-normal text-slate-500">
                          International calendar system ({new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Date Display Mode */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Date Display Mode</Label>
                  <div className="space-y-2">
                    <label
                      onClick={() => handleSelectDateDisplayMode('DUAL')}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer font-bold text-xs transition-colors ${
                        dateDisplayMode === 'DUAL'
                          ? 'border-indigo-200 bg-indigo-50/50 text-slate-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dateDisp"
                        checked={dateDisplayMode === 'DUAL'}
                        onChange={() => handleSelectDateDisplayMode('DUAL')}
                        className="accent-indigo-600"
                      />
                      <div>
                        <span>BS + AD Dual Display (Recommended)</span>
                        <p className="text-[11px] font-normal text-slate-500">
                          {formatBSDate(new Date(), { format: 'MEDIUM' })} ({new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} AD)
                        </p>
                      </div>
                    </label>

                    <label
                      onClick={() => handleSelectDateDisplayMode('BS_ONLY')}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer font-bold text-xs transition-colors ${
                        dateDisplayMode === 'BS_ONLY'
                          ? 'border-indigo-200 bg-indigo-50/50 text-slate-900 ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dateDisp"
                        checked={dateDisplayMode === 'BS_ONLY'}
                        onChange={() => handleSelectDateDisplayMode('BS_ONLY')}
                        className="accent-indigo-600"
                      />
                      <div>
                        <span>Bikram Sambat (BS) Only</span>
                        <p className="text-[11px] font-normal text-slate-500">
                          {formatBSDate(new Date(), { format: 'MEDIUM' })}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Button Area */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <p className="text-[11px] font-medium text-slate-500">
                  Current Format: <span className="font-mono font-bold text-slate-700">{dateFormat}</span>
                </p>
                <Button
                  type="submit"
                  disabled={savingCalendar}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4"
                >
                  {savingCalendar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Calendar Preferences
                </Button>
              </div>
            </form>
          </Card>

          {/* DANGER ZONE FOR BUSINESS DELETE (TAB 1) */}
          <div className="lg:col-span-3 border-2 border-red-200 bg-red-50/40 shadow-sm p-6 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-red-900 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" /> Danger Zone — Delete Selected Business
                </h3>
                <p className="text-xs text-red-700 mt-1 font-medium">
                  Permanently delete this business entity and its data. Your Inventory Lite user account will remain active.
                </p>
              </div>

              {currentRole === 'owner' ? (
                <Button
                  type="button"
                  onClick={() => setDeleteBusinessModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 shadow-sm shrink-0 text-xs"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Business
                </Button>
              ) : (
                <div className="text-xs font-semibold text-red-700 bg-red-100/80 px-3 py-1.5 rounded-lg border border-red-200">
                  Only business owners can delete a business
                </div>
              )}
            </div>
          </div>

          <DeleteBusinessModal
            isOpen={deleteBusinessModalOpen}
            onClose={() => setDeleteBusinessModalOpen(false)}
            onConfirmDelete={handleDeleteBusinessOnly}
            businessName={activeBusiness?.name || 'Your Business'}
            userEmail={userProfile?.email || user?.email || ''}
          />
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

              <div className="space-y-1.5">
                <Label htmlFor="userPhone" className="text-xs font-bold text-slate-700">
                  Registered Mobile / Phone Number (Appwrite Auth Profile)
                </Label>
                <Input
                  id="userPhone"
                  type="tel"
                  placeholder="e.g. 9841234567"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="font-mono bg-white border-slate-300 text-slate-900"
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

          {/* DANGER ZONE SECTION FOR ACCOUNT DELETE (TAB 2) */}
          <div className="md:col-span-2 border-2 border-red-200 bg-red-50/40 shadow-sm p-6 rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-red-200/60">
              <div>
                <h3 className="text-base font-extrabold text-red-900 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" /> Danger Zone — Delete Account
                </h3>
                <p className="text-xs text-red-700 mt-1 font-medium max-w-2xl leading-relaxed">
                  Delete your Inventory Lite account and permanently remove all business data associated with it. This action cannot be undone. Your authentication identity will be preserved, but your account will be blocked and you will no longer be able to access Inventory Lite.
                </p>
              </div>

              {currentRole === 'owner' ? (
                <Button
                  type="button"
                  onClick={() => setDeleteAccountModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold h-10 px-4 shadow-sm shrink-0 text-xs"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                </Button>
              ) : (
                <div className="text-xs font-semibold text-red-700 bg-red-100/80 px-3 py-1.5 rounded-lg border border-red-200">
                  Only the business owner can delete this account
                </div>
              )}
            </div>
          </div>

          <DeleteAccountModal
            isOpen={deleteAccountModalOpen}
            onClose={() => setDeleteAccountModalOpen(false)}
            onConfirmDelete={handleDeleteAccount}
            businessName={activeBusiness?.name || 'Your Business'}
            businessId={activeBusiness?.$id}
            userEmail={userProfile?.email || user?.email || ''}
          />
        </div>
      )}

    </div>
  )
}
