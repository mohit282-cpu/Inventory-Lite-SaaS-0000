"use client"

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getCurrentFinancialYear, FinancialYearInfo } from '@/lib/financial-year'
import { calendarService } from '@/services/calendar.service'

interface FinancialYearSelectorProps {
  onYearChange: (range: { isoFrom: string; isoTo: string; label: string }) => void
}

export function FinancialYearSelector({ onYearChange }: FinancialYearSelectorProps) {
  const [years, setYears] = useState<FinancialYearInfo[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('')

  useEffect(() => {
    // Generate last 5 financial years
    const currentFY = getCurrentFinancialYear()
    const generatedYears: FinancialYearInfo[] = []
    
    for (let i = 0; i < 5; i++) {
      generatedYears.push({
        bsStartYear: currentFY.bsStartYear - i,
        bsEndYear: currentFY.bsEndYear - i,
        label: `${currentFY.bsStartYear - i}/${currentFY.bsEndYear - i}`,
        shortLabel: `${(currentFY.bsStartYear - i) % 100}/${(currentFY.bsEndYear - i) % 100}`
      })
    }
    
    setYears(generatedYears)
    setSelectedYear(generatedYears[0].bsStartYear.toString())
    
    // Trigger initial load
    handleYearChange(generatedYears[0].bsStartYear.toString())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleYearChange = (startYearStr: string) => {
    setSelectedYear(startYearStr)
    const bsStartYear = parseInt(startYearStr, 10)
    const range = calendarService.getFinancialYearDateRange(bsStartYear)
    onYearChange({
      ...range,
      label: `${bsStartYear}/${bsStartYear + 1}`
    })
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium">Financial Year:</span>
      <Select value={selectedYear} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Select Year" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year.bsStartYear} value={year.bsStartYear.toString()}>
              {year.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
