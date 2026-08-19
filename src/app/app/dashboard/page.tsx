"use client"

import React from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, LogOut, ShieldCheck, Building, CreditCard, Clock, MapPin, Phone, Hash } from 'lucide-react'

export default function DashboardPage() {
  const { user, userProfile, activeBusiness, memberships, logout } = useAuth()

  const currentRole = memberships.find(m => m.businessId === activeBusiness?.$id)?.role || 'owner'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              {activeBusiness?.name || 'Inventory Lite Dashboard'}
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="h-3 w-3" /> Multi-Tenant Active
              </span>
              <span>•</span>
              <span className="capitalize text-indigo-300 font-medium">Role: {currentRole}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <div className="text-sm font-semibold text-slate-200">{userProfile?.name || user?.name}</div>
            <div className="text-xs text-slate-400">{user?.email}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        <div className="bg-gradient-to-r from-indigo-900/50 via-slate-900 to-indigo-950/40 p-6 rounded-2xl border border-indigo-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Welcome back, {userProfile?.name || user?.name}! 👋
            </h2>
            <p className="text-slate-400 mt-1">
              Your Appwrite backend foundation and multi-tenant security layer are fully operational for <span className="text-indigo-300 font-semibold">{activeBusiness?.name}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
              Business ID: {activeBusiness?.$id}
            </div>
          </div>
        </div>

        {/* Business Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active Business</CardTitle>
              <Building className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeBusiness?.name}</div>
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                {activeBusiness?.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>{activeBusiness.address}</span>
                  </div>
                )}
                {activeBusiness?.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span>{activeBusiness.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Localization Defaults</CardTitle>
              <CreditCard className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeBusiness?.currency || 'NPR'}</div>
              <div className="mt-2 space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>Timezone: {activeBusiness?.timezone || 'Asia/Kathmandu'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Tax Identification</CardTitle>
              <Hash className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-white">
                {activeBusiness?.panNumber ? `PAN: ${activeBusiness.panNumber}` : 'No PAN Specified'}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {activeBusiness?.vatNumber ? `VAT: ${activeBusiness.vatNumber}` : 'No VAT Specified'}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
