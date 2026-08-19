"use client"

import React from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Package,
  ShoppingCart,
  Users,
  FileText,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Boxes,
} from 'lucide-react'

export default function DashboardPage() {
  const { activeBusiness, userProfile } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${userProfile?.name?.split(' ')[0] || 'Partner'}`}
        description={`Here is what's happening at ${activeBusiness?.name || 'your business'} today.`}
        actions={
          <Button asChild className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20">
            <Link href="/app/sales">
              <Plus className="mr-2 h-4 w-4" /> New Sale
            </Link>
          </Button>
        }
      />

      {/* KPI Cards (Initialized with real empty values: 0) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Sales
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeBusiness?.currency || 'NPR'} 0.00</div>
            <p className="text-xs text-slate-500 mt-1">No sales recorded yet</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Products
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-slate-500 mt-1">No products added</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Customers
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-slate-500 mt-1">No registered customers</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Invoices Issued
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
            <p className="text-xs text-slate-500 mt-1">No invoices generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Grid & Recent Transactions Empty State */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
          <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between border-b border-slate-800">
            <CardTitle className="text-base font-bold text-white">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs text-indigo-400 hover:text-indigo-300">
              <Link href="/app/sales">
                View Sales <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-6">
            <EmptyState
              title="No transactions yet"
              description="Record your first sale, purchase stock, or log expenses to populate your business ledger."
              icon={TrendingUp}
              action={
                <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  <Link href="/app/products">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Inventory Item
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>

        {/* Quick Shortcuts */}
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 space-y-4">
          <CardHeader className="px-0 pt-0 pb-3 border-b border-slate-800">
            <CardTitle className="text-base font-bold text-white">Quick Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 space-y-2.5">
            <Link
              href="/app/products"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="h-4 w-4 text-indigo-400" />
                <span className="text-sm font-medium text-slate-200">Manage Products</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </Link>

            <Link
              href="/app/stock"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Boxes className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-slate-200">Stock Movements</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </Link>

            <Link
              href="/app/expenses"
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Receipt className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-slate-200">Record Expenses</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
