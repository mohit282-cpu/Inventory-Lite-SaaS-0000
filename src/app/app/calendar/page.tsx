"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { useAuth } from '@/context/auth-context'
import { calendarService } from '@/services/calendar.service'
import { BS_MONTH_NAMES_EN, BS_DAYS_EN } from '@/lib/nepali-calendar-data'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatNPR } from '@/lib/localization'
import { saleService } from '@/services/sale.service'
import { invoiceService } from '@/services/invoice.service'
import { expenseService } from '@/services/expense.service'
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  CreditCard,
  ReceiptText,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

interface DayEventSummary {
  salesCount: number
  salesTotal: number
  invoicesCount: number
  paymentsCount: number
  paymentsTotal: number
  expensesCount: number
  expensesTotal: number
}

export default function CalendarPage() {
  const { activeBusiness } = useAuth()

  // Current BS Date
  const currentBS = calendarService.getCurrentBSDate()

  // View state: Bikram Sambat Year & Month currently displayed
  const [viewBSYear, setViewBSYear] = useState(currentBS.year)
  const [viewBSMonth, setViewBSMonth] = useState(currentBS.month)

  // Selected BS Day
  const [selectedBSDay, setSelectedBSDay] = useState(currentBS.day)

  // Business events map keyed by "YYYY-MM-DD" AD date string
  const [eventsMap, setEventsMap] = useState<Record<string, DayEventSummary>>({})

  // Fetch events for active business in current month range
  const fetchMonthEvents = useCallback(async () => {
    if (!activeBusiness?.$id) return
    try {
      const businessId = activeBusiness.$id
      const map: Record<string, DayEventSummary> = {}

      const initKey = (key: string) => {
        if (!map[key]) {
          map[key] = {
            salesCount: 0,
            salesTotal: 0,
            invoicesCount: 0,
            paymentsCount: 0,
            paymentsTotal: 0,
            expensesCount: 0,
            expensesTotal: 0,
          }
        }
      }

      const [salesRes, invRes, expRes] = await Promise.all([
        saleService.listSales(businessId).catch(() => []),
        invoiceService.listInvoices(businessId).catch(() => []),
        expenseService.listExpenses(businessId).catch(() => []),
      ])

      for (const s of salesRes) {
        const adIso = new Date(s.createdAt).toISOString().split('T')[0]
        initKey(adIso)
        map[adIso].salesCount += 1
        map[adIso].salesTotal += s.total || 0
      }

      for (const inv of invRes) {
        const adIso = new Date(inv.createdAt).toISOString().split('T')[0]
        initKey(adIso)
        map[adIso].invoicesCount += 1
      }

      for (const e of expRes) {
        const adIso = new Date(e.createdAt).toISOString().split('T')[0]
        initKey(adIso)
        map[adIso].expensesCount += 1
        map[adIso].expensesTotal += e.amount || 0
      }

      setEventsMap(map)
    } catch (err) {
      console.error('Error fetching calendar events:', err)
    }
  }, [activeBusiness?.$id])

  useEffect(() => {
    fetchMonthEvents()
  }, [fetchMonthEvents, viewBSYear, viewBSMonth])

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewBSMonth === 1) {
      setViewBSMonth(12)
      setViewBSYear((y) => y - 1)
    } else {
      setViewBSMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewBSMonth === 12) {
      setViewBSMonth(1)
      setViewBSYear((y) => y + 1)
    } else {
      setViewBSMonth((m) => m + 1)
    }
  }

  const handleToday = () => {
    setViewBSYear(currentBS.year)
    setViewBSMonth(currentBS.month)
    setSelectedBSDay(currentBS.day)
  }

  // Derived Grid for rendering
  const grid = calendarService.getBSMonthCalendarGrid(viewBSYear, viewBSMonth)

  // Details for selected BS day
  const selectedADDate = calendarService.bsToAd(viewBSYear, viewBSMonth, selectedBSDay)
  const selectedADIso = selectedADDate.toISOString().split('T')[0]

  const formattedSelectedBS = calendarService.formatBSDate(
    { year: viewBSYear, month: viewBSMonth, day: selectedBSDay },
    { language: 'en' }
  )
  const formattedSelectedAD = calendarService.formatADDate(selectedADDate)
  const financialYearInfo = calendarService.getFinancialYear(selectedADDate)

  const selectedDaySummary: DayEventSummary = eventsMap[selectedADIso] || {
    salesCount: 0,
    salesTotal: 0,
    invoicesCount: 0,
    paymentsCount: 0,
    paymentsTotal: 0,
    expensesCount: 0,
    expensesTotal: 0,
  }

  return (
    <div className="space-y-6 text-slate-900">
      <PageHeader
        title="Nepal Dual Calendar (BS / AD)"
        description="Bikram Sambat (BS) primary business calendar with real-time sales, invoices, and expense tracking."
      />

      {/* Top Controls & Month Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrevMonth}
            variant="outline"
            size="sm"
            className="h-10 px-3 font-bold border-slate-300 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous Month
          </Button>
          <Button
            onClick={handleNextMonth}
            variant="outline"
            size="sm"
            className="h-10 px-3 font-bold border-slate-300 hover:bg-slate-50"
          >
            Next Month <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="text-center font-mono">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {viewBSYear} {BS_MONTH_NAMES_EN[viewBSMonth - 1]} B.S.
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            FY {financialYearInfo.label}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={handleToday}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-4 shadow-xs"
          >
            <Sparkles className="h-4 w-4 mr-1.5" /> Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ==================== MONTHLY CALENDAR GRID ==================== */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs">
          {/* Day Headers (Sun - Sat) */}
          <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-xs text-slate-500 uppercase pb-3 border-b border-slate-100">
            {BS_DAYS_EN.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-3">
            {grid.days.map((cell, idx) => {
              const isCurrentDay =
                cell.isCurrentMonth &&
                viewBSYear === currentBS.year &&
                viewBSMonth === currentBS.month &&
                cell.bsDay === currentBS.day

              const isSelected = cell.isCurrentMonth && cell.bsDay === selectedBSDay

              const adIsoKey = cell.fullADDate.toISOString().split('T')[0]
              const dayEv = eventsMap[adIsoKey]

              const hasSales = dayEv && dayEv.salesCount > 0
              const hasPayments = dayEv && dayEv.paymentsCount > 0
              const hasExpenses = dayEv && dayEv.expensesCount > 0

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!cell.isCurrentMonth}
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setSelectedBSDay(cell.bsDay)
                    }
                  }}
                  className={`min-h-[72px] sm:min-h-[88px] p-2 rounded-xl text-left flex flex-col justify-between transition-all border ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                      : isCurrentDay
                      ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/60'
                  }`}
                >
                  {/* BS Day & AD Day Header */}
                  <div className="flex items-start justify-between w-full">
                    {/* BS Day Number (DOMINANT / PRIMARY) */}
                    <span
                      className={`font-black text-base sm:text-lg font-mono ${
                        isSelected
                          ? 'text-indigo-900'
                          : isCurrentDay
                          ? 'text-amber-900'
                          : cell.isCurrentMonth
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.bsDay}
                    </span>

                    {/* AD Day Number (SUBORDINATE / SECONDARY) */}
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {cell.adDay} AD
                    </span>
                  </div>

                  {/* Business Activity Event Badges */}
                  {cell.isCurrentMonth && (hasSales || hasPayments || hasExpenses) && (
                    <div className="space-y-0.5 mt-1">
                      {hasSales && (
                        <div className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center justify-between">
                          <span>{dayEv.salesCount} Sales</span>
                        </div>
                      )}
                      {hasPayments && (
                        <div className="text-[9px] font-extrabold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded flex items-center justify-between">
                          <span>{dayEv.paymentsCount} Pay</span>
                        </div>
                      )}
                      {hasExpenses && (
                        <div className="text-[9px] font-extrabold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded flex items-center justify-between">
                          <span>{dayEv.expensesCount} Exp</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ==================== DATE DETAILS PANEL ==================== */}
        <div className="space-y-6">
          <Card className="border-slate-200 bg-white shadow-sm p-6 space-y-5">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 mb-1">
                Selected Date Details
              </div>
              <h3 className="text-xl font-black text-slate-900 font-mono">{formattedSelectedBS}</h3>
              <p className="text-sm font-semibold text-slate-500 mt-0.5">{formattedSelectedAD} (A.D.)</p>
              <div className="inline-block mt-2 bg-slate-100 text-slate-700 px-3 py-1 rounded text-xs font-bold border border-slate-200">
                Financial Year: {financialYearInfo.label}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">
                Business Activity Summary
              </h4>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Sales */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Sales Transactions</div>
                      <div className="text-[11px] text-slate-500">{selectedDaySummary.salesCount} completed sales</div>
                    </div>
                  </div>
                  <div className="font-mono font-extrabold text-emerald-700 text-sm">
                    {formatNPR(selectedDaySummary.salesTotal)}
                  </div>
                </div>

                {/* Invoices */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Tax Invoices</div>
                      <div className="text-[11px] text-slate-500">{selectedDaySummary.invoicesCount} tax bills issued</div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-xs">
                    {selectedDaySummary.invoicesCount} Bills
                  </div>
                </div>

                {/* Payments */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Customer Payments</div>
                      <div className="text-[11px] text-slate-500">{selectedDaySummary.paymentsCount} payments received</div>
                    </div>
                  </div>
                  <div className="font-mono font-extrabold text-blue-700 text-sm">
                    {formatNPR(selectedDaySummary.paymentsTotal)}
                  </div>
                </div>

                {/* Expenses */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                      <ReceiptText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Business Expenses</div>
                      <div className="text-[11px] text-slate-500">{selectedDaySummary.expensesCount} expense items</div>
                    </div>
                  </div>
                  <div className="font-mono font-extrabold text-rose-700 text-sm">
                    {formatNPR(selectedDaySummary.expensesTotal)}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
              <Link href="/app/sales/new">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 text-xs">
                  Create New POS Sale <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
