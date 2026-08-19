"use client"

import React, { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  placeholder?: string
  value?: string
  onChange?: (val: string) => void
  onDebouncedChange?: (val: string) => void
  debounceMs?: number
  className?: string
}

export function SearchInput({
  placeholder = 'Search...',
  value: externalValue,
  onChange,
  onDebouncedChange,
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(externalValue || '')

  useEffect(() => {
    if (externalValue !== undefined) {
      setInternalValue(externalValue)
    }
  }, [externalValue])

  useEffect(() => {
    if (!onDebouncedChange) return
    const timer = setTimeout(() => {
      onDebouncedChange(internalValue)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [internalValue, onDebouncedChange, debounceMs])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInternalValue(val)
    if (onChange) onChange(val)
  }

  const handleClear = () => {
    setInternalValue('')
    if (onChange) onChange('')
    if (onDebouncedChange) onDebouncedChange('')
  }

  return (
    <div className={cn('relative w-full max-w-sm', className)}>
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={handleChange}
        className="pl-9 pr-8 bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500"
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
