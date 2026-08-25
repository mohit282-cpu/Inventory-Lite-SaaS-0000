'use client'

import { useState, useEffect, useRef } from 'react'
import { calendarService } from '@/services/calendar.service'
import { BS_MONTH_NAMES_EN, BSDate } from '@/lib/nepali-calendar-data'
import { adToBS, bsToAD, formatBSDate } from '@/lib/date/bs-date'
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export interface BsDatePickerProps {
  value?: string | Date | null
  onChange?: (isoDate: string, bsDateString: string) => void
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function BsDatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select BS Date',
  className = '',
  disabled = false,
}: BsDatePickerProps) {
  const [bs, setBs] = useState<BSDate>(() => adToBS(value || new Date()))
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      setBs(adToBS(value))
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const years = Array.from({ length: 21 }, (_, i) => 2075 + i) // 2075 to 2095 BS
  const daysInMonth = calendarService.getBSMonthDays(bs.year, bs.month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const handleYearChange = (newYearStr: string) => {
    const newYear = parseInt(newYearStr, 10)
    const maxDays = calendarService.getBSMonthDays(newYear, bs.month)
    const newDay = Math.min(bs.day, maxDays)
    const updated = { year: newYear, month: bs.month, day: newDay }
    setBs(updated)
    emitChange(updated)
  }

  const handleMonthChange = (newMonthStr: string) => {
    const newMonth = parseInt(newMonthStr, 10)
    const maxDays = calendarService.getBSMonthDays(bs.year, newMonth)
    const newDay = Math.min(bs.day, maxDays)
    const updated = { year: bs.year, month: newMonth, day: newDay }
    setBs(updated)
    emitChange(updated)
  }

  const handleDayChange = (newDay: number) => {
    const updated = { ...bs, day: newDay }
    setBs(updated)
    emitChange(updated)
    setIsOpen(false)
  }

  const emitChange = (updatedBS: BSDate) => {
    if (!onChange) return
    const adDate = bsToAD(updatedBS.year, updatedBS.month, updatedBS.day)
    const isoDate = adDate.toISOString()
    const mm = String(updatedBS.month).padStart(2, '0')
    const dd = String(updatedBS.day).padStart(2, '0')
    const bsStr = `${updatedBS.year}/${mm}/${dd}`
    onChange(isoDate, bsStr)
  }

  const formattedDisplay = value ? formatBSDate(value, { format: 'YYYY/MM/DD' }) : placeholder

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-left font-normal h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      >
        <div className="flex items-center">
          <CalendarIcon className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{formattedDisplay}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 p-4 border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 rounded-xl left-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Bikram Sambat (B.S.)
              </span>
              <span className="text-xs text-slate-500">
                {formatBSDate(bsToAD(bs.year, bs.month, bs.day), { includeAD: true })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Year Select */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-semibold">BS Year</label>
                <Select value={String(bs.year)} onValueChange={handleYearChange}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue>{bs.year}</SelectValue>
                  </SelectTrigger>
                  <SelectContent max-height="200px">
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Select */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-semibold">BS Month</label>
                <Select value={String(bs.month)} onValueChange={handleMonthChange}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue>{BS_MONTH_NAMES_EN[bs.month - 1]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {BS_MONTH_NAMES_EN.map((m, idx) => (
                      <SelectItem key={idx} value={String(idx + 1)} className="text-xs">
                        {m} ({idx + 1})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Days Grid */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">BS Day</label>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDayChange(d)}
                    className={`h-8 w-8 text-xs rounded-md transition-colors font-medium flex items-center justify-center ${
                      d === bs.day
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
