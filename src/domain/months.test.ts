import { describe, expect, it } from 'vitest'
import { addMonth, currentMonth, enumerateMonths } from './months'

describe('addMonth', () => {
  it('crosses a year boundary going forward', () => {
    expect(addMonth('2025-11', 2)).toBe('2026-01')
  })

  it('crosses a year boundary going backward', () => {
    expect(addMonth('2026-01', -2)).toBe('2025-11')
  })

  it('handles a multi-year jump in one call', () => {
    expect(addMonth('2024-06', 30)).toBe('2026-12')
  })
})

describe('enumerateMonths', () => {
  it('is inclusive of both endpoints', () => {
    expect(enumerateMonths('2026-01', '2026-03')).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('returns one month when the ends are equal', () => {
    expect(enumerateMonths('2026-05', '2026-05')).toEqual(['2026-05'])
  })

  it('is empty when the end precedes the start', () => {
    expect(enumerateMonths('2026-05', '2026-01')).toEqual([])
  })
})

describe('currentMonth', () => {
  it('derives the month from Intl for a fixed instant in a given zone', () => {
    // 2026-01-31T23:30:00Z: still January in UTC.
    const now = new Date('2026-01-31T23:30:00Z')
    expect(currentMonth('UTC', now)).toBe('2026-01')
  })

  it('agrees with a zone that has already rolled over to the next month at the same instant', () => {
    // The same instant is already 2026-02-01 in a zone far enough east.
    const now = new Date('2026-01-31T23:30:00Z')
    expect(currentMonth('Pacific/Auckland', now)).toBe('2026-02')
  })
})
