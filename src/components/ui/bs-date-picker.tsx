"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { calendarService } from '@/services/calendar.service'
import { BS_DAYS_EN, BS_MONTH_NAMES_EN } from '@/lib/nepali-calendar-data'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface BSDatePickerProps {
  value?: string | Date
  onChange: (formattedAD: string, bsDateString: string, dateObj: Date) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function BSDatePicker({
  value,
  onChange,
  label,
  disabled = false,
  className = '',
}: BSDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'BS' | 'AD'>('BS')
  const popoverRef = useRef<HTMLDivElement>(null)

  // Current selected date object
  const validSelectedAD = useMemo(() => {
    const d = value ? (typeof value === 'object' ? value : new Date(value)) : new Date()
    return isNaN(d.getTime()) ? new Date() : d
  }, [value])

  const selectedBS = useMemo(() => {
    return calendarService.adToBs(validSelectedAD)
  }, [validSelectedAD])

  // Calendar View state (Year & Month currently viewed)
  const [viewBSYear, setViewBSYear] = useState(selectedBS.year)
  const [viewBSMonth, setViewBSMonth] = useState(selectedBS.month)

  const [viewADYear, setViewADYear] = useState(validSelectedAD.getFullYear())
  const [viewADMonth, setViewADMonth] = useState(validSelectedAD.getMonth()) // 0-indexed

  useEffect(() => {
    const bs = calendarService.adToBs(validSelectedAD)
    setViewBSYear(bs.year)
    setViewBSMonth(bs.month)
    setViewADYear(validSelectedAD.getFullYear())
    setViewADMonth(validSelectedAD.getMonth())
  }, [validSelectedAD])

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Select a day in BS mode
  const handleSelectBSDay = (bsDay: number) => {
    const adDate = calendarService.bsToAd(viewBSYear, viewBSMonth, bsDay)
    const adIso = adDate.toISOString().split('T')[0]
    const bsStr = `${viewBSYear}-${String(viewBSMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`
    onChange(adIso, bsStr, adDate)
    setIsOpen(false)
  }

  // Select a day in AD mode
  const handleSelectADDay = (adDay: number) => {
    const adDate = new Date(viewADYear, viewADMonth, adDay)
    const adIso = adDate.toISOString().split('T')[0]
    const bs = calendarService.adToBs(adDate)
    const bsStr = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`
    onChange(adIso, bsStr, adDate)
    setIsOpen(false)
  }

  // BS Month navigation
  const prevBSMonth = () => {
    if (viewBSMonth === 1) {
      setViewBSMonth(12)
      setViewBSYear((y) => y - 1)
    } else {
      setViewBSMonth((m) => m - 1)
    }
  }

  const nextBSMonth = () => {
    if (viewBSMonth === 12) {
      setViewBSMonth(1)
      setViewBSYear((y) => y + 1)
    } else {
      setViewBSMonth((m) => m + 1)
    }
  }

  // AD Month navigation
  const prevADMonth = () => {
    if (viewADMonth === 0) {
      setViewADMonth(11)
      setViewADYear((y) => y - 1)
    } else {
      setViewADMonth((m) => m - 1)
    }
  }

  const nextADMonth = () => {
    if (viewADMonth === 11) {
      setViewADMonth(0)
      setViewADYear((y) => y + 1)
    } else {
      setViewADMonth((m) => m + 1)
    }
  }

  // Jump to Today
  const jumpToToday = () => {
    const today = new Date()
    const bs = calendarService.adToBs(today)
    const adIso = today.toISOString().split('T')[0]
    const bsStr = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`
    onChange(adIso, bsStr, today)
    setViewBSYear(bs.year)
    setViewBSMonth(bs.month)
    setViewADYear(today.getFullYear())
    setViewADMonth(today.getMonth())
    setIsOpen(false)
  }

  const gridData = calendarService.getBSMonthCalendarGrid(viewBSYear, viewBSMonth)

  const formattedValueBS = calendarService.formatBSDate(validSelectedAD)
  const formattedValueAD = calendarService.formatADDate(validSelectedAD)

  return (
    <div className={`relative inline-block w-full ${className}`} ref={popoverRef}>
      {label && <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 shadow-xs hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 text-left min-h-[42px]"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="h-4 w-4 text-indigo-600 shrink-0" />
          <span className="font-bold text-slate-900 truncate">{formattedValueBS}</span>
          <span className="text-slate-500 text-[11px] truncate">({formattedValueAD})</span>
        </div>
        <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 uppercase ml-2 shrink-0">
          BS
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 sm:left-auto sm:right-0 w-[310px] bg-white rounded-xl shadow-xl border border-slate-200 p-3 space-y-3 animate-in fade-in-50 zoom-in-95">
          {/* Calendar Mode Switcher & Today */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setMode('BS')}
                className={`px-3 py-1 rounded-md transition-all ${
                  mode === 'BS' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                BS
              </button>
              <button
                type="button"
                onClick={() => setMode('AD')}
                className={`px-3 py-1 rounded-md transition-all ${
                  mode === 'AD' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                AD
              </button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={jumpToToday}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold h-7 px-2"
            >
              Today
            </Button>
          </div>

          {/* BS Calendar Grid View */}
          {mode === 'BS' ? (
            <div>
              {/* Header Navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={prevBSMonth}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="font-extrabold text-sm text-slate-900 font-mono">
                  {viewBSYear} {BS_MONTH_NAMES_EN[viewBSMonth - 1]}
                </div>
                <button
                  type="button"
                  onClick={nextBSMonth}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-500 uppercase mb-1">
                {BS_DAYS_EN.map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {gridData.days.map((cell, idx) => {
                  const isSelected =
                    cell.isCurrentMonth &&
                    viewBSYear === selectedBS.year &&
                    viewBSMonth === selectedBS.month &&
                    cell.bsDay === selectedBS.day

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!cell.isCurrentMonth}
                      onClick={() => cell.isCurrentMonth && handleSelectBSDay(cell.bsDay)}
                      className={`h-9 w-full rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all ${
                        !cell.isCurrentMonth
                          ? 'text-slate-300 opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600'
                          : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cell.bsDay}</span>
                      <span className={`text-[8px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {cell.adDay}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* AD Calendar Grid View */
            <div>
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={prevADMonth}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="font-extrabold text-sm text-slate-900 font-mono">
                  {new Date(viewADYear, viewADMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  type="button"
                  onClick={nextADMonth}
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-500 uppercase mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const daysInADMonth = new Date(viewADYear, viewADMonth + 1, 0).getDate()
                  const firstDay = new Date(viewADYear, viewADMonth, 1).getDay()
                  const cells = []

                  for (let i = 0; i < firstDay; i++) {
                    cells.push(<div key={`empty-${i}`} className="h-9" />)
                  }

                  for (let d = 1; d <= daysInADMonth; d++) {
                    const isSelected =
                      viewADYear === validSelectedAD.getFullYear() &&
                      viewADMonth === validSelectedAD.getMonth() &&
                      d === validSelectedAD.getDate()

                    cells.push(
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSelectADDay(d)}
                        className={`h-9 w-full rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600'
                            : 'text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  }
                  return cells
                })()}
              </div>
            </div>
          )}

          {/* Selected Date Summary Footer */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] space-y-0.5">
            <div className="flex justify-between font-bold text-slate-900">
              <span>BS:</span>
              <span className="text-indigo-700">{formattedValueBS}</span>
            </div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>AD:</span>
              <span>{formattedValueAD}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
