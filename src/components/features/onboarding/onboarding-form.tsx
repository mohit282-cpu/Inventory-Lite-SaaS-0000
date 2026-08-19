"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { onboardingSchema } from '@/lib/validations'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Building2, Receipt, Globe, ArrowRight, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'

type OnboardingFormValues = z.infer<typeof onboardingSchema>

export function OnboardingForm() {
  const { userProfile, createBusinessOnboarding } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [step, setStep] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      ownerName: userProfile?.name || '',
      phone: userProfile?.phone || '',
      email: userProfile?.email || '',
      address: '',
      panNumber: '',
      vatNumber: '',
      logoUrl: '',
      currency: 'NPR',
      timezone: 'Asia/Kathmandu',
    },
  })

  const currentCurrency = watch('currency')
  const currentTimezone = watch('timezone')

  const nextStep = async () => {
    let isValid = false
    if (step === 1) {
      isValid = await trigger(['name', 'ownerName', 'phone', 'email'])
    } else if (step === 2) {
      isValid = await trigger(['address', 'panNumber', 'vatNumber', 'logoUrl'])
    }

    if (isValid) {
      setStep((prev) => Math.min(3, prev + 1))
    }
  }

  const prevStep = () => {
    setStep((prev) => Math.max(1, prev - 1))
  }

  const onSubmit = async (data: OnboardingFormValues) => {
    try {
      setIsSubmitting(true)
      await createBusinessOnboarding(data)
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

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Wizard Step Indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            1
          </div>
          <span className="hidden sm:inline">Business Basics</span>
        </div>
        <div className={`h-0.5 flex-1 mx-4 ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-800'}`} />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            2
          </div>
          <span className="hidden sm:inline">Tax & Address</span>
        </div>
        <div className={`h-0.5 flex-1 mx-4 ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-800'}`} />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-400 font-semibold' : 'text-slate-500'}`}>
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            3
          </div>
          <span className="hidden sm:inline">Preferences</span>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/85 backdrop-blur-xl text-slate-100 shadow-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* STEP 1: BUSINESS IDENTITY */}
          {step === 1 && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm mb-1">
                  <Building2 className="h-4 w-4" /> Step 1 of 3
                </div>
                <CardTitle className="text-2xl font-bold text-white">Business Identity</CardTitle>
                <CardDescription className="text-slate-400">
                  Enter basic information about your company or store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-200">
                    Business / Store Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Kathmandu Electronics Store"
                    className="bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-400 font-medium">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownerName" className="text-slate-200">
                    Owner / Manager Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="ownerName"
                    placeholder="Ram Bahadur Thapa"
                    className="bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500"
                    {...register('ownerName')}
                  />
                  {errors.ownerName && (
                    <p className="text-xs text-red-400 font-medium">{errors.ownerName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-200">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="9801234567"
                      className="bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500"
                      {...register('phone')}
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-400 font-medium">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-200">Business Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="info@ktmelectronics.com"
                      className="bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* STEP 2: TAX & LOCATION */}
          {step === 2 && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm mb-1">
                  <Receipt className="h-4 w-4" /> Step 2 of 3
                </div>
                <CardTitle className="text-2xl font-bold text-white">Address & Tax Information</CardTitle>
                <CardDescription className="text-slate-400">
                  Provide your business location and Nepal tax registration (PAN / VAT)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-slate-200">Address / Location</Label>
                  <Input
                    id="address"
                    placeholder="New Road, Kathmandu, Nepal"
                    className="bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500"
                    {...register('address')}
                  />
                  {errors.address && (
                    <p className="text-xs text-red-400 font-medium">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="panNumber" className="text-slate-200">PAN Number (Nepal)</Label>
                    <Input
                      id="panNumber"
                      placeholder="600123456"
                      className="bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500"
                      {...register('panNumber')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vatNumber" className="text-slate-200">VAT Number (Nepal)</Label>
                    <Input
                      id="vatNumber"
                      placeholder="300987654"
                      className="bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500"
                      {...register('vatNumber')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl" className="text-slate-200">Logo Image URL (Optional)</Label>
                  <Input
                    id="logoUrl"
                    placeholder="https://example.com/logo.png"
                    className="bg-slate-950/50 border-slate-800 text-white focus:border-indigo-500"
                    {...register('logoUrl')}
                  />
                  {errors.logoUrl && (
                    <p className="text-xs text-red-400 font-medium">{errors.logoUrl.message}</p>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {/* STEP 3: PREFERENCES */}
          {step === 3 && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2 text-indigo-400 font-medium text-sm mb-1">
                  <Globe className="h-4 w-4" /> Step 3 of 3
                </div>
                <CardTitle className="text-2xl font-bold text-white">Localization & Currency</CardTitle>
                <CardDescription className="text-slate-400">
                  Default currency is set to NPR for Nepal businesses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-slate-200">Billing Currency</Label>
                  <Select
                    value={currentCurrency}
                    onValueChange={(val: any) => setValue('currency', val)}
                  >
                    <SelectTrigger className="bg-slate-950/50 border-slate-800 text-white">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="NPR">NPR - Nepalese Rupee (रू)</SelectItem>
                      <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                      <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-slate-200">Timezone</Label>
                  <Select
                    value={currentTimezone}
                    onValueChange={(val: any) => setValue('timezone', val)}
                  >
                    <SelectTrigger className="bg-slate-950/50 border-slate-800 text-white">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                      <SelectItem value="Asia/Kathmandu">Asia/Kathmandu (NPT GMT+5:45)</SelectItem>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST GMT+5:30)</SelectItem>
                      <SelectItem value="UTC">UTC (GMT+0:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-indigo-200 text-sm flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-indigo-100">Ready to launch!</span>
                    Your account will be designated as the <strong className="text-white">Business Owner</strong>. All stock, products, sales, and invoices will be securely isolated to this business.
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* FOOTER CONTROLS */}
          <CardFooter className="flex justify-between border-t border-slate-800/60 pt-4">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={isSubmitting}
                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Launching Business...
                  </>
                ) : (
                  <>
                    Complete Setup <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
