"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { CustomerFormDialog } from '@/components/features/customers/customer-form-dialog'
import { customerService } from '@/services/customer.service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import {
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  ArrowLeft,
  Edit,
  Loader2,
  FileText,
} from 'lucide-react'
import { Customer } from '@/types'

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeBusiness } = useAuth()
  const { toast } = useToast()

  const customerId = params?.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [summary, setSummary] = useState<{
    totalPurchases: number
    totalPaid: number
    totalDue: number
    sales: any[]
  }>({
    totalPurchases: 0,
    totalPaid: 0,
    totalDue: 0,
    sales: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCustomerDetails = useCallback(async () => {
    if (!customerId || !activeBusiness?.$id) return
    try {
      setIsLoading(true)
      const data = await customerService.getCustomerSummary(customerId, activeBusiness.$id)
      setCustomer(data.customer)
      setSummary({
        totalPurchases: data.totalPurchases,
        totalPaid: data.totalPaid,
        totalDue: data.totalDue,
        sales: data.sales,
      })
    } catch (err: any) {
      toast({
        title: 'Customer Not Found',
        description: err.message || 'Unable to retrieve customer record.',
        variant: 'destructive',
      })
      router.push('/app/customers')
    } finally {
      setIsLoading(false)
    }
  }, [customerId, activeBusiness?.$id, router, toast])

  useEffect(() => {
    fetchCustomerDetails()
  }, [fetchCustomerDetails])

  const handleUpdateCustomer = async (data: any) => {
    if (!customerId || !activeBusiness?.$id) return
    setIsSubmitting(true)
    try {
      await customerService.updateCustomer(customerId, data, activeBusiness.$id)
      toast({
        title: 'Customer Updated',
        description: 'Customer contact details have been updated.',
      })
      await fetchCustomerDetails()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Loading customer profile...</p>
      </div>
    )
  }

  if (!customer) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={`Customer ledger & purchase history for ${customer.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push('/app/customers')}
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
            </Button>
            <Button
              onClick={() => setIsEditOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
            >
              <Edit className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </div>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Purchases
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white font-mono">
              Rs. {summary.totalPurchases.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">{summary.sales.length} orders placed</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Paid
            </CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              Rs. {summary.totalPaid.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Cleared payments</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Outstanding Due
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono ${summary.totalDue > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              Rs. {summary.totalDue.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Pending balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Contact & Specifications */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-500 font-medium">Customer Name</div>
            <div className="text-sm font-bold text-white mt-1">{customer.name}</div>
          </div>
          <div>
            <div className="text-slate-500 font-medium flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-indigo-400" /> Phone
            </div>
            <div className="text-sm font-mono text-slate-200 mt-1">{customer.phone || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-500 font-medium flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-indigo-400" /> Email
            </div>
            <div className="text-sm text-slate-200 mt-1">{customer.email || 'N/A'}</div>
          </div>
          <div>
            <div className="text-slate-500 font-medium flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Address / PAN
            </div>
            <div className="text-sm text-slate-200 mt-1">
              {customer.address || 'N/A'}{' '}
              {customer.panNumber ? `(PAN: ${customer.panNumber})` : ''}
            </div>
          </div>
        </div>
      </Card>

      {/* Purchase History Table */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md p-6">
        <CardHeader className="px-0 pt-0 pb-4 border-b border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" /> Recent Sales Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-4">
          {summary.sales.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-8">
              No sales transactions logged for this customer.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-sm text-slate-200">
                <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Sale #</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Paid Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {summary.sales.map((s) => (
                    <tr key={s.$id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-white">{s.saleNumber}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">Rs. {(s.total ?? s.totalAmount ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">Rs. {(s.paidAmount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Customer Modal */}
      <CustomerFormDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdateCustomer}
        initialData={customer}
        isLoading={isSubmitting}
      />
    </div>
  )
}
