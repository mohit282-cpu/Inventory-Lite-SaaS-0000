"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  Search,
  DollarSign,
  UserPlus,
  QrCode,
} from 'lucide-react'
import { formatNPR } from '@/lib/localization'
import { DemoCustomer } from './demo-pos'

interface DemoKhataProps {
  customers: DemoCustomer[]
  onRecordPayment: (customerId: string, amountPaid: number) => void
  onAddCustomer: (customer: DemoCustomer) => void
}

export function DemoKhata({ customers, onRecordPayment, onAddCustomer }: DemoKhataProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCust, setSelectedCust] = useState<DemoCustomer | null>(null)

  // Payment Settlement Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr'>('cash')

  // Add Customer Modal
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [newCustInitialDue, setNewCustInitialDue] = useState('0')

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim()
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q)
  })

  const totalReceivables = customers.reduce((sum, c) => sum + c.dueBalance, 0)

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCust) return

    const amt = parseFloat(paymentAmount) || 0
    if (amt <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Payment amount must be greater than zero' })
      return
    }

    if (amt > selectedCust.dueBalance) {
      toast({
        variant: 'destructive',
        title: 'Amount Exceeds Due',
        description: `Payment amount (${formatNPR(amt)}) cannot exceed due balance (${formatNPR(selectedCust.dueBalance)})`,
      })
      return
    }

    onRecordPayment(selectedCust.id, amt)
    toast({
      title: 'Udhaar Payment Received!',
      description: `Recorded ${formatNPR(amt)} payment for ${selectedCust.name}. Remaining due: ${formatNPR(
        selectedCust.dueBalance - amt
      )}`,
    })

    setIsPaymentOpen(false)
    setPaymentAmount('')
  }

  const handleAddCustSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustName.trim()) return

    const newC: DemoCustomer = {
      id: `c_${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '9800000000',
      dueBalance: parseFloat(newCustInitialDue) || 0,
    }

    onAddCustomer(newC)
    toast({ title: 'Customer Profile Created', description: `${newC.name} added to Khata directory.` })

    setIsAddOpen(false)
    setNewCustName('')
    setNewCustPhone('')
    setNewCustInitialDue('0')
  }

  return (
    <div className="space-y-4">
      {/* Receivable Summary Card & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-8 p-5 bg-gradient-to-r from-amber-900 via-amber-850 to-slate-900 rounded-2xl text-white shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Total Udhaar Receivables</span>
            <div className="text-3xl font-extrabold text-white">{formatNPR(totalReceivables)}</div>
            <p className="text-xs text-amber-200">Across {customers.length} registered customer accounts</p>
          </div>

          <Button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="h-11 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl"
          >
            <UserPlus className="mr-1.5 h-4 w-4" /> Add New Customer
          </Button>
        </div>

        <div className="md:col-span-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-slate-50 border-slate-200 text-xs focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Customer Khata Directory */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((c) => {
          const hasDue = c.dueBalance > 0
          return (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-extrabold text-base">
                    {c.name.charAt(0)}
                  </div>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                      hasDue ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {hasDue ? 'Udhaar Due' : 'Settled'}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900">{c.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">Tel: {c.phone}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Running Balance</span>
                  <span className={`text-base font-extrabold ${hasDue ? 'text-amber-700' : 'text-slate-700'}`}>
                    {formatNPR(c.dueBalance)}
                  </span>
                </div>

                {hasDue && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setSelectedCust(c)
                      setPaymentAmount(String(c.dueBalance))
                      setIsPaymentOpen(true)
                    }}
                    className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs rounded-lg"
                  >
                    Receive Payment
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Record Udhaar Payment Settlement Modal */}
      {isPaymentOpen && selectedCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <form
            onSubmit={handleRecordPaymentSubmit}
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in text-slate-900"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Udhaar Collection</h3>
                <p className="text-xs text-slate-500">{selectedCust.name} ({selectedCust.phone})</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
              <span>Current Outstanding Due:</span>
              <span className="font-extrabold text-sm">{formatNPR(selectedCust.dueBalance)}</span>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Payment Received Amount (Rs.)</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-11 text-base font-bold"
                />
              </div>

              <div>
                <label className="block mb-1">Collection Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'cash' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <DollarSign className="h-4 w-4" /> Cash Received
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qr')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'qr' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <QrCode className="h-4 w-4" /> Fonepay QR
                  </button>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md">
              Save Settlement Record
            </Button>
          </form>
        </div>
      )}

      {/* Add New Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <form
            onSubmit={handleAddCustSubmit}
            className="w-full max-w-md bg-white rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-200 animate-fade-in text-slate-900"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add Customer Profile</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">Customer Full Name</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Ram Bahadur Thapa"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="h-10 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block mb-1">Phone Number (Nepal Mobile)</label>
                <Input
                  type="text"
                  placeholder="e.g. 9805330808"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="h-10 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block mb-1">Initial Udhaar Due Balance (Rs.)</label>
                <Input
                  type="number"
                  value={newCustInitialDue}
                  onChange={(e) => setNewCustInitialDue(e.target.value)}
                  className="h-10 text-xs font-medium"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md">
              Create Customer Profile
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
