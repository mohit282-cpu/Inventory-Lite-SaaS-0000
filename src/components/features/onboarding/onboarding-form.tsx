"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { onboardingSchema } from '@/lib/validations'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Building2,
  Receipt,
  Sliders,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

type OnboardingFormValues = z.infer<typeof onboardingSchema>

export function OnboardingForm() {
  const { user, userProfile, createBusinessOnboarding, completeOnboarding } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  // Persist current step across page refreshes if onboarding is incomplete
  const [step, setStep] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedStep = sessionStorage.getItem(`onboarding_step_${user?.$id || 'current'}`)
      if (savedStep) {
        const parsed = parseInt(savedStep, 10)
        if (parsed >= 1 && parsed <= 3) return parsed
      }
    }
    return 1
  })

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [createdSummary, setCreatedSummary] = useState<{
    name: string
    ownerName: string
    currency: string
    timezone: string
    vatRate: number
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema) as any,
    defaultValues: {
      name: '',
      ownerName: userProfile?.name || user?.name || '',
      phone: userProfile?.phone || '',
      email: userProfile?.email || user?.email || '',
      address: '',
      city: '',
      province: 'Bagmati',
      panNumber: '',
      vatNumber: '',
      taxRegistrationType: 'NONE',
      taxRegistrationNumber: '',
      currency: 'NPR',
      timezone: 'Asia/Kathmandu',
      defaultVatRate: 13,
      invoicePrefix: 'INV-',
      lowStockThreshold: 10,
      dateFormat: 'BS_FORMAT',
    },
  })

  const currentCurrency = watch('currency')
  const currentTimezone = watch('timezone')
  const currentProvince = watch('province')
  const currentDateFormat = watch('dateFormat')
  const currentTaxRegistrationType = watch('taxRegistrationType') || 'NONE'

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.$id) {
      sessionStorage.setItem(`onboarding_step_${user.$id}`, step.toString())
    }
  }, [step, user?.$id])

  const nextStep = async () => {
    let isValid = false
    if (step === 1) {
      isValid = await trigger(['name', 'ownerName', 'phone', 'email'])
    } else if (step === 2) {
      isValid = await trigger(['address', 'city', 'province', 'taxRegistrationType', 'taxRegistrationNumber', 'panNumber', 'vatNumber'])
    }

    if (isValid) {
      setStep((prev) => Math.min(3, prev + 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    setStep((prev) => Math.max(1, prev - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onSubmit = async (data: OnboardingFormValues) => {
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      const regType = data.taxRegistrationType || 'NONE'
      const regNum = (data.taxRegistrationNumber || (regType === 'VAT' ? data.vatNumber : regType === 'PAN' ? data.panNumber : '') || '').trim()

      const business = await createBusinessOnboarding({
        name: data.name.trim(),
        phone: data.phone?.trim(),
        email: data.email?.trim(),
        address: data.address ? `${data.address}${data.city ? `, ${data.city}` : ''}${data.province ? `, ${data.province}` : ''}` : '',
        panNumber: regType === 'PAN' ? regNum : data.panNumber,
        vatNumber: regType === 'VAT' ? regNum : data.vatNumber,
        taxRegistrationType: regType,
        taxRegistrationNumber: regNum,
        currency: data.currency,
        timezone: data.timezone,
      })

      await completeOnboarding(business?.$id)

      setCreatedSummary({
        name: data.name.trim(),
        ownerName: data.ownerName.trim(),
        currency: data.currency,
        timezone: data.timezone,
        vatRate: data.defaultVatRate || 13,
      })

      if (typeof window !== 'undefined' && user?.$id) {
        sessionStorage.removeItem(`onboarding_step_${user.$id}`)
      }

      setIsCompleted(true)
      toast({
        title: 'Business Setup Complete 🎉',
        description: `Welcome to Inventory Lite, ${data.name}!`,
      })

      router.push('/app/dashboard')
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Onboarding Error',
        description: err.message || 'Failed to initialize business',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoToDashboard = () => {
    router.push('/app/dashboard')
  }

  // COMPLETION SCREEN / SUCCESS STATE
  if (isCompleted && createdSummary) {
    return (
      <div className="bg-white border border-slate-200/90 shadow-sm rounded-xl p-6 sm:p-10 w-full text-center">
        <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900">Your business is ready!</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Your Inventory Lite workspace has been created successfully.
        </p>

        {/* Business Summary Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-5 mb-6 text-left space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500 font-medium">Business Name</span>
            <span className="text-slate-900 font-bold">{createdSummary.name}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500 font-medium">Owner / Manager</span>
            <span className="text-slate-800 font-semibold">{createdSummary.ownerName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500 font-medium">Billing Currency</span>
            <span className="text-slate-800 font-semibold">{createdSummary.currency} — Nepalese Rupee</span>
          </div>
          <div className="flex justify-between border-b border-slate-200/60 pb-2">
            <span className="text-slate-500 font-medium">Timezone</span>
            <span className="text-slate-800 font-semibold">{createdSummary.timezone}</span>
          </div>
          <div className="flex justify-between pt-0.5">
            <span className="text-slate-500 font-medium">Default VAT Rate</span>
            <span className="text-slate-800 font-semibold">{createdSummary.vatRate}%</span>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleGoToDashboard}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 text-sm rounded-lg shadow-xs flex items-center justify-center gap-2"
        >
          Go to Dashboard <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* 3-STEP PROGRESS INDICATOR */}
      <div className="hidden sm:flex items-center justify-between px-2 mb-2">
        {/* Step 1 Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step > 1
                ? 'bg-emerald-600 text-white'
                : step === 1
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            {step > 1 ? <Check className="h-4 w-4" /> : '01'}
          </div>
          <span
            className={`text-xs font-bold tracking-tight ${
              step >= 1 ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            Business
          </span>
        </div>

        {/* Divider 1 */}
        <div
          className={`h-0.5 flex-1 mx-4 transition-colors ${
            step > 1 ? 'bg-indigo-600' : 'bg-slate-200'
          }`}
        />

        {/* Step 2 Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step > 2
                ? 'bg-emerald-600 text-white'
                : step === 2
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            {step > 2 ? <Check className="h-4 w-4" /> : '02'}
          </div>
          <span
            className={`text-xs font-bold tracking-tight ${
              step >= 2 ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            Tax & Address
          </span>
        </div>

        {/* Divider 2 */}
        <div
          className={`h-0.5 flex-1 mx-4 transition-colors ${
            step > 2 ? 'bg-indigo-600' : 'bg-slate-200'
          }`}
        />

        {/* Step 3 Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === 3
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            03
          </div>
          <span
            className={`text-xs font-bold tracking-tight ${
              step === 3 ? 'text-slate-900' : 'text-slate-400'
            }`}
          >
            Preferences
          </span>
        </div>
      </div>

      {/* Mobile Progress Bar */}
      <div className="block sm:hidden space-y-2 mb-4">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-indigo-600">Step {step} of 3</span>
          <span className="text-slate-500 font-semibold">
            {step === 1 ? 'Business information' : step === 2 ? 'Tax & Address' : 'Preferences'}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* MAIN FORM CARD */}
      <div className="bg-white border border-slate-200/90 shadow-xs rounded-xl p-6 sm:p-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* STEP 1: BUSINESS DETAILS */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Card Header */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Business information</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Let&apos;s start with the basics about your shop or business.
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 pt-1">
                {/* Field 1: Business / Store Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-bold text-slate-700">
                    Business / Store Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g. Kathmandu Electronics"
                    className="h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600/20"
                    {...register('name')}
                  />
                  {errors.name ? (
                    <p className="text-xs text-red-500 font-medium mt-1">{errors.name.message}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      This name will appear on your invoices and business records.
                    </p>
                  )}
                </div>

                {/* Field 2: Owner / Manager Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName" className="text-xs font-bold text-slate-700">
                    Owner / Manager Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="ownerName"
                    placeholder="e.g. Ram Sharma"
                    className="h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600/20"
                    {...register('ownerName')}
                  />
                  {errors.ownerName ? (
                    <p className="text-xs text-red-500 font-medium mt-1">{errors.ownerName.message}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Full name of the primary administrator for this business.
                    </p>
                  )}
                </div>

                {/* Grid 2-col for Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Field 3: Business Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-bold text-slate-700">
                      Business Phone
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="98XXXXXXXX"
                      className="h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600/20"
                      {...register('phone')}
                    />
                    {errors.phone ? (
                      <p className="text-xs text-red-500 font-medium mt-1">{errors.phone.message}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400">Primary phone for customer inquiries.</p>
                    )}
                  </div>

                  {/* Field 4: Business Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                      Business Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="business@example.com"
                      className="h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600/20"
                      {...register('email')}
                    />
                    {errors.email ? (
                      <p className="text-xs text-red-500 font-medium mt-1">{errors.email.message}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400">Email printed on billing invoices.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TAX & ADDRESS */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Card Header */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Tax & business address</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure location details and Nepal tax registrations (PAN / VAT).
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 pt-1">
                {/* Field: Business Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-bold text-slate-700">
                    Business Address
                  </Label>
                  <Input
                    id="address"
                    placeholder="e.g. New Road, Ward No. 22"
                    className="h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600/20"
                    {...register('address')}
                  />
                </div>

                {/* Grid 2-col for City & Province */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-bold text-slate-700">
                      City
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g. Kathmandu"
                      className="h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600/20"
                      {...register('city')}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="province" className="text-xs font-bold text-slate-700">
                      Province (Nepal)
                    </Label>
                    <Select
                      value={currentProvince}
                      onValueChange={(val: string) => setValue('province', val)}
                    >
                      <SelectTrigger id="province" className="h-10 text-sm bg-white border-slate-300">
                        <SelectValue placeholder="Select Province" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="Bagmati">Bagmati Province</SelectItem>
                        <SelectItem value="Koshi">Koshi Province</SelectItem>
                        <SelectItem value="Madhesh">Madhesh Province</SelectItem>
                        <SelectItem value="Gandaki">Gandaki Province</SelectItem>
                        <SelectItem value="Lumbini">Lumbini Province</SelectItem>
                        <SelectItem value="Karnali">Karnali Province</SelectItem>
                        <SelectItem value="Sudurpashchim">Sudurpashchim Province</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tax Registration Section */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <Label className="text-xs font-bold text-slate-700">Which tax registration does your shop/business have?</Label>
                    <p className="text-[11px] text-slate-400">Determines automatic VAT defaults during billing.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all text-center ${
                        currentTaxRegistrationType === 'NONE'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value="NONE"
                        className="sr-only"
                        {...register('taxRegistrationType')}
                      />
                      <span>None</span>
                    </label>

                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all text-center ${
                        currentTaxRegistrationType === 'PAN'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value="PAN"
                        className="sr-only"
                        {...register('taxRegistrationType')}
                      />
                      <span>PAN Registered</span>
                    </label>

                    <label
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all text-center ${
                        currentTaxRegistrationType === 'VAT'
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value="VAT"
                        className="sr-only"
                        {...register('taxRegistrationType')}
                      />
                      <span>VAT Registered</span>
                    </label>
                  </div>

                  <p className="text-[11px] font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-200/80">
                    {currentTaxRegistrationType === 'VAT'
                      ? '✓ VAT Registered: VAT will be enabled by default (13%).'
                      : currentTaxRegistrationType === 'PAN'
                      ? '✓ PAN Registered: VAT will be off by default.'
                      : '✓ No Tax Registration: VAT will be off by default.'}
                  </p>

                  {currentTaxRegistrationType !== 'NONE' && (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="taxRegistrationNumber" className="text-xs font-bold text-slate-700">
                        {currentTaxRegistrationType === 'VAT' ? 'VAT Number (9-digits) *' : 'PAN Number (9-digits) *'}
                      </Label>
                      <Input
                        id="taxRegistrationNumber"
                        placeholder={currentTaxRegistrationType === 'VAT' ? 'e.g. 100223344' : 'e.g. 600112233'}
                        className="h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600/20 font-mono"
                        {...register('taxRegistrationNumber')}
                      />
                      {errors.taxRegistrationNumber && (
                        <p className="text-[11px] font-medium text-rose-500">{errors.taxRegistrationNumber.message}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREFERENCES */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Card Header */}
              <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Set your preferences</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    These are your default business settings. You can change them anytime in Settings.
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 pt-1">
                {/* Grid 2-col for Currency & Timezone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="currency" className="text-xs font-bold text-slate-700">
                      Billing Currency <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={currentCurrency}
                      onValueChange={(val: any) => setValue('currency', val)}
                    >
                      <SelectTrigger id="currency" className="h-10 text-sm bg-white border-slate-300">
                        <SelectValue placeholder="Select Currency" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="NPR">NPR — Nepalese Rupee (रू)</SelectItem>
                        <SelectItem value="USD">USD — US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">EUR — Euro (€)</SelectItem>
                        <SelectItem value="INR">INR — Indian Rupee (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="timezone" className="text-xs font-bold text-slate-700">
                      Timezone <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={currentTimezone}
                      onValueChange={(val: string) => setValue('timezone', val)}
                    >
                      <SelectTrigger id="timezone" className="h-10 text-sm bg-white border-slate-300">
                        <SelectValue placeholder="Select Timezone" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="Asia/Kathmandu">Asia/Kathmandu (NPT UTC+5:45)</SelectItem>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST UTC+5:30)</SelectItem>
                        <SelectItem value="UTC">UTC (GMT+0:00)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Grid 2-col for Default VAT & Invoice Prefix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="defaultVatRate" className="text-xs font-bold text-slate-700">
                      Default VAT Rate (%)
                    </Label>
                    <Input
                      id="defaultVatRate"
                      type="number"
                      step="0.1"
                      placeholder="13"
                      className="h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600/20"
                      {...register('defaultVatRate')}
                    />
                    <p className="text-[11px] text-slate-400">Standard VAT rate applied in Nepal (13%).</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="invoicePrefix" className="text-xs font-bold text-slate-700">
                      Invoice Prefix
                    </Label>
                    <Input
                      id="invoicePrefix"
                      placeholder="INV-"
                      className="h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600/20"
                      {...register('invoicePrefix')}
                    />
                    <p className="text-[11px] text-slate-400">Sequential invoice prefix (e.g. INV-001).</p>
                  </div>
                </div>

                {/* Grid 2-col for Low-Stock Threshold & Date Format */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="lowStockThreshold" className="text-xs font-bold text-slate-700">
                      Low-Stock Alert Threshold
                    </Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      placeholder="10"
                      className="h-10 text-sm focus:border-indigo-600 focus:ring-indigo-600/20"
                      {...register('lowStockThreshold')}
                    />
                    <p className="text-[11px] text-slate-400">Trigger alert when item stock falls below this.</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dateFormat" className="text-xs font-bold text-slate-700">
                      Date Format
                    </Label>
                    <Select
                      value={currentDateFormat}
                      onValueChange={(val: string) => setValue('dateFormat', val)}
                    >
                      <SelectTrigger id="dateFormat" className="h-10 text-sm bg-white border-slate-300">
                        <SelectValue placeholder="Select Date Format" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="BS_FORMAT">Bikram Sambat (BS Nepal Calendar)</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO / AD)</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (Standard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM ACTION AREA */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={isSubmitting}
                className="h-10 px-4 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="h-10 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                Next <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-6 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finishing Setup...
                  </>
                ) : (
                  <>
                    Finish Setup <Sparkles className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
