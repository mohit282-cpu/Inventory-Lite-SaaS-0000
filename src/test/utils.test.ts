import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate, truncate } from '@/lib/utils'


describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})

describe('formatCurrency', () => {
  it('formats currency correctly', () => {
    expect(formatCurrency(1000, 'NPR')).toContain('रु.')
  })

  it('handles zero values', () => {
    expect(formatCurrency(0, 'NPR')).toContain('रु.')
  })
})

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = new Date('2024-01-15')
    expect(formatDate(date)).toBe('15/01/2024')
  })

  it('handles string dates', () => {
    expect(formatDate('2024-01-15')).toBe('15/01/2024')
  })
})

describe('truncate', () => {
  it('truncates long text', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })

  it('returns short text unchanged', () => {
    expect(truncate('Hi', 10)).toBe('Hi')
  })
})
